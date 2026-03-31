import { IsArray, IsEnum, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateAdminDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsEnum(["ACTIVE", "DISABLED"])
  status?: "ACTIVE" | "DISABLED";

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
