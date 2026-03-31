import { MatchingService } from "../matching/matching.service";
import { mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>();

describe("MatchingService", () => {
  const service = new MatchingService(prismaMock as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns empty list when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await service.getDiscovery("missing", { limit: 10 });

    expect(result.items).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});
