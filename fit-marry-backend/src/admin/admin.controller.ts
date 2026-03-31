import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AdminLimitedMessagesDto } from "./dto/admin-limited-messages.dto";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { Permissions } from "../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../common/guards/permissions.guard";

@ApiTags("admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("complaints/limited-messages")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("COMPLAINTS_REVIEW")
  getLimitedMessages(@Body() dto: AdminLimitedMessagesDto) {
    return this.adminService.getLimitedMessages(dto);
  }
}
