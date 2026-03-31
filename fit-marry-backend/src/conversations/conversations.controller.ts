import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { ConversationsService } from "./conversations.service";
import { CompatibleMatchService } from "./compatible-match.service";
import { LeaveConversationDto } from "./dto/leave-conversation.dto";
import { BlockConversationDto } from "./dto/block-conversation.dto";

@ApiTags("conversations")
@Controller("conversations")
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly compatibleMatchService: CompatibleMatchService,
  ) {}

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getMyConversations(@CurrentUser() user: { userId: string }) {
    return this.conversationsService.getMyConversations(user.userId);
  }

  @Get(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getConversation(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.conversationsService.getConversation(user.userId, id);
  }

  @Post("leave")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  leaveConversation(
    @CurrentUser() user: { userId: string },
    @Body() dto: LeaveConversationDto
  ) {
    return this.conversationsService.leaveConversation(user.userId, dto);
  }

  @Post("block")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  blockConversation(
    @CurrentUser() user: { userId: string },
    @Body() dto: BlockConversationDto
  ) {
    return this.conversationsService.blockUser(user.userId, dto.conversationId);
  }

  @Get("blocked-users")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getBlockedUsers(@CurrentUser() user: { userId: string }) {
    return this.conversationsService.getBlockedUsers(user.userId);
  }

  @Delete("blocked-users/:userId")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  unblockUser(
    @CurrentUser() user: { userId: string },
    @Param("userId") blockedUserId: string
  ) {
    return this.conversationsService.unblockUser(user.userId, blockedUserId);
  }

  @Post("photo-access")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  grantPhotoAccess(
    @CurrentUser() user: { userId: string },
    @Body() dto: { conversationId: string }
  ) {
    return this.conversationsService.grantPhotoAccess(user.userId, dto.conversationId);
  }

  @Post("photo-access/revoke")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  revokePhotoAccess(
    @CurrentUser() user: { userId: string },
    @Body() dto: { conversationId: string }
  ) {
    return this.conversationsService.revokePhotoAccess(user.userId, dto.conversationId);
  }

  @Post(":id/compatible")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markCompatible(
    @CurrentUser() user: { userId: string },
    @Param("id") conversationId: string,
  ) {
    return this.compatibleMatchService.markCompatible(user.userId, conversationId);
  }

  @Post(":id/compatible/contact")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addContactInfo(
    @CurrentUser() user: { userId: string },
    @Param("id") conversationId: string,
    @Body() body: { contactInfo: string },
  ) {
    return this.compatibleMatchService.addContactInfo(user.userId, conversationId, body.contactInfo);
  }

  @Post(":id/compatible/contact-request")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  requestContactExchange(
    @CurrentUser() user: { userId: string },
    @Param("id") conversationId: string,
  ) {
    return this.compatibleMatchService.requestContactExchange(user.userId, conversationId);
  }

  @Post(":id/compatible/contact-request/reject")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  rejectContactExchange(
    @CurrentUser() user: { userId: string },
    @Param("id") conversationId: string,
  ) {
    return this.compatibleMatchService.rejectContactExchange(user.userId, conversationId);
  }

  @Post(":id/compatible/contact-request/cancel")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancelContactExchange(
    @CurrentUser() user: { userId: string },
    @Param("id") conversationId: string,
  ) {
    return this.compatibleMatchService.cancelContactExchange(user.userId, conversationId);
  }

  @Get(":id/compatible/status")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getCompatibleStatus(
    @CurrentUser() user: { userId: string },
    @Param("id") conversationId: string,
  ) {
    return this.compatibleMatchService.getMatchStatus(user.userId, conversationId);
  }
}
