import { ISmsProvider, SendOtpSmsOptions } from './SmsProvider';
import { Fast2SmsProvider } from './Fast2SmsProvider';
import { TwilioSmsProvider } from './TwilioSmsProvider';
import { env } from '../../config/env';

class DevMockSmsProvider implements ISmsProvider {
  async sendLoginOtpSms(options: SendOtpSmsOptions): Promise<boolean> {
    if (env.NODE_ENV === 'development') {
      console.log(`📱 [DEV SMS DISPATCH] Login OTP ${options.otp} dispatched to ${options.phoneNumber}`);
    }
    return true;
  }

  async sendSecurityOtpSms(options: SendOtpSmsOptions): Promise<boolean> {
    if (env.NODE_ENV === 'development') {
      console.log(`📱 [DEV SMS DISPATCH] Security OTP ${options.otp} dispatched to ${options.phoneNumber}`);
    }
    return true;
  }
}

export class SmsProviderFactory {
  static getProvider(): ISmsProvider {
    if (env.FAST2SMS_API_KEY) {
      return new Fast2SmsProvider();
    }
    if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
      return new TwilioSmsProvider();
    }
    return new DevMockSmsProvider();
  }
}

export const smsProvider = SmsProviderFactory.getProvider();
