import { IsNotEmpty, IsString } from "class-validator";

export class InviteReferralDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}
