/**
 * Authentication Routes
 * Handles Email/Password authentication with email verification
 */

import { Router } from 'express';
import passport from 'passport';
import { z } from 'zod';
import crypto from 'crypto';
import { hashPassword } from './auth';
import { createUser, getUserByEmail, createVerificationToken } from '../db';
import { sendVerificationEmail } from './email';

const router = Router();

// Register with email/password
router.post('/register', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().optional(),
    });

    const data = schema.parse(req.body);

    // Check if user exists
    const existing = await getUserByEmail(data.email);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user (email not verified yet)
    const user = await createUser({
      email: data.email,
      name: data.name,
      passwordHash,
      provider: 'local',
    });

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await createVerificationToken({
      userId: user.id,
      token,
      type: 'email_verification',
      expiresAt,
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(data.email, token);
    
    if (!emailSent) {
      console.error('[Auth] Failed to send verification email to:', data.email);
      // Still allow registration to succeed, but warn user
    }

    res.json({ 
      success: true, 
      message: emailSent 
        ? 'Регистрация успешна! Проверьте email для подтверждения адреса.'
        : 'Регистрация успешна! Но письмо не удалось отправить. Обратитесь к администратору.',
      requiresVerification: true,
      emailSent
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(400).json({ error: 'Registration failed' });
  }
});

// Login with email/password
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      return res.status(500).json({ error: 'Authentication error' });
    }
    if (!user) {
      return res.status(401).json({ error: info?.message || 'Invalid credentials' });
    }
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
    });
  })(req, res, next);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});



// Get current user
router.get('/me', (req, res) => {
  if (req.isAuthenticated()) {
    const user = req.user as any;
    res.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        role: user.role,
        tokenBalance: user.tokenBalance,
      } 
    });
  } else {
    res.json({ user: null });
  }
});

export default router;


// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const { getVerificationToken, deleteVerificationToken, verifyUserEmail } = await import('../db');
    
    // Get token from database
    const verificationToken = await getVerificationToken(token);

    if (!verificationToken) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    // Check if token is expired
    if (new Date() > verificationToken.expiresAt) {
      await deleteVerificationToken(token);
      return res.status(400).json({ error: 'Token expired' });
    }

    // Check token type
    if (verificationToken.type !== 'email_verification') {
      return res.status(400).json({ error: 'Invalid token type' });
    }

    // Verify user email
    await verifyUserEmail(verificationToken.userId);

    // Delete token
    await deleteVerificationToken(token);

    res.json({ success: true, message: 'Email успешно подтвержден! Теперь вы можете войти.' });
  } catch (error) {
    console.error('[Auth] Email verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});


// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
    });

    const data = schema.parse(req.body);

    // Check if user exists
    const user = await getUserByEmail(data.email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'Если email существует, мы отправили инструкции по восстановлению пароля.' });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour

    await createVerificationToken({
      userId: user.id,
      token,
      type: 'password_reset',
      expiresAt,
    });

    // Send reset email
    const { sendPasswordResetEmail } = await import('./email');
    await sendPasswordResetEmail(data.email, token);

    res.json({ success: true, message: 'Если email существует, мы отправили инструкции по восстановлению пароля.' });
  } catch (error) {
    console.error('[Auth] Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const schema = z.object({
      token: z.string(),
      password: z.string().min(6),
    });

    const data = schema.parse(req.body);

    const { getVerificationToken, deleteVerificationToken, updateUserPassword } = await import('../db');

    // Get token from database
    const verificationToken = await getVerificationToken(data.token);

    if (!verificationToken) {
      return res.status(400).json({ error: 'Неверный или истекший токен' });
    }

    // Check if token is expired
    if (new Date() > verificationToken.expiresAt) {
      await deleteVerificationToken(data.token);
      return res.status(400).json({ error: 'Токен истек. Запросите восстановление пароля снова.' });
    }

    // Check token type
    if (verificationToken.type !== 'password_reset') {
      return res.status(400).json({ error: 'Неверный тип токена' });
    }

    // Hash new password
    const passwordHash = await hashPassword(data.password);

    // Update user password
    await updateUserPassword(verificationToken.userId, passwordHash);

    // Delete token
    await deleteVerificationToken(data.token);

    res.json({ success: true, message: 'Пароль успешно изменен! Теперь вы можете войти с новым паролем.' });
  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});
