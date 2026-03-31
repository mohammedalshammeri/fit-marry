import { IsNotEmpty, IsString } from "class-validator";

export class UploadAvatarDto {
  @IsString()
  @IsNotEmpty()
  base64!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;
}
