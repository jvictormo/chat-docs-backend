import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { isImage, isPdf, normalizeText } from "./helpers/documentCheck";
import { ocrImageBuffer, ocrPdfBuffer } from "./helpers/OCRType";
const { PDFParse } = require('pdf-parse');
import { CreateDocumentDto } from "./dto/create-document.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { ChatRole } from "@prisma/client";
import { toArrayBuffer } from "./helpers/pdfBufferConverter";
import { pickRelevantChunks } from "./helpers/chunkExtractors";
import { HuggingFaceService } from "../huggingface/huggingface.service";

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService, private hfService: HuggingFaceService,) { }

  private async getUserIdByEmail(email: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("User not found");
    return user.id;
  }

  private async assertDocOwner(documentId: string, userId: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, userId: true },
    });
    if (!doc) throw new NotFoundException("Document not found");
    if (doc.userId !== userId) throw new ForbiddenException("Not your document");
    return doc;
  }

  async listMyDocuments(email: string) {
    const userId = await this.getUserIdByEmail(email);

    return this.prisma.document.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        originalName: true,
        extractedText: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
        summary: true,
        errorMessage: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getDocumentById(email: string, documentId: string) {
    const userId = await this.getUserIdByEmail(email);
    await this.assertDocOwner(documentId, userId);

    return this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        title: true,
        originalName: true,
        mimeType: true,
        extractedText: true,
        summary: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async uploadDocument(email: string, dto: CreateDocumentDto, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("File is required");

    const userId = await this.getUserIdByEmail(email);

    // tamanho já checado; seu código ok

    const mime = dto.mimeType ?? file.mimetype;
    let extractedText = "";
    let errorMessage: string | null = null;

    try {
      if (isPdf(mime)) {
        // 1) tenta texto nativo
        const ab = toArrayBuffer(file.buffer);

        const parsed = await new PDFParse({ data: ab })
        const result = await parsed.getText();;
        const nativeText = normalizeText(result.text);

        // 2) se veio pouco texto, faz OCR
        if (nativeText.length >= 30) {
          extractedText = result.text;
        } else {
          extractedText = await ocrPdfBuffer(file.buffer, "por");
        }
      } else if (isImage(mime)) {
        extractedText = await ocrImageBuffer(file.buffer, "por");
      } else {
        throw new BadRequestException("Unsupported file type");
      }
    } catch (e: any) {
      errorMessage = e?.message ?? "Extraction failed";
      extractedText = "";
    }

    const created = await this.prisma.document.create({
      data: {
        userId,
        title: dto.title,
        originalName: dto.originalName ?? file.originalname,
        mimeType: mime,
        fileData: new Uint8Array(file.buffer),
        fileSize: file.size,
        extractedText,        // <-- salvar aqui
        errorMessage,         // <-- e aqui
      },
      select: {
        id: true,
        title: true,
        originalName: true,
        mimeType: true,
        createdAt: true,
        extractedText: true,
        errorMessage: true,
      },
    });

    return created;
  }

  async getRawFile(email: string, documentId: string) {
    const userId = await this.getUserIdByEmail(email);
    await this.assertDocOwner(documentId, userId);

    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        fileData: true,
        originalName: true,
        mimeType: true,
      },
    });

    if (!doc || !doc.fileData) {
      throw new NotFoundException("File content not found");
    }

    return {
      buffer: doc.fileData,
      fileName: doc.originalName || 'document',
      mimeType: doc.mimeType || 'application/octet-stream',
    };
  }

  async getChatMessages(email: string, documentId: string) {
    const userId = await this.getUserIdByEmail(email);
    await this.assertDocOwner(documentId, userId);

    return this.prisma.chatMessage.findMany({
      where: { documentId },
      select: { id: true, role: true, content: true, metadata: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
  }

  async sendChatMessage(email: string, documentId: string, dto: SendMessageDto) {
    const userId = await this.getUserIdByEmail(email);
    await this.assertDocOwner(documentId, userId);

    // Salva msg do usuário
    const userMsg = await this.prisma.chatMessage.create({
      data: {
        documentId,
        role: ChatRole.user,
        content: dto.content,
      },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    // Carrega texto do doc (contexto)
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { extractedText: true, summary: true, title: true },
    });

    // TODO: plugar IA aqui (HF / OpenAI / heurística)

    const extracted = doc?.extractedText ?? "";
    const summary = doc?.summary ?? "";
    const relevant = pickRelevantChunks(extracted, dto.content, 5);

    let context = (summary ? `Resumo:\n${summary}\n\n` : "") +
      relevant.map((t, i) => `Trecho ${i + 1}:\n${t}`).join("\n\n");

    context = context.slice(0, 12000);

    // (opcional) pegar histórico das últimas N mensagens do chat
    const lastMessages = await this.prisma.chatMessage.findMany({
      where: { documentId },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: { id: true, role: true, content: true },
    });

    const history = lastMessages
      .filter(m => m.id !== userMsg.id) // remove a msg atual
      .filter(m => m.role === ChatRole.user || m.role === ChatRole.assistant)
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

    // Por hora: resposta fake mas útil (não quebra seu front)
    const assistantContent = await this.hfService.chatWithDocument({
      question: dto.content,
      documentTitle: doc?.title ?? "Documento",
      context,
      history,
    });

    const assistantMsg = await this.prisma.chatMessage.create({
      data: {
        documentId,
        role: ChatRole.assistant,
        content: assistantContent,
        metadata: { provider: "huggingface", model: "mistralai/Mistral-7B-Instruct-v0.3" },
      },
      select: { id: true, role: true, content: true, createdAt: true, metadata: true },
    });

    return { userMsg, assistantMsg };
  }

  async updateDocumentTitle(email: string, documentId: string, title: string) {
    const userId = await this.getUserIdByEmail(email);
    await this.assertDocOwner(documentId, userId);

    const trimmed = title?.trim();
    if (!trimmed) throw new BadRequestException("Title is required");

    return this.prisma.document.update({
      where: { id: documentId },
      data: { title: trimmed },
      select: {
        id: true,
        title: true,
        originalName: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
        summary: true,
        errorMessage: true,
      },
    });
  }

  async deleteDocument(email: string, documentId: string) {
    const userId = await this.getUserIdByEmail(email);
    await this.assertDocOwner(documentId, userId);

    await this.prisma.chatMessage.deleteMany({
      where: { documentId },
    });

    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return { message: "Document deleted successfully" };
  }
}