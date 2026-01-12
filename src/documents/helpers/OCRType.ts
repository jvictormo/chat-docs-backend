const { PDFParse } = require('pdf-parse');
import { fromBuffer } from "pdf2pic";
import { createWorker } from "tesseract.js";
import { toArrayBuffer } from "./pdfBufferConverter";

export async function ocrImageBuffer(buffer: Buffer, lang = "por") {
    const worker = await createWorker(lang);
    try {
        const { data } = await worker.recognize(buffer);
        return data.text ?? "";
    } finally {
        await worker.terminate();
    }
}

export async function ocrPdfBuffer(pdfBuffer: Buffer, lang = "por") {
    // 1. Obter metadados para saber o número de páginas
    const parsed = await new PDFParse({ data: pdfBuffer })
    const meta = await parsed.getInfo({ parsePageInfo: true });
    const numPages = meta.total || 1;

    // 2. Configurar o conversor pdf2pic
    const options = {
        density: 200,
        saveFilename: "unnamed",
        savePath: "./", // Caminho exigido, mesmo que não salve em disco
        format: "png",
        width: 2000,
        height: 2000
    };

    const convert = fromBuffer(pdfBuffer, options);
    const worker = await createWorker(lang);

    try {
        let fullText = "";

        for (let page = 1; page <= numPages; page++) {
            // No pdf2pic v3+, o método retorna uma Promise com dados da imagem
            // O parâmetro -1 indica que queremos converter a página específica
            const result = await convert(page, { responseType: "base64" });

            if (result.base64) {
                const imgBuffer = Buffer.from(result.base64, "base64");
                const { data } = await worker.recognize(imgBuffer);
                fullText += `\n\n--- Página ${page} ---\n` + (data.text ?? "");
            }
        }

        return fullText.trim();
    } catch (error) {
        console.error("Erro no processamento:", error);
        throw error;
    } finally {
        await worker.terminate();
    }
}