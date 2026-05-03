export type PaymentMethodOption = 'cash_on_delivery' | 'card' | 'wallet';

export type PaymentSession = {
  transactionId: string;
  redirectUrl: string;
  provider: string;
};

export type PaymentResult = {
  success: boolean;
  transactionId: string;
  paidAmount?: number;
  message?: string;
};

export interface PaymentProvider {
  createPayment(amount: number, orderId: string, customerPhone: string): Promise<PaymentSession>;
  verifyPayment(transactionId: string): Promise<PaymentResult>;
}

export class PaymobProvider implements PaymentProvider {
  private apiKey = import.meta.env.VITE_PAYMOB_API_KEY || '';
  private iframeId = import.meta.env.VITE_PAYMOB_IFRAME_ID || '';
  private integrationId = import.meta.env.VITE_PAYMOB_INTEGRATION_ID || '';

  get configured() {
    return Boolean(this.apiKey && this.iframeId && this.integrationId);
  }

  async createPayment(amount: number, orderId: string, customerPhone: string): Promise<PaymentSession> {
    if (!this.configured) throw new Error('Paymob is not configured');

    const auth = await fetch('https://accept.paymob.com/api/auth/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: this.apiKey }),
    }).then((response) => response.json());

    const order = await fetch('https://accept.paymob.com/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: auth.token,
        delivery_needed: false,
        amount_cents: Math.round(amount * 100),
        currency: 'EGP',
        merchant_order_id: orderId,
        items: [],
      }),
    }).then((response) => response.json());

    const paymentKey = await fetch('https://accept.paymob.com/api/acceptance/payment_keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: auth.token,
        amount_cents: Math.round(amount * 100),
        expiration: 3600,
        order_id: order.id,
        billing_data: {
          apartment: 'NA',
          email: `phone${customerPhone.replace(/\D/g, '')}@${import.meta.env.VITE_INTERNAL_EMAIL_DOMAIN || 'market.local'}`,
          floor: 'NA',
          first_name: customerPhone,
          street: 'NA',
          building: 'NA',
          phone_number: customerPhone,
          shipping_method: 'NA',
          postal_code: 'NA',
          city: 'Cairo',
          country: 'EG',
          last_name: 'Customer',
          state: 'Cairo',
        },
        currency: 'EGP',
        integration_id: Number(this.integrationId),
      }),
    }).then((response) => response.json());

    return {
      transactionId: String(order.id),
      redirectUrl: `https://accept.paymob.com/api/acceptance/iframes/${this.iframeId}?payment_token=${paymentKey.token}`,
      provider: 'paymob',
    };
  }

  async verifyPayment(transactionId: string): Promise<PaymentResult> {
    if (!this.configured) return { success: false, transactionId, message: 'Paymob is not configured' };
    return { success: true, transactionId, message: 'Verify this transaction from Paymob callback payload or server-side webhook.' };
  }
}

export const paymentProvider = new PaymobProvider();
