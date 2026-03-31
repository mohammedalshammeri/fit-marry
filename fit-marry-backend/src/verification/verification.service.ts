import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** User submits selfie for verification */
  async submitVerification(userId: string, selfieUrl: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    // Check if there's already a pending request
    const existing = await this.prisma.verificationRequest.findFirst({
      where: { userId, status: "PENDING" },
    });
    if (existing) {
      throw new BadRequestException("You already have a pending verification request");
    }

    const request = await this.prisma.verificationRequest.create({
      data: { userId, selfieUrl },
    });

    return { id: request.id, status: request.status };
  }

  /** Get user's verification status */
  async getMyVerification(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { verificationStatus: true, verifiedAt: true },
    });
    if (!user) throw new NotFoundException("User not found");

    const latestRequest = await this.prisma.verificationRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, adminNotes: true, createdAt: true },
    });

    return {
      verificationStatus: user.verificationStatus,
      verifiedAt: user.verifiedAt,
      latestRequest,
    };
  }

  // ─── Admin endpoints ────────────────────────────────

  /** Admin: Get all pending verification requests */
  async getPendingRequests(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.verificationRequest.findMany({
        where: { status: "PENDING" },
        include: {
          user: {
            select: { id: true, email: true, phone: true, profile: { select: { nickname: true, avatarUrl: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
        skip,
        take: limit,
      }),
      this.prisma.verificationRequest.count({ where: { status: "PENDING" } }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  /** Admin: Approve verification */
  async approveVerification(requestId: string, adminId: string) {
    const request = await this.prisma.verificationRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Request not found");
    if (request.status !== "PENDING") throw new BadRequestException("Request already processed");

    await this.prisma.$transaction([
      this.prisma.verificationRequest.update({
        where: { id: requestId },
        data: { status: "VERIFIED", reviewedByAdminId: adminId, reviewedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: request.userId },
        data: { verificationStatus: "VERIFIED", verifiedAt: new Date() },
      }),
    ]);

    await this.notificationsService.notifyUser(request.userId, {
      type: "VERIFICATION_APPROVED",
      payload: {},
    }, {
      title: "تم توثيق حسابك ✅",
      body: "تهانينا! تم التحقق من هويتك وحصل حسابك على علامة التوثيق.",
    });

    return { success: true };
  }

  /** Admin: Reject verification */
  async rejectVerification(requestId: string, adminId: string, adminNotes?: string) {
    const request = await this.prisma.verificationRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Request not found");
    if (request.status !== "PENDING") throw new BadRequestException("Request already processed");

    await this.prisma.$transaction([
      this.prisma.verificationRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", reviewedByAdminId: adminId, reviewedAt: new Date(), adminNotes },
      }),
      this.prisma.user.update({
        where: { id: request.userId },
        data: { verificationStatus: "REJECTED" },
      }),
    ]);

    await this.notificationsService.notifyUser(request.userId, {
      type: "VERIFICATION_REJECTED",
      payload: { reason: adminNotes },
    }, {
      title: "طلب التوثيق",
      body: "لم يتم قبول طلب التوثيق. يمكنك إعادة المحاولة بصورة أوضح.",
    });

    return { success: true };
  }
}
