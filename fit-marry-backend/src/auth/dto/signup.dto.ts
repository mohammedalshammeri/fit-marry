import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { $Enums } from "@prisma/client";

export class SignupDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(10)
  deviceId!: string;

  @IsEnum($Enums.MarriageType)
  marriageType!: $Enums.MarriageType;

  @IsBoolean()
  ageConfirmed!: boolean;
}
