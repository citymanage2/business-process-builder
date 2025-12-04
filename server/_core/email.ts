/**
 * Email Module - Send emails via nodemailer
 */

import nodemailer from 'nodemailer';
import { ENV } from './env';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    // Check if SMTP is configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[Email] SMTP not configured. Missing:', {
        host: !!process.env.SMTP_HOST,
        user: !!process.env.SMTP_USER,
        pass: !!process.env.SMTP_PASS
      });
      return null;
    }
    
    console.log('[Email] Initializing SMTP transport:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || '587',
      user: process.env.SMTP_USER
    });

    try {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      console.log('[Email] SMTP transport created successfully');
    } catch (error) {
      console.error('[Email] Failed to create SMTP transport:', error);
      return null;
    }
  }
  return transporter;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const transport = getTransporter();
  
  if (!transport) {
    console.warn('[Email] Cannot send email - SMTP not configured');
    return false;
  }

  try {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    
    console.log(`[Email] Attempting to send to ${options.to}: ${options.subject}`);
    
    const info = await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
    });

    console.log(`[Email] Successfully sent to ${options.to}:`, {
      messageId: info.messageId,
      response: info.response
    });
    return true;
  } catch (error) {
    console.error('[Email] Failed to send to', options.to, ':', error);
    return false;
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Подтверждение email</h1>
        </div>
        <div class="content">
          <p>Здравствуйте!</p>
          <p>Спасибо за регистрацию в Business Process Builder. Для завершения регистрации, пожалуйста, подтвердите ваш email адрес.</p>
          <p style="text-align: center;">
            <a href="${verificationUrl}" class="button">Подтвердить email</a>
          </p>
          <p>Или скопируйте и вставьте эту ссылку в браузер:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>Ссылка действительна в течение 24 часов.</p>
          <p>Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Business Process Builder. Все права защищены.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Подтвердите ваш email - Business Process Builder',
    html,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 12px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Восстановление пароля</h1>
        </div>
        <div class="content">
          <p>Здравствуйте!</p>
          <p>Мы получили запрос на восстановление пароля для вашего аккаунта в Business Process Builder.</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Сбросить пароль</a>
          </p>
          <p>Или скопируйте и вставьте эту ссылку в браузер:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <div class="warning">
            <strong>⚠️ Важно:</strong> Ссылка действительна в течение 1 часа.
          </div>
          <p>Если вы не запрашивали восстановление пароля, просто проигнорируйте это письмо. Ваш пароль останется без изменений.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Business Process Builder. Все права защищены.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Восстановление пароля - Business Process Builder',
    html,
  });
}
