import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";
import { $Enums } from "@prisma/client";

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum($Enums.RoleType)
  type?: $Enums.RoleType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionIds?: string[];
}
