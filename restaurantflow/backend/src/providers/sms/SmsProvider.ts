export interface SendOtpSmsOptions {
  phoneNumber: string;
  otp: string;
  expiryMinutes?: number;
}

export interface ISmsProvider {
  sendLoginOtpSms(options: SendOtpSmsOptions): Promise<boolean>;
  sendSecurityOtpSms(options: SendOtpSmsOptions): Promise<boolean>;
}
