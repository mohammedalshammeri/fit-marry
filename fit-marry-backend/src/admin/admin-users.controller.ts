import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { Permissions } from "../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { $Enums } from "@prisma/client";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateAdminDto } from "./dto/update-admin.dto";
import { CurrentAdmin } from "../common/decorators/current-admin.decorator";

@ApiTags("admin-users")
@Controller("admin")
export class AdminUsersController {
  constructor(private readonly adminService: AdminService) {}

  @Get("users")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("USERS_READ")
  listUsers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
  ) {
    return this.adminService.listUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      search,
      status,
    );
  }

  @Get("users/:id")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("USERS_READ")
  getUser(@Param("id") id: string) {
    return this.adminService.getUserById(id);
  }

  @Post("users/:id/suspend")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("USERS_WRITE")
  async suspendUser(@Param("id") id: string, @Req() req: any, @CurrentAdmin() admin: { adminId: string }) {
    const before = await this.adminService.getUserById(id);
    const updated = await this.adminService.updateUserStatus(id, "SUSPENDED");
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "USER_SUSPEND",
      entityType: "User",
      entityId: id,
      before,
      after: updated,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return updated;
  }

  @Post("users/:id/ban")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("USERS_WRITE")
  async banUser(@Param("id") id: string, @Req() req: any, @CurrentAdmin() admin: { adminId: string }) {
    const before = await this.adminService.getUserById(id);
    const updated = await this.adminService.updateUserStatus(id, "BANNED");
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "USER_BAN",
      entityType: "User",
      entityId: id,
      before,
      after: updated,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return updated;
  }

  @Post("users/:id/unban")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("USERS_WRITE")
  async unbanUser(@Param("id") id: string, @Req() req: any, @CurrentAdmin() admin: { adminId: string }) {
    const before = await this.adminService.getUserById(id);
    const updated = await this.adminService.updateUserStatus(id, "ACTIVE");
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "USER_UNBAN",
      entityType: "User",
      entityId: id,
      before,
      after: updated,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return updated;
  }

  @Get("admins")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  listAdmins() {
    return this.adminService.listAdmins();
  }

  @Post("admins")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  async createAdmin(
    @Body() dto: CreateAdminDto,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string }
  ) {
    const created = await this.adminService.createAdmin(dto.email, dto.password);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "ADMIN_CREATE",
      entityType: "Admin",
      entityId: created.id,
      after: created,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return created;
  }

  @Patch("admins/:id")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  async updateAdmin(
    @Param("id") id: string,
    @Body() dto: UpdateAdminDto,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string }
  ) {
    const updated = await this.adminService.updateAdmin(id, dto);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "ADMIN_UPDATE",
      entityType: "Admin",
      entityId: id,
      after: updated,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return updated;
  }

  @Delete("admins/:id")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  async deleteAdmin(
    @Param("id") id: string,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string }
  ) {
    if (id === admin.adminId) {
      throw new BadRequestException("Cannot delete yourself");
    }
    await this.adminService.deleteAdmin(id);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "ADMIN_DELETE",
      entityType: "Admin",
      entityId: id,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return { success: true };
  }
}
