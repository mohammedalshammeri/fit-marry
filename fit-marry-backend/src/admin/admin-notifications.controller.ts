import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { NotificationsService } from "../notifications/notifications.service";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";

@ApiTags("admin-notifications")
@Controller("admin/notifications")
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post("broadcast")
  createBroadcast(
    @Body() body: {
      adminId: string;
      title: string;
      titleEn?: string;
      body: string;
      bodyEn?: string;
      type?: string;
      targetGroup?: string;
      imageUrl?: string;
      actionUrl?: string;
    },
  ) {
    return this.notificationsService.createBroadcast(body.adminId, body);
  }

  @Get("broadcasts")
  listBroadcasts(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.notificationsService.listBroadcasts(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Delete("broadcasts/:id")
  deleteBroadcast(@Param("id") id: string) {
    return this.notificationsService.deleteBroadcast(id);
  }
}
