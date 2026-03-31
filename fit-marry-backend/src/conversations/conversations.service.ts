import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { LeaveConversationDto } from "./dto/leave-conversation.dto";

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyConversations(userId: string) {
    // Get blocked user IDs
    const blocks = await this.prisma.userBlock.findMany({
      where: { OR: [{ blockerUserId: userId }, { blockedUserId: userId }] },
      select: { blockerUserId: true, blockedUserId: true },
    });
    const blockedIds = new Set(blocks.map(b => b.blockerUserId === userId ? b.blockedUserId : b.blockerUserId));

    const conversations = await this.prisma.conversation.findMany({
      where: {
        status: "ACTIVE",
        participants: {
          some: {
            userId: userId,
            isActive: true,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    nickname: true,
                    avatarUrl: true,
                  }
                }
              }
            }
          }
        },
        photoAccesses: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      },
    });

    return { conversations };
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: {
            userId: userId,
            isActive: true,
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                lastSeenAt: true,
                profile: {
                  select: {
                    nickname: true,
                    avatarUrl: true,
                    guardianRelation: true,
                    guardianName: true,
                    guardianContact: true,
                  },
                },
              },
            }
          }
        },
        photoAccesses: true,
      }
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    return {
      ...conversation,
      participants: conversation.participants.map((participant) => ({
        ...participant,
        user: {
          ...participant.user,
          profile: participant.user.profile
            ? {
                nickname: participant.user.profile.nickname,
                avatarUrl: participant.user.profile.avatarUrl,
                guardianRelation: participant.user.profile.guardianRelation,
                guardianAvailable: !!(
                  participant.user.profile.guardianRelation ||
                  participant.user.profile.guardianName ||
                  participant.user.profile.guardianContact
                ),
              }
            : participant.user.profile,
        },
      })),
    };
  }

  async leaveConversation(userId: string, dto: LeaveConversationDto) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: dto.conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const participant = conversation.participants.find((p: any) => p.userId === userId);
    if (!participant) {
      throw new BadRequestException("Not a participant");
    }

    return this.prisma.$transaction(async (tx: any) => {
      await tx.conversationParticipant.update({
        where: { id: participant.id },
        data: {
          isActive: false,
          leftAt: new Date(),
          leaveReason: dto.reason,
        },
      });

      await tx.conversation.update({
        where: { id: conversation.id },
        data: { status: "CLOSED", endedAt: new Date() },
      });
      
      return { success: true };
    });
  }

  async blockUser(blockerUserId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const other = conversation.participants.find((p: any) => p.userId !== blockerUserId);
    if (!other) {
      throw new BadRequestException("Invalid conversation state");
    }

    await this.prisma.$transaction(async (tx: any) => {
      // Create the user block record
      await tx.userBlock.upsert({
        where: { blockerUserId_blockedUserId: { blockerUserId, blockedUserId: other.userId } },
        create: { blockerUserId, blockedUserId: other.userId },
        update: {},
      });

      // Leave the conversation with BLOCK reason
      const participant = conversation.participants.find((p: any) => p.userId === blockerUserId);
      if (participant && participant.isActive) {
        await tx.conversationParticipant.update({
          where: { id: participant.id },
          data: { isActive: false, leftAt: new Date(), leaveReason: "BLOCK" },
        });
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { status: "CLOSED", endedAt: new Date() },
        });
      }

      // Remove photo access both ways
      await tx.photoAccess.deleteMany({
        where: {
          OR: [
            { granterUserId: blockerUserId, granteeUserId: other.userId },
            { granterUserId: other.userId, granteeUserId: blockerUserId },
          ],
        },
      });
    });

    return { success: true };
  }

  async getBlockedUsers(userId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerUserId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            profile: { select: { nickname: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return blocks.map(b => ({
      id: b.id,
      userId: b.blocked.id,
      nickname: b.blocked.profile?.nickname,
      avatarUrl: b.blocked.profile?.avatarUrl,
      blockedAt: b.createdAt,
    }));
  }

  async unblockUser(blockerUserId: string, blockedUserId: string) {
    await this.prisma.userBlock.deleteMany({
      where: { blockerUserId, blockedUserId },
    });
    return { success: true };
  }

  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerUserId: userId1, blockedUserId: userId2 },
          { blockerUserId: userId2, blockedUserId: userId1 },
        ],
      },
    });
    return !!block;
  }

  async countActiveConversations(userId: string): Promise<number> {
    const count = await this.prisma.conversation.count({
      where: {
        status: "ACTIVE",
        participants: {
          some: {
            userId: userId,
            isActive: true,
          },
        },
      },
    });
    return count;
  }

  async grantPhotoAccess(granterUserId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation || conversation.status !== "ACTIVE") {
      throw new NotFoundException("Active conversation not found");
    }

    const me = conversation.participants.find(p => p.userId === granterUserId);
    const other = conversation.participants.find(p => p.userId !== granterUserId);

    if (!me || !other) {
      throw new BadRequestException("Invalid conversation state");
    }

    await this.prisma.photoAccess.upsert({
      where: { granterUserId_granteeUserId: { granterUserId, granteeUserId: other.userId } },
      create: {
        granterUserId,
        granteeUserId: other.userId,
        conversationId,
      },
      update: { conversationId },
    });

    return { success: true };
  }

  async revokePhotoAccess(granterUserId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const other = conversation.participants.find(p => p.userId !== granterUserId);
    if (!other) {
      throw new BadRequestException("Invalid conversation state");
    }

    await this.prisma.photoAccess.deleteMany({
      where: {
        granterUserId,
        granteeUserId: other.userId,
      },
    });

    return { success: true };
  }
}
