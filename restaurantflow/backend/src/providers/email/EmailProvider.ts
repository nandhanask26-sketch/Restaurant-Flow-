export interface SendOtpEmailOptions {
  toEmail: string;
  fullName: string;
  otp: string;
  expiryMinutes?: number;
}

export interface IEmailProvider {
  sendLoginOtpEmail(options: SendOtpEmailOptions): Promise<boolean>;
  sendSecurityOtpEmail(options: SendOtpEmailOptions): Promise<boolean>;
}
