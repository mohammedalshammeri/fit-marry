import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { $Enums } from "@prisma/client";

export class ResendOtpDto {
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @IsEnum($Enums.OTPChannel)
  channel!: $Enums.OTPChannel;

  @IsEnum($Enums.OTPPurpose)
  purpose!: $Enums.OTPPurpose;
}
