import nodemailer from 'nodemailer';
import { IEmailProvider, SendOtpEmailOptions } from './EmailProvider';
import { env } from '../../config/env';

export class NodemailerEmailProvider implements IEmailProvider {
  private transporter: nodemailer.Transporter | null = null;

  private async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    // In test environment, always use instant local JSON transport
    if (env.NODE_ENV === 'test') {
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return this.transporter;
    }

    // 1. Direct High-Speed Gmail Configuration with SSL Connection Pooling
    if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true, // Direct SSL handshake for ultra-low latency
        pool: true, // Keep socket pool warm for instant sub-second delivery
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 10,
        auth: {
          user: env.GMAIL_USER.trim(),
          pass: env.GMAIL_APP_PASSWORD.replace(/\s+/g, ''),
        },
      });
      return this.transporter;
    }

    // 2. Custom SMTP Configuration
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT || '587', 10),
        secure: env.SMTP_SECURE === 'true',
        pool: true,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      return this.transporter;
    }

    // 3. Test & Local Development fallback (instant JSON transport)
    this.transporter = nodemailer.createTransport({
      jsonTransport: true,
    });

    return this.transporter;
  }

  async sendLoginOtpEmail(options: SendOtpEmailOptions): Promise<boolean> {
    try {
      const { toEmail, fullName, otp, expiryMinutes = 5 } = options;
      const transporter = await this.getTransporter();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B1120; color: #E2E8F0; margin: 0; padding: 24px; }
            .card { max-width: 500px; margin: 0 auto; background: #0F172A; border: 1px solid #1E293B; border-radius: 20px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .logo { font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
            .brand-highlight { color: #10B981; }
            .title { font-size: 18px; font-weight: 700; color: #F8FAFC; margin-bottom: 8px; }
            .desc { font-size: 13px; color: #94A3B8; line-height: 1.6; margin-bottom: 24px; }
            .code-box { background: #020617; border: 2px dashed #10B981; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 24px; }
            .code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #34D399; font-family: monospace; }
            .footer { font-size: 11px; color: #64748B; border-top: 1px solid #1E293B; padding-top: 16px; margin-top: 24px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">🍴 Restaurant<span class="brand-highlight">Flow</span> Smart Ordering</div>
            <div class="title">🔐 Your One-Time Login Verification Code</div>
            <p class="desc">Hello <strong>${fullName || 'Customer'}</strong>,<br/>Welcome back to RestaurantFlow! Use the 6-digit verification code below to sign in securely to your account:</p>
            <div class="code-box">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Your 6-Digit Verification Code</div>
              <div class="code">${otp}</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 6px;">Valid for ${expiryMinutes} minutes • Do not share with anyone</div>
            </div>
            <p class="desc" style="font-size: 12px; margin-bottom: 0;">If you did not request this login code, you can safely ignore this email.</p>
            <div class="footer">
              © ${new Date().getFullYear()} RestaurantFlow Inc. • Contactless Cafeteria & Restaurant Management
            </div>
          </div>
        </body>
        </html>
      `;

      const fromAddress = env.GMAIL_USER
        ? `"RestaurantFlow Login" <${env.GMAIL_USER}>`
        : env.EMAIL_FROM || '"RestaurantFlow Login" <login@restaurantflow.com>';

      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `🔐 ${otp} is your RestaurantFlow Login Verification Code`,
        text: `Your RestaurantFlow login verification code is: ${otp}. This code expires in ${expiryMinutes} minutes.`,
        html: htmlContent,
        headers: {
          'X-Priority': '1 (Highest)',
          'X-MSMail-Priority': 'High',
          'Importance': 'High',
        },
      });

      console.log(`✅ [GMAIL SMTP SENT] To: ${toEmail} | Message ID: ${info.messageId}`);
      if (info.response) {
        console.log(`   SMTP Server Response: ${info.response}`);
      }

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`📧 [ETHEREAL INBOX PREVIEW]: ${previewUrl}`);
      }

      return true;
    } catch (error) {
      console.error('❌ [EMAIL DISPATCH ERROR]', error);
      return false;
    }
  }

  async sendSecurityOtpEmail(options: SendOtpEmailOptions): Promise<boolean> {
    try {
      const { toEmail, fullName, otp, expiryMinutes = 5 } = options;
      const transporter = await this.getTransporter();

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0B1120; color: #E2E8F0; margin: 0; padding: 24px; }
            .card { max-width: 500px; margin: 0 auto; background: #0F172A; border: 1px solid #1E293B; border-radius: 20px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .logo { font-size: 20px; font-weight: 800; color: #FFFFFF; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }
            .brand-highlight { color: #10B981; }
            .title { font-size: 18px; font-weight: 700; color: #F8FAFC; margin-bottom: 8px; }
            .desc { font-size: 13px; color: #94A3B8; line-height: 1.6; margin-bottom: 24px; }
            .code-box { background: #020617; border: 2px dashed #10B981; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 24px; }
            .code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #34D399; font-family: monospace; }
            .footer { font-size: 11px; color: #64748B; border-top: 1px solid #1E293B; padding-top: 16px; margin-top: 24px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">🍴 Restaurant<span class="brand-highlight">Flow</span> Smart Ordering</div>
            <div class="title">🔐 Account Password Security Verification</div>
            <p class="desc">Hello <strong>${fullName || 'Customer'}</strong>,<br/>You requested to verify or update your account password. Use the single-use 6-digit verification code below to verify your identity:</p>
            <div class="code-box">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Your 6-Digit Security OTP</div>
              <div class="code">${otp}</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 6px;">Valid for ${expiryMinutes} minutes • Do not share with anyone</div>
            </div>
            <p class="desc" style="font-size: 12px; margin-bottom: 0;">If you did not request this security code, please check your account immediately.</p>
            <div class="footer">
              © ${new Date().getFullYear()} RestaurantFlow Inc. • Contactless Cafeteria & Restaurant Management
            </div>
          </div>
        </body>
        </html>
      `;

      const fromAddress = env.GMAIL_USER
        ? `"RestaurantFlow Security" <${env.GMAIL_USER}>`
        : env.EMAIL_FROM || '"RestaurantFlow Security" <security@restaurantflow.com>';

      await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `🔐 ${otp} is your RestaurantFlow Password Security Code`,
        text: `Your RestaurantFlow password security verification code is: ${otp}. This code expires in ${expiryMinutes} minutes.`,
        html: htmlContent,
      });

      return true;
    } catch (error) {
      console.error('❌ [EMAIL DISPATCH ERROR]', error);
      return false;
    }
  }
}

export const emailProvider = new NodemailerEmailProvider();
