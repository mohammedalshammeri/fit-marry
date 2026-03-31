import { CallsService } from "../calls/calls.service";
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

describe("CallsService", () => {
  const walletService = { deductMinutes: jest.fn() };
  const accessControlService = { ensureAccess: jest.fn().mockResolvedValue(true) };
  const configService = { get: jest.fn() };
  const service = new CallsService(prismaMock as any, walletService as any, accessControlService as any, configService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks start call if not participant", async () => {
    prismaMock.conversation.findUnique.mockResolvedValue({
      id: "conv-1",
      participants: [{ userId: "other" }],
    } as any);

    await expect(service.startCall("user-1", "conv-1")).rejects.toThrow("Not a participant");
  });
});
