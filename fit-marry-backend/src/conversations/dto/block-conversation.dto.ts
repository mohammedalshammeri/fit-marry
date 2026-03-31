import { IsNotEmpty, IsString } from "class-validator";

export class BlockConversationDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;
}
