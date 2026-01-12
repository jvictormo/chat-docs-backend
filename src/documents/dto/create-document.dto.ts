import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateDocumentDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  originalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  mimeType?: string;
}