import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { Permissions } from "../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { ComplaintActionDto } from "./dto/complaint-action.dto";
import { CurrentAdmin } from "../common/decorators/current-admin.decorator";

@ApiTags("admin-complaints")
@Controller("admin/complaints")
export class AdminComplaintsController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("COMPLAINTS_REVIEW")
  listComplaints() {
    return this.adminService.listComplaints();
  }

  @Get(":id")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("COMPLAINTS_REVIEW")
  getComplaint(@Param("id") id: string) {
    return this.adminService.getComplaintById(id);
  }

  @Get(":id/messages")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("COMPLAINTS_REVIEW")
  getComplaintMessages(@Param("id") id: string) {
    return this.adminService.getComplaintMessages(id);
  }

  @Post(":id/actions")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("COMPLAINTS_REVIEW")
  async applyAction(
    @Param("id") id: string,
    @Body() dto: ComplaintActionDto,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string }
  ) {
    const complaint = await this.adminService.getComplaintById(id);
    const before = complaint;

    if (dto.action === "WARN") {
      await this.adminService.createAuditLog({
        actorAdminId: admin.adminId,
        actionType: "COMPLAINT_WARN",
        entityType: "Complaint",
        entityId: complaint.id,
        before,
        after: complaint,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
      return { success: true };
    }

    if (dto.action === "SUSPEND") {
      await this.adminService.updateUserStatus(complaint.reportedUserId, "SUSPENDED");
    }

    if (dto.action === "BAN") {
      await this.adminService.updateUserStatus(complaint.reportedUserId, "BANNED");
    }

    await this.adminService.updateComplaintStatus(complaint.id, "ACTION_TAKEN");

    const updated = await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: `COMPLAINT_${dto.action}`,
      entityType: "Complaint",
      entityId: complaint.id,
      before,
      after: complaint,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    return { success: true, auditLogId: updated.id };
  }
}
