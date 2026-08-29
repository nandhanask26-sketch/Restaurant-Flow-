import { ISmsProvider, SendOtpSmsOptions } from './SmsProvider';
import { env } from '../../config/env';

export class TwilioSmsProvider implements ISmsProvider {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid?: string, authToken?: string, fromNumber?: string) {
    this.accountSid = accountSid || env.TWILIO_ACCOUNT_SID || '';
    this.authToken = authToken || env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = fromNumber || env.TWILIO_PHONE_NUMBER || '';
  }

  async sendLoginOtpSms(options: SendOtpSmsOptions): Promise<boolean> {
    const { phoneNumber, otp, expiryMinutes = 5 } = options;
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return false;
    }

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const body = new URLSearchParams({
        To: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
        From: this.fromNumber,
        Body: `RestaurantFlow: Your login verification code is ${otp}. Valid for ${expiryMinutes} minutes. Do not share with anyone.`,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('❌ [TWILIO DISPATCH ERROR]', error);
      return false;
    }
  }

  async sendSecurityOtpSms(options: SendOtpSmsOptions): Promise<boolean> {
    const { phoneNumber, otp, expiryMinutes = 5 } = options;
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return false;
    }

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const body = new URLSearchParams({
        To: phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`,
        From: this.fromNumber,
        Body: `RestaurantFlow Security: Your password verification OTP is ${otp}. Valid for ${expiryMinutes} minutes.`,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('❌ [TWILIO SECURITY DISPATCH ERROR]', error);
      return false;
    }
  }
}
