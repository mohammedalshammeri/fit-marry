import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MessagesService } from "./messages.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { ListMessagesDto } from "./dto/list-messages.dto";
import { UploadTempImageDto } from "./dto/upload-temp-image.dto";

@ApiTags("messages")
@Controller("messages")
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get(":conversationId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listMessages(
    @CurrentUser() user: { userId: string },
    @Param("conversationId") conversationId: string,
    @Query() query: ListMessagesDto
  ) {
    return this.messagesService.listMessages(user.userId, conversationId, query);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  sendMessage(@CurrentUser() user: { userId: string }, @Body() dto: SendMessageDto) {
    return this.messagesService.sendMessage(user.userId, dto);
  }

  @Post("media")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  uploadTempImage(
    @CurrentUser() user: { userId: string },
    @Body() dto: UploadTempImageDto
  ) {
    return this.messagesService.uploadTempImage(user.userId, dto);
  }

  @Post("audio")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  uploadTempAudio(
    @CurrentUser() user: { userId: string },
    @Body() dto: UploadTempImageDto
  ) {
    return this.messagesService.uploadTempAudio(user.userId, dto);
  }

  @Post(":messageId/view")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markViewed(@CurrentUser() user: { userId: string }, @Param("messageId") messageId: string) {
    return this.messagesService.markViewed(user.userId, messageId);
  }

  @Delete(":messageId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deleteMessage(@CurrentUser() user: { userId: string }, @Param("messageId") messageId: string) {
    return this.messagesService.deleteMessage(user.userId, messageId);
  }

  @Get(":conversationId/search")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  searchMessages(
    @CurrentUser() user: { userId: string },
    @Param("conversationId") conversationId: string,
    @Query("q") query: string,
    @Query("limit") limit?: string,
  ) {
    return this.messagesService.searchMessages(
      user.userId,
      conversationId,
      query,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(":messageId/media")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async getTempMedia(
    @CurrentUser() user: { userId: string },
    @Param("messageId") messageId: string
  ) {
    const media = await this.messagesService.getTempMedia(user.userId, messageId);
    return {
      contentType: media.contentType,
      expiresAt: media.expiresAt,
      base64: media.data.toString("base64"),
    };
  }
}
