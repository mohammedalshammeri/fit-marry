import { IsNotEmpty, IsString } from "class-validator";

export class UploadTempImageDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @IsString()
  @IsNotEmpty()
  base64!: string;

  @IsString()
  @IsNotEmpty()
  contentType!: string;
}
