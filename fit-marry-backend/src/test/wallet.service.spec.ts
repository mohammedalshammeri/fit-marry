import { WalletService } from "../wallet/wallet.service";
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

describe("WalletService", () => {
  const service = new WalletService(prismaMock as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects deduct when insufficient minutes", async () => {
    prismaMock.wallet.findUnique.mockResolvedValue({
      id: "wallet-1",
      userId: "user-1",
      remainingMinutes: 2,
      currency: "USD",
    } as any);

    await expect(service.deductMinutes("user-1", 5)).rejects.toThrow("Insufficient minutes");
  });
});
