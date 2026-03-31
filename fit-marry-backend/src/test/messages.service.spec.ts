import { MessagesService } from "../messages/messages.service";
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

describe("MessagesService", () => {
  const accessControlService = { ensureAccess: jest.fn().mockResolvedValue(true) };
  const notificationsService = { notifyUser: jest.fn() };
  const messagesGateway = { server: { to: jest.fn().mockReturnValue({ emit: jest.fn() }) } };
  const service = new MessagesService(prismaMock as any, accessControlService as any, notificationsService as any, messagesGateway as any);

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MEDIA_MAX_BYTES = "10";
  });

  it("rejects temp image larger than limit", async () => {
    prismaMock.setting.findUnique.mockResolvedValue({ value: 0 } as any);
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv",
      startedAt: new Date(0),
      participants: [{ userId: "user-1", isActive: true }],
    } as any);

    const payload = Buffer.from("x".repeat(50)).toString("base64");

    await expect(
      service.uploadTempImage("user-1", {
        conversationId: "conv",
        base64: payload,
        contentType: "image/jpeg",
      })
    ).rejects.toThrow("Image too large");
  });
});
