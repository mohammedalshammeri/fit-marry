import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { ContactExchangeStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { MessagesGateway } from "../messages/messages.gateway";

@Injectable()
export class CompatibleMatchService {
  private static readonly CONTACT_EXCHANGE_WINDOW_HOURS = 72;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  /** Mark "Compatible" from a conversation — both sides must confirm */
  async markCompatible(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId, isActive: true },
    });
    if (!participant) throw new NotFoundException("Conversation not found");

    // Find the other participant
    const otherParticipant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId }, isActive: true },
    });
    if (!otherParticipant) throw new BadRequestException("No other participant found");

    const otherUserId = otherParticipant.userId;

    // Determine user1/user2 order (alphabetical to avoid duplicates)
    const [user1Id, user2Id] = [userId, otherUserId].sort();

    // Upsert the compatible match
    let match = await this.prisma.compatibleMatch.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    if (!match) {
      match = await this.prisma.compatibleMatch.create({
        data: {
          user1Id,
          user2Id,
          conversationId,
          ...(userId === user1Id ? { user1Confirmed: true } : { user2Confirmed: true }),
        },
      });
    } else {
      match = await this.prisma.compatibleMatch.update({
        where: { id: match.id },
        data: userId === user1Id ? { user1Confirmed: true } : { user2Confirmed: true },
      });
    }

    // Notify the other user
    await this.notificationsService.notifyUser(otherUserId, {
      type: "COMPATIBLE_REQUEST",
      payload: { conversationId, fromUserId: userId },
    }, {
      title: "طلب توافق 💚",
      body: "الطرف الآخر يرى أنكما متوافقان! هل تشعر بنفس الشيء؟",
      data: { conversationId },
    });

    // Emit via WebSocket
    this.messagesGateway.emitCompatibleMatch(conversationId, {
      type: "compatible:request",
      userId,
      user1Confirmed: match.user1Confirmed,
      user2Confirmed: match.user2Confirmed,
    });

    // Check if both confirmed
    if (match.user1Confirmed && match.user2Confirmed) {
      return this.onBothConfirmed(match.id, conversationId, user1Id, user2Id);
    }

    return { status: "waiting_for_other", matchId: match.id };
  }

  /** Add contact info after both confirmed compatible */
  async addContactInfo(userId: string, conversationId: string, contactInfo: string) {
    // Find the match for this conversation
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId, isActive: true },
    });
    if (!participant) throw new NotFoundException("Conversation not found");

    const otherParticipant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId }, isActive: true },
    });
    if (!otherParticipant) throw new BadRequestException("No other participant");

    const [user1Id, user2Id] = [userId, otherParticipant.userId].sort();

    const match = await this.prisma.compatibleMatch.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    if (!match || !match.user1Confirmed || !match.user2Confirmed) {
      throw new BadRequestException("Both parties must confirm compatibility first");
    }

    const normalizedMatch = await this.ensureContactExchangeFresh(match.id);

    if (normalizedMatch.contactExchangeStatus !== ContactExchangeStatus.APPROVED) {
      throw new BadRequestException("Contact exchange must be approved first");
    }

    // Update contact info for the correct user
    const updateData = userId === user1Id
      ? { user1ContactInfo: contactInfo }
      : { user2ContactInfo: contactInfo };

    const updated = await this.prisma.compatibleMatch.update({
      where: { id: match.id },
      data: updateData,
    });

    // Check if both have added contact info → complete the match
    if (updated.user1ContactInfo && updated.user2ContactInfo && !updated.completedAt) {
      return this.completeMatch(updated.id, conversationId, user1Id, user2Id);
    }

    return { status: "contact_info_added" };
  }

  /** Request or approve contact exchange after both confirmed compatible */
  async requestContactExchange(userId: string, conversationId: string) {
    const { match, otherUserId } = await this.getMatchContext(userId, conversationId);
    if (!match || !otherUserId) {
      throw new BadRequestException("Compatible match not found");
    }
    const normalizedMatch = await this.ensureContactExchangeFresh(match.id);

    if (!normalizedMatch.user1Confirmed || !normalizedMatch.user2Confirmed) {
      throw new BadRequestException("Both parties must confirm compatibility first");
    }

    if (normalizedMatch.contactExchangeStatus === ContactExchangeStatus.PENDING) {
      if (normalizedMatch.contactExchangeRequestedById === userId) {
        throw new BadRequestException("Contact exchange request already pending");
      }

      const updated = await this.prisma.compatibleMatch.update({
        where: { id: normalizedMatch.id },
        data: {
          contactExchangeStatus: ContactExchangeStatus.APPROVED,
          contactExchangeRespondedAt: new Date(),
        },
      });

      await this.notificationsService.notifyUser(otherUserId, {
        type: "CONTACT_EXCHANGE_APPROVED",
        payload: { conversationId, fromUserId: userId },
      }, {
        title: "تم اعتماد تبادل التواصل",
        body: "أصبح بإمكانكما الآن إضافة وسيلة التواصل بشكل منظم.",
        data: { conversationId },
      });

      this.messagesGateway.emitCompatibleMatch(conversationId, {
        type: "compatible:contact_request_approved",
        userId,
      });

      return {
        status: "contact_request_approved",
        canExchangeContacts: true,
      };
    }

    const updated = await this.prisma.compatibleMatch.update({
      where: { id: normalizedMatch.id },
      data: {
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: userId,
        contactExchangeRequestedAt: new Date(),
        contactExchangeRespondedAt: null,
        contactExchangeExpiresAt: this.buildContactExchangeExpiry(),
      },
    });

    await this.notificationsService.notifyUser(otherUserId, {
      type: "CONTACT_EXCHANGE_REQUEST",
      payload: { conversationId, fromUserId: userId },
    }, {
      title: "طلب تبادل تواصل",
      body: "الطرف الآخر طلب الانتقال لمرحلة تبادل التواصل. هل توافق؟",
      data: { conversationId },
    });

    this.messagesGateway.emitCompatibleMatch(conversationId, {
      type: "compatible:contact_request",
      userId,
    });

    return {
      status: "contact_request_pending",
      expiresAt: updated.contactExchangeExpiresAt,
    };
  }

  async rejectContactExchange(userId: string, conversationId: string) {
    const { match, otherUserId } = await this.getMatchContext(userId, conversationId);
    if (!match || !otherUserId) {
      throw new BadRequestException("Compatible match not found");
    }
    const normalizedMatch = await this.ensureContactExchangeFresh(match.id);

    if (normalizedMatch.contactExchangeStatus !== ContactExchangeStatus.PENDING) {
      throw new BadRequestException("No pending contact exchange request found");
    }

    if (normalizedMatch.contactExchangeRequestedById === userId) {
      throw new BadRequestException("You cannot reject your own request");
    }

    await this.prisma.compatibleMatch.update({
      where: { id: normalizedMatch.id },
      data: {
        contactExchangeStatus: ContactExchangeStatus.REJECTED,
        contactExchangeRespondedAt: new Date(),
      },
    });

    await this.notificationsService.notifyUser(otherUserId, {
      type: "CONTACT_EXCHANGE_REJECTED",
      payload: { conversationId, fromUserId: userId },
    }, {
      title: "تم رفض طلب تبادل التواصل",
      body: "يمكنكما المتابعة داخل المحادثة أو المحاولة لاحقاً إذا تغيّر القرار.",
      data: { conversationId },
    });

    this.messagesGateway.emitCompatibleMatch(conversationId, {
      type: "compatible:contact_request_rejected",
      userId,
    });

    return { status: "contact_request_rejected" };
  }

  async cancelContactExchange(userId: string, conversationId: string) {
    const { match, otherUserId } = await this.getMatchContext(userId, conversationId);
    if (!match || !otherUserId) {
      throw new BadRequestException("Compatible match not found");
    }
    const normalizedMatch = await this.ensureContactExchangeFresh(match.id);

    if (normalizedMatch.contactExchangeStatus !== ContactExchangeStatus.PENDING) {
      throw new BadRequestException("No pending contact exchange request found");
    }

    if (normalizedMatch.contactExchangeRequestedById !== userId) {
      throw new BadRequestException("Only the requester can cancel this request");
    }

    await this.prisma.compatibleMatch.update({
      where: { id: normalizedMatch.id },
      data: {
        contactExchangeStatus: ContactExchangeStatus.CANCELLED,
        contactExchangeRespondedAt: new Date(),
      },
    });

    await this.notificationsService.notifyUser(otherUserId, {
      type: "CONTACT_EXCHANGE_CANCELLED",
      payload: { conversationId, fromUserId: userId },
    }, {
      title: "تم إلغاء طلب تبادل التواصل",
      body: "تم سحب الطلب الحالي. يمكن إعادة طلب التبادل لاحقاً إذا رغبتما بذلك.",
      data: { conversationId },
    });

    this.messagesGateway.emitCompatibleMatch(conversationId, {
      type: "compatible:contact_request_cancelled",
      userId,
    });

    return { status: "contact_request_cancelled" };
  }

  /** Get compatible match status for a conversation */
  async getMatchStatus(userId: string, conversationId: string) {
    const { match, otherUserId, user1Id } = await this.getMatchContext(userId, conversationId, false);

    if (!otherUserId) return { status: "no_match" };

    if (!match) return { status: "none" };

    const normalizedMatch = await this.ensureContactExchangeFresh(match.id);

    const isRequester = normalizedMatch.contactExchangeRequestedById === userId;
    const isRecipient = !!normalizedMatch.contactExchangeRequestedById && !isRequester;

    const myConfirmed = userId === user1Id ? normalizedMatch.user1Confirmed : normalizedMatch.user2Confirmed;
    const theirConfirmed = userId === user1Id ? normalizedMatch.user2Confirmed : normalizedMatch.user1Confirmed;
    const myContactAdded = userId === user1Id ? !!normalizedMatch.user1ContactInfo : !!normalizedMatch.user2ContactInfo;

    const status = normalizedMatch.completedAt
      ? "completed"
      : myConfirmed && theirConfirmed
        ? normalizedMatch.contactExchangeStatus === ContactExchangeStatus.APPROVED
          ? "contact_request_approved"
          : normalizedMatch.contactExchangeStatus === ContactExchangeStatus.PENDING
            ? isRequester
              ? "contact_request_pending"
              : "contact_request_received"
            : normalizedMatch.contactExchangeStatus === ContactExchangeStatus.REJECTED
              ? "contact_request_rejected"
              : normalizedMatch.contactExchangeStatus === ContactExchangeStatus.CANCELLED
                ? "contact_request_cancelled"
                : normalizedMatch.contactExchangeStatus === ContactExchangeStatus.EXPIRED
                  ? "contact_request_expired"
                  : "both_confirmed"
        : myConfirmed
          ? "waiting"
          : "none";

    return {
      status,
      myConfirmed,
      theirConfirmed,
      myContactAdded,
      myContactRequestSent: isRequester && normalizedMatch.contactExchangeStatus === ContactExchangeStatus.PENDING,
      theirContactRequestSent: isRecipient && normalizedMatch.contactExchangeStatus === ContactExchangeStatus.PENDING,
      canExchangeContacts: normalizedMatch.contactExchangeStatus === ContactExchangeStatus.APPROVED,
      contactRequestRequestedByMe: isRequester,
      contactRequestRequestedAt: normalizedMatch.contactExchangeRequestedAt,
      contactRequestExpiresAt: normalizedMatch.contactExchangeExpiresAt,
      completedAt: normalizedMatch.completedAt,
    };
  }

  private async getMatchContext(userId: string, conversationId: string, requireMatch = true) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId, isActive: true },
    });
    if (!participant) throw new NotFoundException("Conversation not found");

    const otherParticipant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId: { not: userId }, isActive: true },
    });
    if (!otherParticipant) {
      if (requireMatch) {
        throw new BadRequestException("No other participant found");
      }

      return { match: null, otherUserId: null, user1Id: userId, user2Id: userId };
    }

    const [user1Id, user2Id] = [userId, otherParticipant.userId].sort();
    const match = await this.prisma.compatibleMatch.findUnique({
      where: { user1Id_user2Id: { user1Id, user2Id } },
    });

    if (!match && requireMatch) {
      throw new BadRequestException("Compatible match not found");
    }

    return {
      match,
      otherUserId: otherParticipant.userId,
      user1Id,
      user2Id,
    };
  }

  private async ensureContactExchangeFresh(matchId: string) {
    const match = await this.prisma.compatibleMatch.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException("Compatible match not found");
    }

    if (
      match.contactExchangeStatus === ContactExchangeStatus.PENDING
      && match.contactExchangeExpiresAt
      && match.contactExchangeExpiresAt.getTime() <= Date.now()
    ) {
      return this.prisma.compatibleMatch.update({
        where: { id: match.id },
        data: {
          contactExchangeStatus: ContactExchangeStatus.EXPIRED,
          contactExchangeRespondedAt: new Date(),
        },
      });
    }

    return match;
  }

  private buildContactExchangeExpiry() {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CompatibleMatchService.CONTACT_EXCHANGE_WINDOW_HOURS);
    return expiresAt;
  }

  private async onBothConfirmed(matchId: string, conversationId: string, user1Id: string, user2Id: string) {
    // Notify both users to add contact info
    for (const uid of [user1Id, user2Id]) {
      await this.notificationsService.notifyUser(uid, {
        type: "COMPATIBLE_BOTH_CONFIRMED",
        payload: { conversationId },
      }, {
        title: "توافق متبادل! 🎉",
        body: "تهانينا! كلاكما يرى أنكما متوافقان. أضف وسيلة التواصل الآن.",
        data: { conversationId },
      });
    }

    this.messagesGateway.emitCompatibleMatch(conversationId, {
      type: "compatible:both_confirmed",
      matchId,
    });

    return { status: "both_confirmed", matchId };
  }

  private async completeMatch(matchId: string, conversationId: string, user1Id: string, user2Id: string) {
    // Mark as completed
    await this.prisma.compatibleMatch.update({
      where: { id: matchId },
      data: { completedAt: new Date() },
    });

    // Get user profiles for the success story
    const [u1Profile, u2Profile] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId: user1Id }, select: { region: true } }),
      this.prisma.userProfile.findUnique({ where: { userId: user2Id }, select: { region: true } }),
    ]);

    const [u1, u2] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: user1Id }, select: { marriageType: true } }),
      this.prisma.user.findUnique({ where: { id: user2Id }, select: { marriageType: true } }),
    ]);

    // Create success story
    await this.prisma.successStory.upsert({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      update: {},
      create: {
        user1Id,
        user2Id,
        city: u1Profile?.region || u2Profile?.region,
        marriageType: u1?.marriageType || u2?.marriageType,
      },
    });

    // Notify both
    for (const uid of [user1Id, user2Id]) {
      await this.notificationsService.notifyUser(uid, {
        type: "MATCH_COMPLETED",
        payload: { conversationId },
      }, {
        title: "تم التوافق بنجاح! 💒",
        body: "تم إضافتكما لقسم قصص النجاح. نتمنى لكم التوفيق.",
        data: { conversationId },
      });
    }

    this.messagesGateway.emitCompatibleMatch(conversationId, {
      type: "compatible:completed",
      matchId,
    });

    return { status: "completed", matchId };
  }
}
