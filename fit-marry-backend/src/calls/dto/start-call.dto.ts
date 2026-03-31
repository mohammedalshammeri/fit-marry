import { IsNotEmpty, IsString } from "class-validator";

export class StartCallDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;
}
