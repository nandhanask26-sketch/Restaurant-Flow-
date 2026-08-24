import { PaymentProvider, PaymentIntentResult, PaymentVerificationResult } from './PaymentProvider';
import { PaymentMethod, PaymentStatus } from '../../types';
import crypto from 'crypto';

export class MockPaymentProvider implements PaymentProvider {
  async createPaymentIntent(
    orderId: string,
    amount: number,
    method: PaymentMethod,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    customerDetails: { name: string; email: string; phone: string }
  ): Promise<PaymentIntentResult> {
    const txnPrefix = method === 'UPI' ? 'TXN_UPI' : method === 'CARD' ? 'TXN_CARD' : 'TXN_COD';
    const transactionId = `${txnPrefix}_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    // COD starts UNPAID, Online payments simulate instant verification or pending
    const initialStatus: PaymentStatus = method === 'CASH_ON_DELIVERY' ? 'UNPAID' : 'PAID';

    return {
      transactionId,
      amount,
      status: initialStatus,
      providerMetadata: {
        gateway: 'MockPaymentGateway',
        timestamp: new Date().toISOString(),
        method,
        simulatedSuccess: true,
      },
    };
  }

  async verifyPayment(
    transactionId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    verificationPayload?: any
  ): Promise<PaymentVerificationResult> {
    // In mock provider, if transaction ID starts with TXN, it verifies successfully
    const isValid = transactionId.startsWith('TXN_');
    return {
      isVerified: isValid,
      transactionId,
      amount: 0,
      status: isValid ? 'PAID' : 'FAILED',
      message: isValid ? 'Mock payment verified successfully' : 'Invalid transaction ID format',
    };
  }
}
