import { IsArray, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { $Enums } from "@prisma/client";

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum($Enums.RoleType)
  type!: $Enums.RoleType;

  @IsArray()
  @IsString({ each: true })
  permissionIds!: string[];
}
