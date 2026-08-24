import { PaymentMethod, PaymentStatus } from '../../types';

export interface PaymentIntentResult {
  transactionId: string;
  amount: number;
  status: PaymentStatus;
  providerMetadata?: any;
}

export interface PaymentVerificationResult {
  isVerified: boolean;
  transactionId: string;
  amount: number;
  status: PaymentStatus;
  message: string;
}

export interface PaymentProvider {
  createPaymentIntent(
    orderId: string,
    amount: number,
    method: PaymentMethod,
    customerDetails: { name: string; email: string; phone: string }
  ): Promise<PaymentIntentResult>;

  verifyPayment(
    transactionId: string,
    verificationPayload?: any
  ): Promise<PaymentVerificationResult>;
}
