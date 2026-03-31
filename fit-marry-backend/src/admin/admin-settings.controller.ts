import { Body, Controller, Get, Put, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { $Enums } from "@prisma/client";
import { UpdateSettingsDto } from "./dto/update-settings.dto";
import { CurrentAdmin } from "../common/decorators/current-admin.decorator";

@ApiTags("admin-settings")
@Controller("admin/settings")
export class AdminSettingsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  listSettings() {
    return this.adminService.listSettings();
  }

  @Put()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  async updateSetting(
    @Body() dto: UpdateSettingsDto,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string }
  ) {
    const updated = await this.adminService.updateSetting(dto.key, dto.value, admin.adminId);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "SETTING_UPDATE",
      entityType: "Setting",
      entityId: updated.id,
      after: updated,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return updated;
  }
}
