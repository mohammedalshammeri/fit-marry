import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { $Enums } from "@prisma/client";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { CurrentAdmin } from "../common/decorators/current-admin.decorator";

@ApiTags("admin-roles")
@Controller("admin")
export class AdminRolesController {
  constructor(private readonly adminService: AdminService) {}

  @Get("roles")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  listRoles() {
    return this.adminService.getRoles();
  }

  @Post("roles")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  async createRole(
    @Body() dto: CreateRoleDto,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string }
  ) {
    const role = await this.adminService.createRole(dto);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "ROLE_CREATE",
      entityType: "Role",
      entityId: role.id,
      after: role,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return role;
  }

  @Patch("roles/:id")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  async updateRole(
    @Param("id") id: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string }
  ) {
    const role = await this.adminService.updateRole(id, dto);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "ROLE_UPDATE",
      entityType: "Role",
      entityId: role.id,
      after: role,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return role;
  }

  @Delete("roles/:id")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  async deleteRole(
    @Param("id") id: string,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string }
  ) {
    const role = await this.adminService.deleteRole(id);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "ROLE_DELETE",
      entityType: "Role",
      entityId: role.id,
      before: role,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return { success: true };
  }

  @Get("permissions")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  listPermissions() {
    return this.adminService.getPermissions();
  }
}
