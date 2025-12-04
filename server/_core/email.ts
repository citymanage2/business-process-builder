/**
 * Email Module - Send emails via SendGrid
 * Uses SendGrid API instead of SMTP (works on Render free tier)
 */

import sgMail from '@sendgrid/mail';

// Initialize SendGrid
let isInitialized = false;

function initializeSendGrid() {
  if (isInitialized) return true;

  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    console.warn('[Email] SendGrid API key not configured. Emails will not be sent.');
    console.warn('[Email] Set SENDGRID_API_KEY environment variable.');
    return false;
  }

  try {
    sgMail.setApiKey(apiKey);
    isInitialized = true;
    console.log('[Email] SendGrid initialized successfully');
    return true;
  } catch (error) {
    console.error('[Email] Failed to initialize SendGrid:', error);
    return false;
  }
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email via SendGrid
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!initializeSendGrid()) {
    console.warn('[Email] Cannot send email - SendGrid not configured');
    return false;
  }

  try {
    const from = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || 'noreply@business-process-builder.com';
    
    console.log(`[Email] Attempting to send via SendGrid to ${options.to}: ${options.subject}`);
    
    const msg = {
      to: options.to,
      from: from,
      subject: options.subject,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
      html: options.html,
    };

    const response = await sgMail.send(msg);
    
    console.log(`[Email] Successfully sent to ${options.to}:`, {
      statusCode: response[0].statusCode,
      headers: response[0].headers
    });
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send to', options.to, ':', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
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
