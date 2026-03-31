import { IsNotEmpty, IsObject, IsString } from "class-validator";

export class UpdateSettingsDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsObject()
  value!: Record<string, unknown>;
}
