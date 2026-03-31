import { PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { ProfilesService } from '../profiles/profiles.service';

const prismaMock = mockDeep<PrismaClient>();
const referralsService = { verifyReferral: jest.fn().mockResolvedValue(undefined) };

describe('ProfilesService', () => {
  const service = new ProfilesService(prismaMock as any, referralsService as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not expose guardian sensitive fields in the public profile payload', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      marriageType: 'PERMANENT',
      profile: {
        nickname: 'Sara',
        avatarUrl: '/avatar.jpg',
        guardianName: 'Guardian Name',
        guardianRelation: 'Brother',
        guardianContact: '+966500000000',
        photos: [],
      },
    } as any);

    const result = await service.getPublicProfile(null, 'user-1');
    const publicResult = result as any;

    expect(result.guardianAvailable).toBe(true);
    expect(result.guardianRelation).toBe('Brother');
    expect(publicResult.profile).toBeDefined();
    expect(publicResult.profile).not.toHaveProperty('guardianName');
    expect(publicResult.profile).not.toHaveProperty('guardianContact');
  });
});