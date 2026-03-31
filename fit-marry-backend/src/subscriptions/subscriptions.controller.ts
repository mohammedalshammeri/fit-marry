import { Controller, Get, Param, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { InvoiceService } from '../common/services/invoice.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Get('packages')
  async getPackages() {
    return this.subscriptionsService.getPackages();
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  async subscribe(@Request() req: any, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.subscribe(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('confirm-payment')
  async confirmPayment(
    @Request() req: any,
    @Body() dto: { paymentIntentId: string; packageId: string },
  ) {
    return this.subscriptionsService.confirmPayment(req.user.id, dto.paymentIntentId, dto.packageId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-subscription')
  async mySubscription(@Request() req: any) {
    return this.subscriptionsService.getMySubscription(req.user.id);
  }
  
  @UseGuards(JwtAuthGuard)
  @Post('unsubscribe')
  async unsubscribe(@Request() req: any) {
      return this.subscriptionsService.unsubscribe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices')
  async getInvoices(@Request() req: any) {
    return this.invoiceService.getInvoicesForUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('invoices/:subscriptionId')
  async getInvoice(@Request() req: any, @Param('subscriptionId') subscriptionId: string) {
    return this.invoiceService.generateInvoice(subscriptionId);
  }
}
