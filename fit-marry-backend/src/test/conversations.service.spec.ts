import { ConversationsService } from "../conversations/conversations.service";
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

describe("ConversationsService", () => {
  const service = new ConversationsService(prismaMock as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when leaving non participant", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      participants: [{ id: "p-1", userId: "other", isActive: true }],
    } as any);

    await expect(
      service.leaveConversation("user-1", { conversationId: "conv-1", reason: "NOT_COMPATIBLE" })
    ).rejects.toThrow("Not a participant");
  });
});
