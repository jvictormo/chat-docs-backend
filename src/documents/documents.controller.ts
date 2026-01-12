import {
    BadRequestException,
    Controller,
    Get,
    Patch,
    Delete,
    Param,
    Post,
    Req,
    UploadedFile,
    UseGuards,
    UseInterceptors,
    Body,
    Res,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiBody, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "../auth/jwt.guard";
import { DocumentsService } from "./documents.service";
import { CreateDocumentDto } from "./dto/create-document.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import type { Response } from "express";
import { UpdateDocumentTitleDto } from "./dto/update-document.dto";

const allowed = new Set([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/tiff",
]);

@ApiTags("documents")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("documents")
export class DocumentsController {
    constructor(private readonly documents: DocumentsService) { }

    @Get()
    listMine(@Req() req: any) {
        return this.documents.listMyDocuments(req.user.email);
    }

    @Get(":id")
    getOne(@Req() req: any, @Param("id") id: string) {
        return this.documents.getDocumentById(req.user.email, id);
    }

    @Post("upload")
    @ApiConsumes("multipart/form-data")
    @ApiBody({
        schema: {
            type: "object",
            properties: {
                title: { type: "string" },
                file: { type: "string", format: "binary" },
            },
            required: ["title", "file"],
        },
    })
    @UseInterceptors(FileInterceptor("file", {
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (req, file, cb) => {
            if (!allowed.has(file.mimetype)) {
                return cb(new BadRequestException("Unsupported file type"), false);
            }
            cb(null, true);
        },
    }))
    upload(
        @Req() req: any,
        @Body() dto: CreateDocumentDto,
        @UploadedFile() file: Express.Multer.File
    ) {
        return this.documents.uploadDocument(req.user.email, dto, file);
    }

    @Get(":id/download")
    async download(@Req() req: any, @Param("id") id: string, @Res() res: Response) {
        const fileRecord = await this.documents.getRawFile(req.user.email, id);

        res.setHeader("Content-Type", fileRecord.mimeType);

        const encodedName = encodeURIComponent(fileRecord.fileName);
        res.setHeader("Content-Disposition", `attachment; filename="${encodedName}"`);

        return res.send(Buffer.from(fileRecord.buffer));
    }

    // Chat: listar mensagens
    @Get(":id/messages")
    getMessages(@Req() req: any, @Param("id") id: string) {
        return this.documents.getChatMessages(req.user.email, id);
    }

    // Chat: enviar mensagem
    @Post(":id/messages")
    sendMessage(@Req() req: any, @Param("id") id: string, @Body() dto: SendMessageDto) {
        return this.documents.sendChatMessage(req.user.email, id, dto);
    }

    @Patch(":id")
    updateTitle(
        @Req() req: any,
        @Param("id") id: string,
        @Body() dto: UpdateDocumentTitleDto
    ) {
        return this.documents.updateDocumentTitle(req.user.email, id, dto.title);
    }

    @Delete(":id")
    remove(@Req() req: any, @Param("id") id: string) {
        return this.documents.deleteDocument(req.user.email, id);
    }
}