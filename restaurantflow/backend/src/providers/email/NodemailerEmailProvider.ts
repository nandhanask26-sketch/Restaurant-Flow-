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

    const gmailUser = (env.GMAIL_USER || 'nandhanask26@gmail.com').trim();
    const gmailPass = (env.GMAIL_APP_PASSWORD || 'huefqczeusvdbsed').replace(/\s+/g, '');

    if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 5000,
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });
      return this.transporter;
    }

    // Custom SMTP Configuration
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT || '587', 10),
        secure: env.SMTP_SECURE === 'true',
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 5000,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      jsonTransport: true,
    });

    return this.transporter;
  }

  private async sendViaSmtpTransport(
    port: number,
    secure: boolean,
    mailOptions: {
      from: string;
      replyTo: string;
      to: string;
      subject: string;
      text: string;
      html: string;
    }
  ): Promise<boolean> {
    const gmailUser = (env.GMAIL_USER || 'nandhanask26@gmail.com').trim();
    const gmailPass = (env.GMAIL_APP_PASSWORD || 'huefqczeusvdbsed').replace(/\s+/g, '');

    if (!gmailUser || !gmailPass) return false;

    return new Promise((resolve) => {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port,
          secure,
          connectionTimeout: 4000,
          greetingTimeout: 4000,
          socketTimeout: 5000,
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        transporter.sendMail(
          {
            ...mailOptions,
            headers: {
              'X-Priority': '1 (Highest)',
              'X-MSMail-Priority': 'High',
              Importance: 'High',
            },
          },
          (err, info) => {
            if (err) {
              console.warn(`⚠️ [Gmail SMTP Port ${port} Failed]:`, err.message);
              resolve(false);
            } else {
              console.log(`✅ [Gmail SMTP Port ${port} SENT] To: ${mailOptions.to} | ID: ${info?.messageId}`);
              resolve(true);
            }
          }
        );
      } catch (e: any) {
        console.warn(`⚠️ [Gmail SMTP Port ${port} Exception]:`, e.message);
        resolve(false);
      }
    });
  }

  async sendLoginOtpEmail(options: SendOtpEmailOptions): Promise<boolean> {
    try {
      const { toEmail, fullName, otp, expiryMinutes = 5 } = options;

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
            <div class="logo">🍴 Nalan's <span class="brand-highlight">Mess</span> • Smart Ordering</div>
            <div class="title">🔐 Your One-Time Login Verification Code</div>
            <p class="desc">Hello <strong>${fullName || 'Customer'}</strong>,<br/>Welcome back to Nalan's Mess! Use the 6-digit verification code below to sign in securely to your account:</p>
            <div class="code-box">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Your 6-Digit Verification Code</div>
              <div class="code">${otp}</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 6px;">Valid for ${expiryMinutes} minutes • Do not share with anyone</div>
            </div>
            <p class="desc" style="font-size: 12px; margin-bottom: 0;">If you did not request this login code, you can safely ignore this email.</p>
            <div class="footer">
              © ${new Date().getFullYear()} Nalan's Mess • Contactless Cafeteria & Restaurant Management
            </div>
          </div>
        </body>
        </html>
      `;

      // 1. High-Performance HTTPS REST APIs (Port 443 - never blocked by cloud firewalls)
      if (env.RESEND_API_KEY) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: env.EMAIL_FROM || "Nalan's Mess <onboarding@resend.dev>",
              to: [toEmail],
              reply_to: "Nalan'smess@gmail.com",
              subject: `🔐 ${otp} is your Nalan's Mess Login Verification Code`,
              html: htmlContent,
            }),
          });
          if (res.ok) {
            console.log(`✅ [RESEND HTTP API SENT] To: ${toEmail}`);
            return true;
          } else {
            const errText = await res.text();
            console.warn(`⚠️ [RESEND API ERROR]: ${res.status} - ${errText}`);
          }
        } catch (httpErr) {
          console.warn('⚠️ [RESEND API DISPATCH FAILED]', httpErr);
        }
      }

      if (env.BREVO_API_KEY) {
        try {
          const senderEmail = (env.GMAIL_USER || 'nandhanask26@gmail.com').trim();
          const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': env.BREVO_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sender: { name: "Nalan's Mess", email: senderEmail },
              to: [{ email: toEmail, name: fullName || 'Customer' }],
              replyTo: { email: "Nalan'smess@gmail.com", name: "Nalan's Mess" },
              subject: `🔐 ${otp} is your Nalan's Mess Login Verification Code`,
              htmlContent: htmlContent,
            }),
          });
          if (res.ok) {
            console.log(`✅ [BREVO HTTP API SENT] To: ${toEmail}`);
            return true;
          } else {
            const errText = await res.text();
            console.warn(`⚠️ [BREVO API ERROR]: ${res.status} - ${errText}`);
          }
        } catch (httpErr) {
          console.warn('⚠️ [BREVO API DISPATCH FAILED]', httpErr);
        }
      }

      // 2. Direct SMTP Transport: Try Port 465 (SSL) first, then Port 587 (STARTTLS)
      const senderUser = (env.GMAIL_USER || 'nandhanask26@gmail.com').trim();
      const mailOptions = {
        from: `"Nalan's Mess" <${senderUser}>`,
        replyTo: "Nalan'smess@gmail.com",
        to: toEmail,
        subject: `🔐 ${otp} is your Nalan's Mess Login Verification Code`,
        text: `Your Nalan's Mess login verification code is: ${otp}. This code expires in ${expiryMinutes} minutes.`,
        html: htmlContent,
      };

      // Try Port 465 (SSL direct)
      const sent465 = await this.sendViaSmtpTransport(465, true, mailOptions);
      if (sent465) return true;

      // Try Port 587 (STARTTLS)
      const sent587 = await this.sendViaSmtpTransport(587, false, mailOptions);
      if (sent587) return true;

      return false;
    } catch (error) {
      console.error('❌ [EMAIL DISPATCH ERROR]', error);
      return false;
    }
  }

  async sendSecurityOtpEmail(options: SendOtpEmailOptions): Promise<boolean> {
    try {
      const { toEmail, fullName, otp, expiryMinutes = 5 } = options;

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
            <div class="logo">🍴 Nalan's <span class="brand-highlight">Mess</span> • Smart Ordering</div>
            <div class="title">🔐 Account Password Security Verification</div>
            <p class="desc">Hello <strong>${fullName || 'Customer'}</strong>,<br/>You requested to verify or update your account password. Use the single-use 6-digit verification code below to verify your identity:</p>
            <div class="code-box">
              <div style="font-size: 11px; color: #94A3B8; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Your 6-Digit Security OTP</div>
              <div class="code">${otp}</div>
              <div style="font-size: 11px; color: #64748B; margin-top: 6px;">Valid for ${expiryMinutes} minutes • Do not share with anyone</div>
            </div>
            <p class="desc" style="font-size: 12px; margin-bottom: 0;">If you did not request this security code, please check your account immediately.</p>
            <div class="footer">
              © ${new Date().getFullYear()} Nalan's Mess • Contactless Cafeteria & Restaurant Management
            </div>
          </div>
        </body>
        </html>
      `;

      if (env.RESEND_API_KEY) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${env.RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: env.EMAIL_FROM || "Nalan's Mess <onboarding@resend.dev>",
              to: [toEmail],
              reply_to: "Nalan'smess@gmail.com",
              subject: `🔐 ${otp} is your Nalan's Mess Password Security Code`,
              html: htmlContent,
            }),
          });
          if (res.ok) return true;
        } catch {
          // Fall through
        }
      }

      if (env.BREVO_API_KEY) {
        try {
          const res = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': env.BREVO_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sender: { name: "Nalan's Mess", email: (env.GMAIL_USER || 'nandhanask26@gmail.com').trim() },
              to: [{ email: toEmail, name: fullName || 'Customer' }],
              replyTo: { email: "Nalan'smess@gmail.com", name: "Nalan's Mess" },
              subject: `🔐 ${otp} is your Nalan's Mess Password Security Code`,
              htmlContent: htmlContent,
            }),
          });
          if (res.ok) return true;
        } catch {
          // Fall through
        }
      }

      const senderUser = (env.GMAIL_USER || 'nandhanask26@gmail.com').trim();
      const mailOptions = {
        from: `"Nalan's Mess" <${senderUser}>`,
        replyTo: "Nalan'smess@gmail.com",
        to: toEmail,
        subject: `🔐 ${otp} is your Nalan's Mess Password Security Code`,
        text: `Your Nalan's Mess password security verification code is: ${otp}. This code expires in ${expiryMinutes} minutes.`,
        html: htmlContent,
      };

      const sent465 = await this.sendViaSmtpTransport(465, true, mailOptions);
      if (sent465) return true;

      const sent587 = await this.sendViaSmtpTransport(587, false, mailOptions);
      return sent587;
    } catch (error) {
      console.error('❌ [EMAIL DISPATCH ERROR]', error);
      return false;
    }
  }
}

export const emailProvider = new NodemailerEmailProvider();
