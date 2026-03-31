import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TopupWalletDto } from "./dto/topup-wallet.dto";

const TransactionType = {
  TOPUP: "TOPUP",
  PROFILE_CHANGE_FEE: "PROFILE_CHANGE_FEE",
  MINUTES_DEDUCT: "MINUTES_DEDUCT",
  REFERRAL_REWARD: "REFERRAL_REWARD",
  ADJUSTMENT: "ADJUSTMENT",
} as const;

const TransactionStatus = {
  PENDING: "PENDING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELED: "CANCELED",
} as const;

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      throw new NotFoundException("Wallet not found");
    }
    return wallet;
  }

  async topup(userId: string, dto: TopupWalletDto) {
    const wallet = await this.getWallet(userId);

    if (!dto.amount && !dto.minutes) {
      throw new BadRequestException("Amount or minutes is required");
    }

    const currency = dto.currency ?? wallet.currency;
    const minutes = dto.minutes ?? 0;
    const amount = dto.amount ?? null;

    return this.prisma.$transaction(async (tx: any) => {
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.TOPUP,
          amount,
          currency,
          minutes: minutes || null,
          status: TransactionStatus.COMPLETED,
        },
      });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceMinutes: { increment: minutes },
          remainingMinutes: { increment: minutes },
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  async deductMinutes(userId: string, minutes: number, metadata?: Record<string, unknown>) {
    if (minutes <= 0) {
      throw new BadRequestException("Minutes must be positive");
    }

    const wallet = await this.getWallet(userId);
    if (wallet.remainingMinutes < minutes) {
      throw new BadRequestException("Insufficient minutes");
    }

    return this.prisma.$transaction(async (tx: any) => {
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.MINUTES_DEDUCT,
          amount: null,
          currency: wallet.currency,
          minutes: -minutes,
          status: TransactionStatus.COMPLETED,
          metadata,
        },
      });

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          remainingMinutes: { decrement: minutes },
          usedMinutes: { increment: minutes },
        },
      });

      return { wallet: updatedWallet, transaction };
    });
  }

  async chargeProfileChangeFee(userId: string, amount: number) {
    const wallet = await this.getWallet(userId);
    const transaction = await this.prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: TransactionType.PROFILE_CHANGE_FEE,
        amount,
        currency: wallet.currency,
        status: TransactionStatus.COMPLETED,
      },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { profileRequiresRepayment: false },
    });

    return transaction;
  }

  private async getSettingValue(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? null;
  }
}
