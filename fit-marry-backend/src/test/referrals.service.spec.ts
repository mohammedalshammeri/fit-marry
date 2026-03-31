import { ReferralsService } from "../referrals/referrals.service";
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

describe("ReferralsService", () => {
  const service = new ReferralsService(prismaMock as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks self referral", async () => {
    prismaMock.referral.findUnique.mockResolvedValue({ id: "ref-1", userId: "user-1" } as any);

    await expect(service.invite("user-1", "CODE")).rejects.toThrow("Self referral not allowed");
  });
});
