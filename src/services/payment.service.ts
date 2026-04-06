export interface PaymentIntentData {
  amount: number;
  currency: string;
  campaignId: string;
  donorEmail: string;
  donorName: string;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export const paymentService = {
  async createPaymentIntent(data: PaymentIntentData): Promise<PaymentIntentResponse> {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create payment intent');
    }

    return await response.json();
  },

  getStripePublishableKey(): string {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      throw new Error('Stripe publishable key not configured');
    }
    return key;
  },
};
