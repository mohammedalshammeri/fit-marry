import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { WalletService } from "./wallet.service";
import { TopupWalletDto } from "./dto/topup-wallet.dto";

@ApiTags("wallet")
@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getWallet(@CurrentUser() user: { userId: string }) {
    return this.walletService.getWallet(user.userId);
  }

  @Post("topup")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  topup(@CurrentUser() user: { userId: string }, @Body() dto: TopupWalletDto) {
    return this.walletService.topup(user.userId, dto);
  }
}
