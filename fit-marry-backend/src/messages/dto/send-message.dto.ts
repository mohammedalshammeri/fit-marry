import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, IsInt } from "class-validator";

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @IsIn(["TEXT", "IMAGE", "VOICE"])
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  text?: string;

  @IsOptional()
  @IsString()
  tempMediaId?: string;

  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  mediaResourceType?: string;

  @IsOptional()
  @IsInt()
  mediaBytes?: number;
}
