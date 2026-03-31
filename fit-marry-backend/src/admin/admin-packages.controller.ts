import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../common/guards/roles.guard";
import { $Enums } from "@prisma/client";
import { CurrentAdmin } from "../common/decorators/current-admin.decorator";
import { AdminService } from "./admin.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { CreateSubscriptionPackageDto } from "./dto/create-subscription-package.dto";
import { UpdateSubscriptionPackageDto } from "./dto/update-subscription-package.dto";

@ApiTags("admin-packages")
@Controller("admin/packages")
export class AdminPackagesController {
  constructor(
    private readonly adminService: AdminService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  listPackages() {
    return this.adminService.listSubscriptionPackages();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  async createPackage(
    @Body() dto: CreateSubscriptionPackageDto,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string },
  ) {
    const pkg = await this.adminService.createSubscriptionPackage(dto);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "PACKAGE_CREATE",
      entityType: "SubscriptionPackage",
      entityId: pkg.id,
      after: pkg,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return pkg;
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  async updatePackage(
    @Param("id") id: string,
    @Body() dto: UpdateSubscriptionPackageDto,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string },
  ) {
    const before = await this.adminService.getSubscriptionPackageById(id);
    const pkg = await this.adminService.updateSubscriptionPackage(id, dto);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "PACKAGE_UPDATE",
      entityType: "SubscriptionPackage",
      entityId: pkg.id,
      before,
      after: pkg,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return pkg;
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  async deletePackage(
    @Param("id") id: string,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string },
  ) {
    const before = await this.adminService.getSubscriptionPackageById(id);
    const pkg = await this.adminService.archiveSubscriptionPackage(id);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "PACKAGE_ARCHIVE",
      entityType: "SubscriptionPackage",
      entityId: pkg.id,
      before,
      after: pkg,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return { success: true };
  }

  @Post("subscriptions/:subscriptionId/refund")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles($Enums.RoleType.SUPER_ADMIN)
  async refundSubscription(
    @Param("subscriptionId") subscriptionId: string,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string },
  ) {
    const result = await this.subscriptionsService.refundSubscription(subscriptionId);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "SUBSCRIPTION_REFUND",
      entityType: "UserSubscription",
      entityId: subscriptionId,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return result;
  }
}