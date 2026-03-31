import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateComplaintDto {
  @IsString()
  @IsNotEmpty()
  reportedUserId!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsString()
  @IsNotEmpty()
  category!: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
