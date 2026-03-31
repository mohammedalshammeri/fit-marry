import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SuccessStoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Get public success stories (limited data: city + marriage type only) */
  async getPublicStories(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.successStory.findMany({
        where: { displayApproved: true },
        select: {
          id: true,
          city: true,
          marriageType: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.successStory.count({ where: { displayApproved: true } }),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  /** Get total count of success stories */
  async getCount() {
    const total = await this.prisma.successStory.count({ where: { displayApproved: true } });
    return { count: total };
  }

  // ─── Admin ────────────────────────────────────

  /** Admin: Get all success stories (with full data) */
  async getAllStories(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.successStory.findMany({
        include: {
          user1: { select: { id: true, email: true, profile: { select: { nickname: true } } } },
          user2: { select: { id: true, email: true, profile: { select: { nickname: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.successStory.count(),
    ]);

    return { items, total, page, pages: Math.ceil(total / limit) };
  }

  /** Admin: Approve/disapprove a success story for public display */
  async setDisplayApproval(storyId: string, approved: boolean) {
    await this.prisma.successStory.update({
      where: { id: storyId },
      data: { displayApproved: approved },
    });
    return { success: true };
  }
}
