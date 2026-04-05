import { LikesService } from "../likes/likes.service";
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

describe("LikesService", () => {
  const accessControlService = { ensureAccess: jest.fn().mockResolvedValue(true) };
  const notificationsService = { notifyUser: jest.fn() };
  const service = new LikesService(prismaMock as any, accessControlService as any, notificationsService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks like when inbound cap reached", async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce({ id: "user-1", marriageType: "PERMANENT" } as any)
      .mockResolvedValueOnce({ id: "user-2", marriageType: "PERMANENT" } as any);
    prismaMock.setting.findUnique.mockResolvedValue({ value: 1 } as any);
    prismaMock.like.count.mockResolvedValue(1);

    await expect(
      service.createLike("user-1", { toUserId: "user-2" })
    ).rejects.toThrow("User has reached inbound likes limit");
  });
});
