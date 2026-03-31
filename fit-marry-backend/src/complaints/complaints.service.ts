import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateComplaintDto } from "./dto/create-complaint.dto";

@Injectable()
export class ComplaintsService {
  constructor(private readonly prisma: PrismaService) {}

  async createComplaint(userId: string, dto: CreateComplaintDto) {
    if (dto.reportedUserId === userId) {
      throw new BadRequestException("Cannot report yourself");
    }

    const reportedUser = await this.prisma.user.findUnique({ where: { id: dto.reportedUserId } });
    if (!reportedUser) {
      throw new NotFoundException("Reported user not found");
    }

    if (dto.conversationId) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: dto.conversationId },
        include: { participants: true },
      });

      if (!conversation) {
        throw new NotFoundException("Conversation not found");
      }

      const isParticipant = conversation.participants.some((p: any) => p.userId === userId);
      if (!isParticipant) {
        throw new BadRequestException("Not a conversation participant");
      }
    }

    const complaint = await this.prisma.complaint.create({
      data: {
        reporterId: userId,
        reportedUserId: dto.reportedUserId,
        conversationId: dto.conversationId,
        category: dto.category,
        text: dto.text,
      },
    });

    if (dto.attachmentUrl) {
      await this.prisma.complaintAttachment.create({
        data: {
          complaintId: complaint.id,
          publicId: "user-attachment",
          url: dto.attachmentUrl,
          resourceType: "image",
        },
      });
    }

    return complaint;
  }

  async listMyComplaints(userId: string) {
    return this.prisma.complaint.findMany({
      where: { reporterId: userId },
      orderBy: { createdAt: "desc" },
      include: { attachments: true },
    });
  }
}
