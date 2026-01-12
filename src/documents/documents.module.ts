import { Module } from "@nestjs/common";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { PrismaService } from "../prisma.service";
import { HuggingFaceService } from "../huggingface/huggingface.service";

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, PrismaService, HuggingFaceService],
})
export class DocumentsModule {}