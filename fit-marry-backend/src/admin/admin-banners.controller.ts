import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { AdminJwtAuthGuard } from "../common/guards/admin-jwt-auth.guard";
import { Permissions } from "../common/decorators/permissions.decorator";
import { PermissionsGuard } from "../common/guards/permissions.guard";
import { CreateBannerDto } from "./dto/create-banner.dto";
import { UpdateBannerDto } from "./dto/update-banner.dto";
import { CurrentAdmin } from "../common/decorators/current-admin.decorator";

@ApiTags("admin-banners")
@Controller("admin/banners")
export class AdminBannersController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("BANNERS_MANAGE")
  listBanners() {
    return this.adminService.listBanners();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("BANNERS_MANAGE")
  async createBanner(
    @Body() dto: CreateBannerDto,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string }
  ) {
    const banner = await this.adminService.createBanner({
      title: dto.title,
      imageUrl: dto.imageUrl,
      targetCountries: dto.targetCountries,
      targetLanguages: dto.targetLanguages,
      startAt: new Date(dto.startAt),
      endAt: new Date(dto.endAt),
    });
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "BANNER_CREATE",
      entityType: "Banner",
      entityId: banner.id,
      after: banner,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return banner;
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("BANNERS_MANAGE")
  async updateBanner(
    @Param("id") id: string,
    @Body() dto: UpdateBannerDto,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string }
  ) {
    const before = await this.adminService.listBanners().then((items) => items.find((b: any) => b.id === id));
    const banner = await this.adminService.updateBanner(id, {
      ...dto,
      startAt: dto.startAt ? new Date(dto.startAt) : undefined,
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
    });
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "BANNER_UPDATE",
      entityType: "Banner",
      entityId: banner.id,
      before: before ?? undefined,
      after: banner,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return banner;
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard, PermissionsGuard)
  @Permissions("BANNERS_MANAGE")
  async deleteBanner(
    @Param("id") id: string,
    @Req() req: any,
    @CurrentAdmin() admin: { adminId: string }
  ) {
    const banner = await this.adminService.deleteBanner(id);
    await this.adminService.createAuditLog({
      actorAdminId: admin.adminId,
      actionType: "BANNER_DELETE",
      entityType: "Banner",
      entityId: banner.id,
      before: banner,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
    return { success: true };
  }
}
