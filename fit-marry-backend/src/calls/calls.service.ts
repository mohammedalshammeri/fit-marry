import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { WalletService } from "../wallet/wallet.service";
import { AccessControlService } from "../access-control/access-control.service";

@Injectable()
export class CallsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
    private readonly accessControl: AccessControlService,
    private readonly configService: ConfigService,
  ) {}

  async startCall(userId: string, conversationId: string) {
    await this.accessControl.ensureAccess(userId);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const isParticipant = conversation.participants.some((p: any) => p.userId === userId);
    if (!isParticipant) {
      throw new BadRequestException("Not a participant");
    }

    const callSession = await this.prisma.callSession.create({
      data: {
        conversationId,
        status: "STARTED",
      },
    });

    return callSession;
  }

  async endCall(userId: string, callSessionId: string) {
    const session = await this.prisma.callSession.findUnique({
      where: { id: callSessionId },
      include: { conversation: { include: { participants: true } } },
    });

    if (!session) {
      throw new NotFoundException("Call session not found");
    }

    const isParticipant = session.conversation.participants.some((p: any) => p.userId === userId);
    if (!isParticipant) {
      throw new BadRequestException("Not a participant");
    }

    if (session.status !== "STARTED") {
      throw new BadRequestException("Call already ended");
    }

    const durationMs = Date.now() - session.startedAt.getTime();
    const minutes = Math.max(1, Math.ceil(durationMs / 60000));

    // Policy Change: Calls are free if access is allowed. No wallet deduction.
    // await this.walletService.deductMinutes(userId, minutes, {
    //   callSessionId: session.id,
    //   conversationId: session.conversationId,
    // });

    return this.prisma.callSession.update({
      where: { id: callSessionId },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        minutesUsed: minutes,
      },
    });
  }

  async getStatus(callSessionId: string) {
    const session = await this.prisma.callSession.findUnique({ where: { id: callSessionId } });
    if (!session) {
      throw new NotFoundException("Call session not found");
    }
    return session;
  }

  /** Return ICE servers (STUN + TURN if configured) */
  getIceServers() {
    const servers: any[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    const turnUrl = this.configService.get<string>('TURN_SERVER_URL');
    const turnUser = this.configService.get<string>('TURN_USERNAME');
    const turnCred = this.configService.get<string>('TURN_CREDENTIAL');

    if (turnUrl) {
      servers.push({
        urls: turnUrl,
        username: turnUser || '',
        credential: turnCred || '',
      });
    }

    return { iceServers: servers };
  }

  /** List call history for a user */
  async getHistory(userId: string, limit = 20) {
    const participantConvIds = await this.prisma.conversationParticipant.findMany({
      where: { userId, isActive: true },
      select: { conversationId: true },
    });

    const convIds = participantConvIds.map((p: any) => p.conversationId);

    const sessions = await this.prisma.callSession.findMany({
      where: { conversationId: { in: convIds } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        conversation: {
          include: {
            participants: {
              where: { userId: { not: userId } },
              include: { user: { include: { profile: { select: { nickname: true, avatarUrl: true } } } } },
            },
          },
        },
      },
    });

    return sessions.map((s: any) => {
      const otherParticipant = s.conversation?.participants?.[0];
      return {
        id: s.id,
        conversationId: s.conversationId,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        minutesUsed: s.minutesUsed,
        otherUser: otherParticipant ? {
          id: otherParticipant.userId,
          nickname: otherParticipant.user?.profile?.nickname,
          avatarUrl: otherParticipant.user?.profile?.avatarUrl,
        } : null,
      };
    });
  }

  /** Mark call as missed (called when callee doesn't answer within timeout) */
  async missCall(callSessionId: string) {
    const session = await this.prisma.callSession.findUnique({ where: { id: callSessionId } });
    if (!session) throw new NotFoundException("Call session not found");
    if (session.status !== "STARTED") return session;

    return this.prisma.callSession.update({
      where: { id: callSessionId },
      data: { status: "MISSED", endedAt: new Date() },
    });
  }
}
