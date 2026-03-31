import { ContactExchangeStatus, PrismaClient } from '@prisma/client';
import { mockDeep } from 'jest-mock-extended';
import { BadRequestException } from '@nestjs/common';
import { CompatibleMatchService } from '../conversations/compatible-match.service';

const prismaMock = mockDeep<PrismaClient>();
const notificationsService = { notifyUser: jest.fn().mockResolvedValue(undefined) };
const messagesGateway = { emitCompatibleMatch: jest.fn() };

describe('CompatibleMatchService', () => {
  const service = new CompatibleMatchService(prismaMock as any, notificationsService as any, messagesGateway as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a pending contact exchange request after mutual compatibility', async () => {
    mockConversationMembership('user-1', 'user-2', 'conv-1');
    prismaMock.compatibleMatch.findUnique
      .mockResolvedValueOnce(buildMatch())
      .mockResolvedValueOnce(buildMatch());
    prismaMock.compatibleMatch.update.mockResolvedValue(buildMatch({
      contactExchangeStatus: ContactExchangeStatus.PENDING,
      contactExchangeRequestedById: 'user-1',
      contactExchangeRequestedAt: new Date('2026-03-31T10:00:00.000Z'),
      contactExchangeExpiresAt: new Date('2026-04-03T10:00:00.000Z'),
    }) as any);

    const result = await service.requestContactExchange('user-1', 'conv-1');

    expect(result.status).toBe('contact_request_pending');
    expect(prismaMock.compatibleMatch.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }),
    }));
    expect(notificationsService.notifyUser).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({ type: 'CONTACT_EXCHANGE_REQUEST' }),
      expect.any(Object),
    );
  });

  it('approves a pending contact exchange request when the other user responds', async () => {
    mockConversationMembership('user-2', 'user-1', 'conv-1');
    prismaMock.compatibleMatch.findUnique
      .mockResolvedValueOnce(buildMatch({
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }))
      .mockResolvedValueOnce(buildMatch({
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }));
    prismaMock.compatibleMatch.update.mockResolvedValue(buildMatch({
      contactExchangeStatus: ContactExchangeStatus.APPROVED,
      contactExchangeRequestedById: 'user-1',
      contactExchangeRespondedAt: new Date('2026-03-31T12:00:00.000Z'),
    }) as any);

    const result = await service.requestContactExchange('user-2', 'conv-1');

    expect(result).toEqual(expect.objectContaining({
      status: 'contact_request_approved',
      canExchangeContacts: true,
    }));
    expect(notificationsService.notifyUser).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ type: 'CONTACT_EXCHANGE_APPROVED' }),
      expect.any(Object),
    );
  });

  it('rejects a pending contact exchange request when the recipient declines', async () => {
    mockConversationMembership('user-2', 'user-1', 'conv-2');
    prismaMock.compatibleMatch.findUnique
      .mockResolvedValueOnce(buildMatch({
        id: 'match-2',
        conversationId: 'conv-2',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }))
      .mockResolvedValueOnce(buildMatch({
        id: 'match-2',
        conversationId: 'conv-2',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }));

    const result = await service.rejectContactExchange('user-2', 'conv-2');

    expect(result.status).toBe('contact_request_rejected');
    expect(prismaMock.compatibleMatch.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contactExchangeStatus: ContactExchangeStatus.REJECTED,
      }),
    }));
  });

  it('cancels a pending contact exchange request for the requester', async () => {
    mockConversationMembership('user-1', 'user-2', 'conv-3');
    prismaMock.compatibleMatch.findUnique
      .mockResolvedValueOnce(buildMatch({
        id: 'match-3',
        conversationId: 'conv-3',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }))
      .mockResolvedValueOnce(buildMatch({
        id: 'match-3',
        conversationId: 'conv-3',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }));

    const result = await service.cancelContactExchange('user-1', 'conv-3');

    expect(result.status).toBe('contact_request_cancelled');
    expect(prismaMock.compatibleMatch.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contactExchangeStatus: ContactExchangeStatus.CANCELLED,
      }),
    }));
  });

  it('marks pending requests as expired when reading status after expiry', async () => {
    mockConversationMembership('user-1', 'user-2', 'conv-4');
    prismaMock.compatibleMatch.findUnique
      .mockResolvedValueOnce(buildMatch({
        id: 'match-4',
        conversationId: 'conv-4',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-2',
        contactExchangeExpiresAt: new Date('2026-03-30T09:00:00.000Z'),
      }))
      .mockResolvedValueOnce(buildMatch({
        id: 'match-4',
        conversationId: 'conv-4',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-2',
        contactExchangeExpiresAt: new Date('2026-03-30T09:00:00.000Z'),
      }));
    prismaMock.compatibleMatch.update.mockResolvedValue(buildMatch({
      id: 'match-4',
      conversationId: 'conv-4',
      contactExchangeStatus: ContactExchangeStatus.EXPIRED,
      contactExchangeRequestedById: 'user-2',
      contactExchangeExpiresAt: new Date('2026-03-30T09:00:00.000Z'),
      contactExchangeRespondedAt: new Date('2026-03-31T09:00:00.000Z'),
    }) as any);

    const result = await service.getMatchStatus('user-1', 'conv-4');

    expect(result).toEqual(expect.objectContaining({
      status: 'contact_request_expired',
      theirContactRequestSent: false,
      canExchangeContacts: false,
    }));
    expect(prismaMock.compatibleMatch.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        contactExchangeStatus: ContactExchangeStatus.EXPIRED,
      }),
    }));
  });

  it('blocks the requester from rejecting their own contact exchange request', async () => {
    mockConversationMembership('user-1', 'user-2', 'conv-5');
    prismaMock.compatibleMatch.findUnique
      .mockResolvedValueOnce(buildMatch({
        id: 'match-5',
        conversationId: 'conv-5',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }))
      .mockResolvedValueOnce(buildMatch({
        id: 'match-5',
        conversationId: 'conv-5',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }));

    await expect(service.rejectContactExchange('user-1', 'conv-5')).rejects.toThrow(BadRequestException);
    expect(prismaMock.compatibleMatch.update).not.toHaveBeenCalled();
  });

  it('blocks non-requesters from cancelling the contact exchange request', async () => {
    mockConversationMembership('user-2', 'user-1', 'conv-6');
    prismaMock.compatibleMatch.findUnique
      .mockResolvedValueOnce(buildMatch({
        id: 'match-6',
        conversationId: 'conv-6',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }))
      .mockResolvedValueOnce(buildMatch({
        id: 'match-6',
        conversationId: 'conv-6',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }));

    await expect(service.cancelContactExchange('user-2', 'conv-6')).rejects.toThrow(BadRequestException);
    expect(prismaMock.compatibleMatch.update).not.toHaveBeenCalled();
  });

  it('prevents adding contact info before approval', async () => {
    mockConversationMembership('user-1', 'user-2', 'conv-7');
    prismaMock.compatibleMatch.findUnique
      .mockResolvedValueOnce(buildMatch({
        id: 'match-7',
        conversationId: 'conv-7',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }))
      .mockResolvedValueOnce(buildMatch({
        id: 'match-7',
        conversationId: 'conv-7',
        contactExchangeStatus: ContactExchangeStatus.PENDING,
        contactExchangeRequestedById: 'user-1',
      }));

    await expect(service.addContactInfo('user-1', 'conv-7', 'telegram:@fitmarry')).rejects.toThrow(BadRequestException);
    expect(prismaMock.compatibleMatch.update).not.toHaveBeenCalled();
  });
});

function mockConversationMembership(userId: string, otherUserId: string, conversationId: string) {
  prismaMock.conversationParticipant.findFirst
    .mockResolvedValueOnce({ conversationId, userId, isActive: true } as any)
    .mockResolvedValueOnce({ conversationId, userId: otherUserId, isActive: true } as any);
}

function buildMatch(overrides: Partial<any> = {}) {
  return {
    id: 'match-1',
    user1Id: 'user-1',
    user2Id: 'user-2',
    conversationId: 'conv-1',
    user1Confirmed: true,
    user2Confirmed: true,
    user1ContactInfo: null,
    user2ContactInfo: null,
    contactExchangeStatus: ContactExchangeStatus.NONE,
    contactExchangeRequestedById: null,
    contactExchangeRequestedAt: null,
    contactExchangeRespondedAt: null,
    contactExchangeExpiresAt: null,
    completedAt: null,
    createdAt: new Date('2026-03-31T08:00:00.000Z'),
    ...overrides,
  };
}