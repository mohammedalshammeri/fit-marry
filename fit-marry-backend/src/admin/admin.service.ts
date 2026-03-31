import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdminLimitedMessagesDto } from "./dto/admin-limited-messages.dto";
import * as bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

const DEFAULT_LIMIT = 50;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getLimitedMessages(dto: AdminLimitedMessagesDto) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: dto.complaintId },
    });

    if (!complaint || !complaint.conversationId) {
      throw new NotFoundException("Complaint or conversation not found");
    }

    if (complaint.status === "CLOSED") {
      throw new BadRequestException("Complaint is closed");
    }

    const limit = dto.limit ?? DEFAULT_LIMIT;
    const messages = await this.prisma.message.findMany({
      where: { conversationId: complaint.conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return {
      complaintId: complaint.id,
      conversationId: complaint.conversationId,
      items: messages.map((message: any) => this.redactMessage(message)),
    };
  }

  async listUsers(page = 1, limit = 50, search?: string, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { profile: { nickname: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { profile: { select: { nickname: true, avatarUrl: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, wallet: true },
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async updateUserStatus(userId: string, status: "SUSPENDED" | "BANNED" | "ACTIVE") {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  async createAdmin(email: string, password: string) {
    const existing = await this.prisma.admin.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException("Admin already exists");
    }
    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.admin.create({ data: { email, passwordHash } });
  }

  async updateAdminPassword(adminId: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.admin.update({
      where: { id: adminId },
      data: { passwordHash },
    });
  }

  async updateAdmin(adminId: string, dto: { password?: string; status?: "ACTIVE" | "DISABLED"; roleIds?: string[] }) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException("Admin not found");
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updateData: any = {};
      if (dto.password) {
        updateData.passwordHash = await bcrypt.hash(dto.password, 12);
      }
      if (dto.status) {
        updateData.status = dto.status;
      }

      const updated = await tx.admin.update({
        where: { id: adminId },
        data: updateData,
      });

      if (dto.roleIds !== undefined) {
        await tx.adminRole.deleteMany({ where: { adminId } });
        if (dto.roleIds.length > 0) {
          await Promise.all(
            dto.roleIds.map((roleId: string) =>
              tx.adminRole.create({ data: { adminId, roleId } })
            )
          );
        }
      }

      return updated;
    });
  }

  async deleteAdmin(adminId: string) {
    const admin = await this.prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      throw new NotFoundException("Admin not found");
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.adminRole.deleteMany({ where: { adminId } });
      await tx.adminSession.deleteMany({ where: { adminId } });
      await tx.admin.delete({ where: { id: adminId } });
    });

    return { success: true };
  }

  async listAdmins() {
    return this.prisma.admin.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      include: { permissions: { include: { permission: true } } },
    });
  }

  async createRole(dto: { name: string; type: "SUPER_ADMIN" | "SUB_ADMIN"; permissionIds: string[] }) {
    return this.prisma.$transaction(async (tx: any) => {
      const role = await tx.role.create({
        data: {
          name: dto.name,
          type: dto.type,
        },
      });

      await Promise.all(
        dto.permissionIds.map((permissionId) =>
          tx.rolePermission.create({
            data: { roleId: role.id, permissionId },
          })
        )
      );

      return role;
    });
  }

  async updateRole(id: string, dto: { name?: string; type?: "SUPER_ADMIN" | "SUB_ADMIN"; permissionIds?: string[] }) {
    return this.prisma.$transaction(async (tx: any) => {
      const role = await tx.role.update({
        where: { id },
        data: {
          name: dto.name,
          type: dto.type,
        },
      });

      if (dto.permissionIds) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await Promise.all(
          dto.permissionIds.map((permissionId) =>
            tx.rolePermission.create({
              data: { roleId: id, permissionId },
            })
          )
        );
      }

      return role;
    });
  }

  async deleteRole(id: string) {
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
    return this.prisma.role.delete({ where: { id } });
  }

  async getPermissions() {
    return this.prisma.permission.findMany({
      orderBy: { code: "asc" },
    });
  }

  async listComplaints() {
    return this.prisma.complaint.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        attachments: true,
        reporter: {
          include: {
            profile: {
              select: { nickname: true },
            },
          },
        },
        reportedUser: {
          include: {
            profile: {
              select: { nickname: true },
            },
          },
        },
      },
    });
  }

  async updateComplaintStatus(id: string, status: "OPEN" | "UNDER_REVIEW" | "ACTION_TAKEN" | "CLOSED") {
    return this.prisma.complaint.update({
      where: { id },
      data: { status },
    });
  }

  async getComplaintById(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      include: {
        attachments: true,
        reporter: {
          include: {
            profile: {
              select: { nickname: true },
            },
          },
        },
        reportedUser: {
          include: {
            profile: {
              select: { nickname: true },
            },
          },
        },
      },
    });
    if (!complaint) {
      throw new NotFoundException("Complaint not found");
    }
    return {
      ...complaint,
      reporterUser: complaint.reporterId,
      reportedUser: complaint.reportedUserId
    };
  }

  async getComplaintMessages(id: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id },
      select: { conversationId: true },
    });

    if (!complaint || !complaint.conversationId) {
      return [];
    }

    return this.prisma.message.findMany({
      where: { conversationId: complaint.conversationId },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
  }

  async createBanner(data: any) {
    return this.prisma.banner.create({ data });
  }

  async listBanners() {
    return this.prisma.banner.findMany({ orderBy: { createdAt: "desc" } });
  }

  async listSubscriptionPackages() {
    const items = await this.prisma.subscriptionPackage.findMany({
      orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return items.map((item) => this.serializeSubscriptionPackage(item));
  }

  async getSubscriptionPackageById(id: string) {
    const item = await this.prisma.subscriptionPackage.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException("Subscription package not found");
    }
    return this.serializeSubscriptionPackage(item);
  }

  async createSubscriptionPackage(dto: Record<string, any>) {
    const created = await this.prisma.subscriptionPackage.create({
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        description: dto.description,
        descriptionAr: dto.descriptionAr,
        badgeText: dto.badgeText,
        badgeTextAr: dto.badgeTextAr,
        color: dto.color ?? '#E91E63',
        sortOrder: dto.sortOrder ?? 0,
        price: new Prisma.Decimal(dto.price),
        durationDays: dto.durationDays,
        isActive: dto.isActive ?? true,
        features: this.buildFeatures(dto),
      },
    });

    return this.serializeSubscriptionPackage(created);
  }

  async updateSubscriptionPackage(id: string, dto: Record<string, any>) {
    const current = await this.prisma.subscriptionPackage.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException("Subscription package not found");
    }

    const currentFeatures = this.parsePackageFeatures(current.features);
    const hasFeatureUpdate = this.FEATURE_KEYS.some((k) => dto[k] !== undefined);

    const updated = await this.prisma.subscriptionPackage.update({
      where: { id },
      data: {
        name: dto.name,
        nameAr: dto.nameAr,
        description: dto.description,
        descriptionAr: dto.descriptionAr,
        badgeText: dto.badgeText,
        badgeTextAr: dto.badgeTextAr,
        color: dto.color,
        sortOrder: dto.sortOrder,
        price: dto.price !== undefined ? new Prisma.Decimal(dto.price) : undefined,
        durationDays: dto.durationDays,
        isActive: dto.isActive,
        features: hasFeatureUpdate ? this.mergeFeatures(currentFeatures, dto) : undefined,
      },
    });

    return this.serializeSubscriptionPackage(updated);
  }

  async archiveSubscriptionPackage(id: string) {
    const existing = await this.prisma.subscriptionPackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Subscription package not found");
    }

    const updated = await this.prisma.subscriptionPackage.update({
      where: { id },
      data: { isActive: false },
    });

    return this.serializeSubscriptionPackage(updated);
  }

  async updateBanner(id: string, data: any) {
    return this.prisma.banner.update({ where: { id }, data });
  }

  async deleteBanner(id: string) {
    return this.prisma.banner.delete({ where: { id } });
  }

  async listSettings() {
    return this.prisma.setting.findMany({ orderBy: { key: "asc" } });
  }

  async updateSetting(key: string, value: any, adminId: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value, updatedByAdminId: adminId },
      create: { key, value, updatedByAdminId: adminId },
    });
  }

  async listAuditLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
    });
  }

  async getReports(days?: number) {
    const safeDays = days === 30 ? 30 : 7;
    const rangeStart = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
    const [users, complaints, transactions, subscriptions, calls, activeUsers] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.complaint.count(),
      this.prisma.transaction.count(),
      this.prisma.userSubscription.count({ where: { isActive: true } }),
      this.prisma.callSession.count(),
      this.prisma.user.count({
        where: { lastSeenAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const [successStoriesTotal, successStoriesPublic, compatibleCompleted, contactExchangePending, contactExchangeApproved, recentCompatibleCompleted] = await Promise.all([
      this.prisma.successStory.count(),
      this.prisma.successStory.count({ where: { displayApproved: true } }),
      this.prisma.compatibleMatch.count({ where: { completedAt: { not: null } } }),
      this.prisma.compatibleMatch.count({ where: { contactExchangeStatus: 'PENDING' } }),
      this.prisma.compatibleMatch.count({ where: { contactExchangeStatus: 'APPROVED' } }),
      this.prisma.compatibleMatch.count({ where: { completedAt: { gte: rangeStart } } }),
    ]);

    // Complaint breakdown by category
    const complaintsByCategory = await this.prisma.complaint.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    // Subscription breakdown
    const subscriptionsByPackage = await this.prisma.userSubscription.groupBy({
      by: ['packageId'],
      where: { isActive: true },
      _count: { id: true },
    });

    // User status breakdown
    const usersByStatus = await this.prisma.user.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    // Gender breakdown
    const usersByGender = await this.prisma.user.groupBy({
      by: ['gender'],
      _count: { id: true },
    });

    const activity = await this.buildActivitySeries(safeDays);
    const recent = activity.reduce(
      (acc, day) => {
        acc.users += day.users;
        acc.complaints += day.complaints;
        acc.transactions += day.transactions;
        acc.messages += day.messages;
        return acc;
      },
      { users: 0, complaints: 0, transactions: 0, messages: 0 },
    );
    const previous = await this.buildPeriodTotals(safeDays, 1);
    const comparison = {
      users: this.buildTrend(recent.users, previous.users),
      complaints: this.buildTrend(recent.complaints, previous.complaints),
      transactions: this.buildTrend(recent.transactions, previous.transactions),
      messages: this.buildTrend(recent.messages, previous.messages),
    };

    return {
      users,
      activeUsers,
      complaints,
      transactions,
      subscriptions,
      calls,
      rangeDays: safeDays,
      activity,
      recent,
      previous,
      comparison,
      seriousJourney: {
        successStoriesTotal,
        successStoriesPublic,
        compatibleCompleted,
        contactExchangePending,
        contactExchangeApproved,
        recentCompatibleCompleted,
      },
      breakdown: {
        complaintsByCategory: complaintsByCategory.map((c: any) => ({
          category: c.category,
          count: c._count.id,
        })),
        subscriptionsByPackage: subscriptionsByPackage.map((s: any) => ({
          packageId: s.packageId,
          count: s._count.id,
        })),
        usersByStatus: usersByStatus.map((u: any) => ({
          status: u.status,
          count: u._count.id,
        })),
        usersByGender: usersByGender.map((u: any) => ({
          gender: u.gender,
          count: u._count.id,
        })),
      },
    };
  }

  async createAuditLog(params: {
    actorAdminId: string;
    actionType: string;
    entityType: string;
    entityId?: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    ip?: string | null;
    userAgent?: string | null;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorAdminId: params.actorAdminId,
        actionType: params.actionType,
        entityType: params.entityType,
        entityId: params.entityId,
        before: params.before ? (params.before as any) : undefined,
        after: params.after ? (params.after as any) : undefined,
        ip: params.ip ?? undefined,
        userAgent: params.userAgent ?? undefined,
      },
    });
  }

  private redactMessage(message: any) {
    if (message.type === "IMAGE") {
      return {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        type: message.type,
        text: null,
        mediaUrl: null,
        createdAt: message.createdAt,
      };
    }

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      type: message.type,
      text: message.text,
      mediaUrl: null,
      createdAt: message.createdAt,
    };
  }

  private readonly FEATURE_KEYS = [
    'unlimitedLikes', 'seeWhoLikesYou', 'superLikesPerDay', 'boostsPerMonth',
    'travelMode', 'advancedFilters', 'noAds', 'priorityLikes',
    'messageBeforeMatch', 'profileBoost', 'undoLike',
    'dailyMatchesLimit', 'chatLimit', 'readReceipts', 'aiMatchmaker',
  ] as const;

  private readonly FEATURE_DEFAULTS: Record<string, any> = {
    unlimitedLikes: false,
    seeWhoLikesYou: false,
    superLikesPerDay: 0,
    boostsPerMonth: 0,
    travelMode: false,
    advancedFilters: false,
    noAds: false,
    priorityLikes: false,
    messageBeforeMatch: false,
    profileBoost: false,
    undoLike: false,
    dailyMatchesLimit: 3,
    chatLimit: 2,
    readReceipts: false,
    aiMatchmaker: false,
  };

  private buildFeatures(dto: Record<string, any>) {
    const features: Record<string, any> = {};
    for (const key of this.FEATURE_KEYS) {
      features[key] = dto[key] ?? this.FEATURE_DEFAULTS[key];
    }
    return features;
  }

  private mergeFeatures(current: Record<string, any>, dto: Record<string, any>) {
    const features: Record<string, any> = { ...current };
    for (const key of this.FEATURE_KEYS) {
      if (dto[key] !== undefined) {
        features[key] = dto[key];
      }
    }
    return features;
  }

  private serializeSubscriptionPackage(item: any) {
    const features = this.parsePackageFeatures(item.features);

    return {
      id: item.id,
      name: item.name,
      nameAr: item.nameAr ?? null,
      description: item.description ?? null,
      descriptionAr: item.descriptionAr ?? null,
      badgeText: item.badgeText ?? null,
      badgeTextAr: item.badgeTextAr ?? null,
      color: item.color ?? '#E91E63',
      sortOrder: item.sortOrder ?? 0,
      price: Number(item.price),
      durationDays: item.durationDays,
      isActive: item.isActive,
      features,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private parsePackageFeatures(features: Prisma.JsonValue | null): Record<string, any> {
    const raw = features && typeof features === "object" && !Array.isArray(features) ? (features as Record<string, unknown>) : {};
    const result: Record<string, any> = {};
    for (const key of this.FEATURE_KEYS) {
      const defaultVal = this.FEATURE_DEFAULTS[key];
      if (typeof defaultVal === 'boolean') {
        result[key] = Boolean(raw[key] ?? defaultVal);
      } else {
        result[key] = raw[key] !== undefined ? Number(raw[key]) : defaultVal;
      }
    }
    return result;
  }

  private async buildActivitySeries(days: number) {
    const dayFormatter = new Intl.DateTimeFormat("ar", {
      weekday: "short",
      timeZone: "UTC",
    });

    const ranges = Array.from({ length: days }, (_, index) => {
      const offset = days - index - 1;
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      start.setUTCDate(start.getUTCDate() - offset);

      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);

      return {
        label: dayFormatter.format(start),
        date: start.toISOString().slice(0, 10),
        start,
        end,
      };
    });

    return Promise.all(
      ranges.map(async ({ label, date, start, end }) => {
        const { users, complaints, transactions, messages } = await this.buildCountsBetween(start, end);

        return {
          label,
          date,
          users,
          complaints,
          transactions,
          messages,
          total: users + complaints + transactions + messages,
        };
      }),
    );
  }

  private async buildPeriodTotals(days: number, periodOffset: number) {
    const { start, end } = this.getPeriodBounds(days, periodOffset);
    return this.buildCountsBetween(start, end);
  }

  private getPeriodBounds(days: number, periodOffset = 0) {
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    end.setUTCDate(end.getUTCDate() - days * periodOffset + (periodOffset === 0 ? 1 : 0));

    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - days);

    return { start, end };
  }

  private async buildCountsBetween(start: Date, end: Date) {
    const [users, complaints, transactions, messages] = await Promise.all([
      this.prisma.user.count({ where: { createdAt: { gte: start, lt: end } } }),
      this.prisma.complaint.count({ where: { createdAt: { gte: start, lt: end } } }),
      this.prisma.transaction.count({ where: { createdAt: { gte: start, lt: end } } }),
      this.prisma.message.count({ where: { createdAt: { gte: start, lt: end } } }),
    ]);

    return { users, complaints, transactions, messages };
  }

  private buildTrend(current: number, previous: number) {
    const delta = current - previous;
    const percentage = previous === 0 ? (current > 0 ? 100 : 0) : Math.round((delta / previous) * 100);

    return {
      current,
      previous,
      delta,
      percentage,
      direction: delta === 0 ? "flat" : delta > 0 ? "up" : "down",
    };
  }
}
