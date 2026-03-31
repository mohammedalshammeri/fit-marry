import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsOptional()
  twoFaToken?: string;
}
