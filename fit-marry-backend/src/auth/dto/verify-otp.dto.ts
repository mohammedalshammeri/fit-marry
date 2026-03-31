import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { $Enums } from "@prisma/client";

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @IsEnum($Enums.OTPChannel)
  channel!: $Enums.OTPChannel;

  @IsEnum($Enums.OTPPurpose)
  purpose!: $Enums.OTPPurpose;

  @IsString()
  @IsNotEmpty()
  code!: string;
}
