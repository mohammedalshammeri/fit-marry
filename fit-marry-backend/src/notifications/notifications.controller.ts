import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { NotificationsService } from "./notifications.service";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  listNotifications(
    @CurrentUser() user: { userId: string },
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.notificationsService.listNotifications(
      user.userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Get("unread-count")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getUnreadCount(@CurrentUser() user: { userId: string }) {
    return this.notificationsService.getUnreadCount(user.userId);
  }

  @Patch(":id/read")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markAsRead(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.notificationsService.markAsRead(user.userId, id);
  }

  @Patch("read-all")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  markAllAsRead(@CurrentUser() user: { userId: string }) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  deleteNotification(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.notificationsService.deleteNotification(user.userId, id);
  }

  @Post("register-push")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  registerPushToken(
    @CurrentUser() user: { userId: string },
    @Body() body: { token: string }
  ) {
    return this.notificationsService.registerPushToken(user.userId, body.token);
  }
}
