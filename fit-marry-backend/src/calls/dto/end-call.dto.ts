import { IsNotEmpty, IsString } from "class-validator";

export class EndCallDto {
  @IsString()
  @IsNotEmpty()
  callSessionId!: string;
}
