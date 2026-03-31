import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { ListMessagesDto } from "./dto/list-messages.dto";
import { SendMessageDto } from "./dto/send-message.dto";
import { InitMediaUploadDto } from "./dto/init-media-upload.dto";
import { UploadTempImageDto } from "./dto/upload-temp-image.dto";
import { AccessControlService } from "../access-control/access-control.service";
import { NotificationsService } from "../notifications/notifications.service";
import { MessagesGateway } from "./messages.gateway";

import { MessageType } from "@prisma/client";

const DEFAULT_LIMIT = 30;

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessControl: AccessControlService,
    private readonly notificationsService: NotificationsService,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  async listMessages(userId: string, conversationId: string, query: ListMessagesDto) {
    const conversation = await this.ensureParticipant(userId, conversationId);
    const partnerIds = conversation.participants
      .filter((participant: any) => participant.userId !== userId)
      .map((participant: any) => participant.userId);

    const limit = query.limit ?? DEFAULT_LIMIT;
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      skip: query.cursor ? 1 : 0,
      ...(query.cursor ? { cursor: { id: query.cursor } } : {}),
    });

    const nextCursor = messages.length > limit ? messages[limit]?.id ?? null : null;
    const items = messages.slice(0, limit);

    const views = await this.prisma.messageView.findMany({
      where: {
        userId: { in: [userId, ...partnerIds] },
        messageId: { in: items.map((m: any) => m.id) },
      },
    });

    const selfViewMap = new Map(
      views.filter((view: any) => view.userId === userId).map((view: any) => [view.messageId, view]),
    );
    const partnerViewMap = new Map(
      views.filter((view: any) => view.userId !== userId).map((view: any) => [view.messageId, view]),
    );

    return {
      conversationId: conversation.id,
      items: items.map((message: any) =>
        this.toMessageDto(message, selfViewMap.get(message.id), partnerViewMap.get(message.id)),
      ),
      nextCursor,
    };
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    await this.accessControl.ensureAccess(userId);
    await this.ensureParticipant(userId, dto.conversationId);

    if (dto.type === "TEXT" && !dto.text) {
      throw new BadRequestException("Text is required for text messages");
    }

    // Block contact info sharing unless both users confirmed "Compatible"
    if (dto.type === "TEXT" && dto.text) {
      if (this.containsContactInfo(dto.text)) {
        const isAllowed = await this.isContactSharingAllowed(userId, dto.conversationId);
        if (!isAllowed) {
          throw new BadRequestException("لا يمكنك مشاركة وسائل التواصل قبل أن يضغط الطرفان على 'توافق'");
        }
      }
    }

    if (dto.type === "VOICE") {
      if (!dto.tempMediaId) {
        throw new BadRequestException("Temporary media is required for voice messages");
      }

      const tempMedia = await this.prisma.tempMedia.findUnique({
        where: { id: dto.tempMediaId },
      });

      if (!tempMedia) {
        throw new NotFoundException("Temporary media not found");
      }

      if (tempMedia.expiresAt && new Date() > tempMedia.expiresAt) {
        throw new BadRequestException("Temporary media expired");
      }

      if (!tempMedia.contentType.startsWith('audio/')) {
        throw new BadRequestException("Voice messages require audio content type");
      }
    }

    if (dto.type === "IMAGE") {
      await this.ensureImageAllowed(dto.conversationId);
      if (!dto.tempMediaId) {
        throw new BadRequestException("Temporary media is required");
      }

      const tempMedia = await this.prisma.tempMedia.findUnique({
        where: { id: dto.tempMediaId },
      });

      if (!tempMedia) {
        throw new NotFoundException("Temporary media not found");
      }

      if (tempMedia.expiresAt && new Date() > tempMedia.expiresAt) {
        throw new BadRequestException("Temporary media expired");
      }

      const existingMessage = await this.prisma.message.findFirst({
        where: { tempMediaId: dto.tempMediaId },
        select: { id: true },
      });

      if (existingMessage) {
        throw new BadRequestException("Temporary media already used");
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: userId,
        type: dto.type as MessageType,
        text: dto.text,
        mediaId: dto.tempMediaId,
        mediaResourceType: dto.mediaResourceType,
        mediaBytes: dto.mediaBytes,
        tempMediaId: dto.tempMediaId,
        viewOnce: dto.type === "IMAGE",
        sensitive: dto.type === "IMAGE",
      },
    });

    if ((dto.type === "IMAGE" || dto.type === "VOICE") && dto.tempMediaId) {
      await this.prisma.tempMedia.update({
        where: { id: dto.tempMediaId },
        data: { message: { connect: { id: message.id } } },
      });
    }

    const senderProfile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { nickname: true },
    });

    const recipients = await this.prisma.conversationParticipant.findMany({
      where: {
        conversationId: dto.conversationId,
        userId: { not: userId },
        isActive: true,
      },
      select: { userId: true },
    });

    await Promise.all(
      recipients.map((recipient) =>
        this.notificationsService.notifyUser(recipient.userId, {
          type: "NEW_MESSAGE",
          payload: {
            conversationId: dto.conversationId,
            messageId: message.id,
            senderId: userId,
          },
        }, {
          title: "رسالة جديدة",
          body: `لديك رسالة جديدة من ${senderProfile?.nickname || "أحد المطابقين"}`,
          data: {
            conversationId: dto.conversationId,
            messageId: message.id,
          },
        })
      )
    );

    this.messagesGateway.emitMessageCreated(dto.conversationId, this.toMessageDto(message));

    return message;
  }

  async initMediaUpload(_userId: string, _dto: InitMediaUploadDto) {
    throw new BadRequestException("Use /messages/media for temporary image upload");
  }

  async uploadTempImage(userId: string, dto: UploadTempImageDto) {
    await this.accessControl.ensureAccess(userId);
    await this.ensureParticipant(userId, dto.conversationId);
    await this.ensureImageAllowed(dto.conversationId);

    const buffer = Buffer.from(dto.base64, "base64");
    const maxBytes = Number(process.env.MEDIA_MAX_BYTES ?? 2_000_000);
    if (buffer.length > maxBytes) {
      throw new BadRequestException("Image too large");
    }

    const tempMedia = await this.prisma.tempMedia.create({
      data: {
        contentType: dto.contentType,
        data: buffer,
      },
    });

    return { tempMediaId: tempMedia.id };
  }

  async uploadTempAudio(userId: string, dto: UploadTempImageDto) {
    await this.accessControl.ensureAccess(userId);
    await this.ensureParticipant(userId, dto.conversationId);

    if (!dto.contentType.startsWith('audio/')) {
      throw new BadRequestException("Invalid audio content type");
    }

    const buffer = Buffer.from(dto.base64, "base64");
    const maxBytes = Number(process.env.AUDIO_MAX_BYTES ?? 5_000_000); // 5MB
    if (buffer.length > maxBytes) {
      throw new BadRequestException("Audio too large");
    }

    const tempMedia = await this.prisma.tempMedia.create({
      data: {
        contentType: dto.contentType,
        data: buffer,
      },
    });

    return { tempMediaId: tempMedia.id };
  }

  async getTempMedia(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { tempMedia: true },
    });

    if (!message || !message.tempMediaId || (message.type !== "IMAGE" && message.type !== "VOICE")) {
      throw new NotFoundException("Media not found");
    }

    await this.ensureParticipant(userId, message.conversationId);

    const isVoice = message.type === "VOICE";

    const view = await this.prisma.messageView.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });

    // Only restrict re-viewing for images (view-once), voice can be replayed
    if (!isVoice && view?.consumedAt) {
      throw new BadRequestException("Media already viewed");
    }

    const tempMedia = message.tempMedia;
    if (!tempMedia) {
      throw new NotFoundException("Media not found");
    }

    const now = new Date();
    // Only expire images, not voice
    if (!isVoice && tempMedia.expiresAt && now > tempMedia.expiresAt) {
      await this.prisma.tempMedia.delete({ where: { id: tempMedia.id } });
      throw new BadRequestException("Media expired");
    }

    if (isVoice) {
      // Voice: track view without consuming
      await this.prisma.messageView.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { viewedAt: now },
        create: { messageId, userId, viewedAt: now },
      });
      return { data: tempMedia.data, contentType: tempMedia.contentType, expiresAt: null };
    }

    // Image: view-once with TTL
    const viewSeconds = Number(process.env.TEMP_MEDIA_VIEW_SECONDS ?? 3);
    const expiresAt = new Date(now.getTime() + viewSeconds * 1000);

    await this.prisma.$transaction(async (tx: any) => {
      await tx.messageView.upsert({
        where: { messageId_userId: { messageId, userId } },
        update: { viewedAt: now, consumedAt: now },
        create: { messageId, userId, viewedAt: now, consumedAt: now },
      });

      await tx.tempMedia.update({
        where: { id: tempMedia.id },
        data: { expiresAt },
      });
    });

    return { data: tempMedia.data, contentType: tempMedia.contentType, expiresAt };
  }

  async markViewed(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      throw new NotFoundException("Message not found");
    }
    await this.ensureParticipant(userId, message.conversationId);

    const result = await this.prisma.messageView.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: {
        viewedAt: new Date(),
        consumedAt: message.viewOnce ? new Date() : undefined,
      },
      create: {
        messageId,
        userId,
        viewedAt: new Date(),
        consumedAt: message.viewOnce ? new Date() : undefined,
      },
    });

    this.messagesGateway.emitMessageRead(
      message.conversationId,
      messageId,
      userId,
      (result.viewedAt ?? new Date()).toISOString(),
    );

    return result;
  }

  async deleteMessage(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) {
      throw new NotFoundException("Message not found");
    }
    if (message.senderId !== userId) {
      throw new BadRequestException("You can only delete your own messages");
    }
    await this.ensureParticipant(userId, message.conversationId);

    // Delete associated temp media
    if (message.tempMediaId) {
      await this.prisma.tempMedia.delete({ where: { id: message.tempMediaId } }).catch(() => {});
    }

    // Delete views then message
    await this.prisma.messageView.deleteMany({ where: { messageId } });
    await this.prisma.message.delete({ where: { id: messageId } });

    this.messagesGateway.emitMessageDeleted(message.conversationId, messageId);

    return { success: true };
  }

  async searchMessages(userId: string, conversationId: string, query: string, limit = 20) {
    await this.ensureParticipant(userId, conversationId);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        type: "TEXT",
        text: { contains: query, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { items: messages.map((m: any) => this.toMessageDto(m)) };
  }

  private async ensureParticipant(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    const participant = conversation.participants.find((p: any) => p.userId === userId && p.isActive);
    if (!participant) {
      throw new BadRequestException("Not an active participant");
    }

    return conversation;
  }

  private async ensureImageAllowed(conversationId: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key: "imageWaitDays" } });
    const waitDays = Number((setting?.value as any) ?? 7);
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }
    const availableAt = new Date(conversation.startedAt.getTime() + waitDays * 24 * 60 * 60 * 1000);
    if (new Date() < availableAt) {
      throw new BadRequestException("Images not allowed yet");
    }
  }

  private toMessageDto(message: any, selfView?: any, partnerView?: any) {
    if (message.viewOnce && selfView?.consumedAt) {
      return {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        type: message.type,
        text: message.type === "TEXT" ? message.text : null,
        mediaUrl: null,
        tempMediaId: null,
        viewOnce: true,
        sensitive: message.sensitive,
        createdAt: message.createdAt,
        viewedAt: selfView?.viewedAt ?? null,
        readAt: partnerView?.viewedAt ?? null,
      };
    }

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      type: message.type,
      text: message.text,
      mediaUrl: message.mediaUrl,
      tempMediaId: message.tempMediaId,
      viewOnce: message.viewOnce,
      sensitive: message.sensitive,
      createdAt: message.createdAt,
      viewedAt: selfView?.viewedAt ?? null,
      readAt: partnerView?.viewedAt ?? null,
    };
  }

  /** Cleanup orphaned/expired TempMedia every hour */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredTempMedia() {
    try {
      // Delete temp media that: 1) has expired, OR 2) is older than 24h with no linked message
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const { count: expiredCount } = await this.prisma.tempMedia.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { createdAt: { lt: oneDayAgo }, message: null },
          ],
        },
      });

      if (expiredCount > 0) {
        this.logger.log(`Cleaned up ${expiredCount} expired/orphaned TempMedia records`);
      }
    } catch (e) {
      this.logger.error('TempMedia cleanup failed', e);
    }
  }

  // ─── Contact Info Blocking ────────────────────────────

  /** Detect phone numbers, emails, social media handles in text */
  private containsContactInfo(text: string): boolean {
    const patterns = [
      // Phone numbers (various formats)
      /(?:\+?\d{1,4}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/,
      // Emails
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      // Social media handles
      /(?:snap(?:chat)?|insta(?:gram)?|twitter|x\.com|whatsapp|واتساب|واتس|سناب|انستا|انستقرام|تلقرام|telegram|tele|تيليجرام|فيسبوك|facebook|fb)\s*[:@]?\s*[\w.]+/i,
      // URL patterns
      /(?:https?:\/\/|www\.)[^\s]+/i,
      // Arabic phone patterns
      /٠[٥٩]\d{8}/,
      /05\d{8}/,
    ];

    const lowerText = text.toLowerCase();
    return patterns.some(p => p.test(lowerText));
  }

  /** Check if both users have confirmed "Compatible" in the conversation */
  private async isContactSharingAllowed(userId: string, conversationId: string): Promise<boolean> {
    const otherParticipant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId }, isActive: true },
    });
    if (!otherParticipant) return false;

    const [user1Id, user2Id] = [userId, otherParticipant.userId].sort();

    const match = await this.prisma.compatibleMatch.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    return !!(match?.user1Confirmed && match?.user2Confirmed);
  }
}
