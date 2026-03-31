import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { Permissions } from "../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../common/guards/permissions.guard";

@ApiTags("admin-reports")
@Controller("admin/reports")
export class AdminReportsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("REPORTS_VIEW")
  getReports(@Query("days") days?: string) {
    return this.adminService.getReports(days ? Number(days) : undefined);
  }
}
