import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class InitMediaUploadDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @IsOptional()
  @IsString()
  resourceType?: string;
}
