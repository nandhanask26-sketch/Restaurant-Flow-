import { ISmsProvider, SendOtpSmsOptions } from './SmsProvider';
import { env } from '../../config/env';

export class Fast2SmsProvider implements ISmsProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || env.FAST2SMS_API_KEY || '';
  }

  async sendLoginOtpSms(options: SendOtpSmsOptions): Promise<boolean> {
    const { phoneNumber, otp } = options;
    const cleanNumber = phoneNumber.replace(/\D/g, '').slice(-10);

    if (!this.apiKey) {
      return false;
    }

    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: cleanNumber,
        }),
      });

      const data = (await response.json()) as any;
      return Boolean(data && data.return === true);
    } catch (error) {
      console.error('❌ [FAST2SMS DISPATCH ERROR]', error);
      return false;
    }
  }

  async sendSecurityOtpSms(options: SendOtpSmsOptions): Promise<boolean> {
    return this.sendLoginOtpSms(options);
  }
}
