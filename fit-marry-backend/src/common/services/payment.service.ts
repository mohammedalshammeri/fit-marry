import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private stripe: Stripe | null = null;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: '2025-03-31.basil' as any });
    } else {
      this.logger.warn('Stripe not configured - payments will be mocked');
    }
  }

  get isConfigured(): boolean {
    return this.stripe !== null;
  }

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    userId: string;
    packageId: string;
    packageName: string;
  }): Promise<{ clientSecret: string; paymentIntentId: string } | { mock: true }> {
    if (!this.stripe) {
      this.logger.warn('Mock payment: Stripe not configured');
      return { mock: true };
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Stripe uses cents
      currency: params.currency.toLowerCase(),
      metadata: {
        userId: params.userId,
        packageId: params.packageId,
        packageName: params.packageName,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  async verifyPayment(paymentIntentId: string): Promise<{
    success: boolean;
    userId?: string;
    packageId?: string;
  }> {
    if (!this.stripe) {
      return { success: true };
    }

    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        userId: paymentIntent.metadata.userId,
        packageId: paymentIntent.metadata.packageId,
      };
    }

    return { success: false };
  }

  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event | null {
    if (!this.stripe) return null;

    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) return null;

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error('Webhook signature verification failed', err);
      return null;
    }
  }

  async createSubscription(params: {
    customerId: string;
    priceAmount: number;
    currency: string;
    intervalDays: number;
    userId: string;
    packageId: string;
  }): Promise<{ subscriptionId: string; clientSecret?: string } | { mock: true }> {
    if (!this.stripe) {
      return { mock: true };
    }

    // Create a recurring price
    const interval = params.intervalDays >= 365 ? 'year' : 'month';
    const price = await this.stripe.prices.create({
      unit_amount: Math.round(params.priceAmount * 100),
      currency: params.currency.toLowerCase(),
      recurring: { interval },
      product_data: { name: `FitMarry Package ${params.packageId}` },
    });

    const subscription = await this.stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: params.userId, packageId: params.packageId },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    const paymentIntent = (invoice as any)?.payment_intent as Stripe.PaymentIntent | undefined;

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret ?? undefined,
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (!this.stripe) return true;
    try {
      await this.stripe.subscriptions.cancel(subscriptionId);
      return true;
    } catch (err) {
      this.logger.error('Failed to cancel Stripe subscription', err);
      return false;
    }
  }

  async createOrGetCustomer(email: string, userId: string): Promise<string> {
    if (!this.stripe) return 'mock_customer';

    const existing = await this.stripe.customers.list({ email, limit: 1 });
    if (existing.data.length > 0) {
      return existing.data[0].id;
    }

    const customer = await this.stripe.customers.create({
      email,
      metadata: { userId },
    });
    return customer.id;
  }

  async issueRefund(paymentIntentId: string, amountCents?: number): Promise<{ refundId: string } | { mock: true }> {
    if (!this.stripe) return { mock: true };

    const refund = await this.stripe.refunds.create({
      payment_intent: paymentIntentId,
      ...(amountCents ? { amount: amountCents } : {}),
    });

    return { refundId: refund.id };
  }
}
