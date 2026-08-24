import nodemailer from 'nodemailer';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static async getTransporter(): Promise<nodemailer.Transporter> {
    if (this.transporter) return this.transporter;

    // Check if direct Gmail is configured
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });
      return this.transporter;
    }

    // Check if custom SMTP is configured in environment
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      return this.transporter;
    }

    // Create ethereal test SMTP or direct transport fallback
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      // Direct console / json transporter fallback
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }

    return this.transporter;
  }

  static async sendSecurityOtpEmail(
    toEmail: string,
    fullName: string,
    code: string
  ): Promise<{ previewUrl?: string; messageId?: string }> {
    try {
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
            <p class="desc">Hello <strong>${fullName || 'Customer'}</strong>,<br/>You requested to access or update your account password. Use the single-use 6-digit verification code below to verify your identity:</p>
            <div class="code-box">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Your 6-Digit Security OTP</div>
              <div class="code">${code}</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 6px;">Valid for 5 minutes • Do not share with anyone</div>
            </div>
            <p class="desc" style="font-size: 12px; margin-bottom: 0;">If you did not request this security code, please ignore this email or log in to secure your account immediately.</p>
            <div class="footer">
              © ${new Date().getFullYear()} RestaurantFlow Inc. All rights reserved. • Contactless Cafeteria & Restaurant Management System
            </div>
          </div>
        </body>
        </html>
      `;

      const info = await transporter.sendMail({
        from: '"RestaurantFlow Security" <security@restaurantflow.com>',
        to: toEmail,
        subject: `🔐 ${code} is your RestaurantFlow Password Security Code`,
        text: `Your RestaurantFlow password security verification code is: ${code}. This code expires in 5 minutes.`,
        html: htmlContent,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.log(`[EMAIL DISPATCH SUCCESS] Verification OTP ${code} sent to ${toEmail}. Message ID: ${info.messageId}`);
      if (previewUrl) {
        console.log(`[ETHEREAL INBOX PREVIEW]: ${previewUrl}`);
      }

      return { previewUrl, messageId: info.messageId };
    } catch (error) {
      console.error('[EMAIL DISPATCH ERROR]', error);
      return {};
    }
  }

  static async sendLoginOtpEmail(
    toEmail: string,
    fullName: string,
    code: string
  ): Promise<{ previewUrl?: string; messageId?: string }> {
    try {
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
            <p class="desc">Hello <strong>${fullName || 'Customer'}</strong>,<br/>Welcome back to RestaurantFlow! Use the 6-digit verification code below to sign in instantly to your account:</p>
            <div class="code-box">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Your Login Verification Code</div>
              <div class="code">${code}</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 6px;">Valid for 5 minutes • Instant Sign-In</div>
            </div>
            <p class="desc" style="font-size: 12px; margin-bottom: 0;">If you did not request this login code, you can safely ignore this email.</p>
            <div class="footer">
              © ${new Date().getFullYear()} RestaurantFlow Inc. • Contactless Cafeteria & Restaurant Management
            </div>
          </div>
        </body>
        </html>
      `;

      const info = await transporter.sendMail({
        from: '"RestaurantFlow Login" <login@restaurantflow.com>',
        to: toEmail,
        subject: `🔐 ${code} is your RestaurantFlow Login Verification Code`,
        text: `Your RestaurantFlow login verification code is: ${code}. This code expires in 5 minutes.`,
        html: htmlContent,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      console.log(`[EMAIL DISPATCH SUCCESS] Login OTP ${code} sent to ${toEmail}. Message ID: ${info.messageId}`);
      if (previewUrl) {
        console.log(`[ETHEREAL INBOX PREVIEW]: ${previewUrl}`);
      }

      return { previewUrl, messageId: info.messageId };
    } catch (error) {
      console.error('[EMAIL DISPATCH ERROR]', error);
      return {};
    }
  }
}
