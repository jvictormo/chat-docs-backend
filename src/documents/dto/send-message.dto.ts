import { IsString, MaxLength } from "class-validator";

export class SendMessageDto {
  @IsString()
  @MaxLength(6000)
  content: string;
}