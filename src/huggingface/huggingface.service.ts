import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InferenceClient } from "@huggingface/inference";

@Injectable()
export class HuggingFaceService {
  private hf: InferenceClient;

  constructor() {
    const token = process.env.HF_TOKEN;
    if (!token) throw new Error("HF_TOKEN not set");
    this.hf = new InferenceClient(token);
  }

  async chatWithDocument(args: {
    question: string;
    documentTitle: string;
    context: string;
    history?: { role: "user" | "assistant"; content: string }[];
  }) {
    const { question, documentTitle, context, history = [] } = args;

    const messages = [
      {
        role: "system" as const,
        content: `You are a document-based assistant.
        Rules:
        - Answer ONLY using the information provided in the document context.
        - If the answer is not in the context, explicitly state that the information was not found.
        - Do NOT use external knowledge or make assumptions.
        - Be concise and objective.
        - Always answer in the same language as the user.
        `.trim(),
      },
      ...history, // O histórico vem no meio para manter a linha do tempo
      {
        role: "user" as const,
        content: `Context:\n${context}\n\nQuestion: ${question}`,
      },
    ];

    try {
      const resp = await this.hf.chatCompletion({
        model: "meta-llama/Llama-3.2-3B-Instruct", // Dica: Modelos menores (3B) são mais rápidos na API gratuita
        messages,
        max_tokens: 500,
        temperature: 0.1, // Menor temperatura = menos "invenção" da IA
      });

      return resp.choices?.[0]?.message?.content?.trim() ?? "No answer.";
    } catch (error) {
      console.error("[HF Error]:", error);
      // Se o erro for de carregamento do modelo, você pode avisar o usuário
      throw new InternalServerErrorException("O modelo está sendo carregado ou atingiu o limite. Tente novamente em instantes.");
    }
  }
}