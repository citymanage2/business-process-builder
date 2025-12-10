/**
 * Authentication Routes
 * Handles Email/Password and Phone/Password authentication
 */

import { Router } from 'express';
import passport from 'passport';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { hashPassword } from './auth';
import { createUser, getUserByEmail, getUserByPhone } from '../db';
import { ENV } from './env';

const router = Router();

// Register with email/phone/password
router.post('/register', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email().optional(),
      phone: z.string().min(10).optional(),
      password: z.string().min(6),
      name: z.string().optional(),
    }).refine(data => data.email || data.phone, {
      message: "Either email or phone must be provided"
    });

    const data = schema.parse(req.body);

    // Check if user exists by email or phone
    if (data.email) {
      const existing = await getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    if (data.phone) {
      const existing = await getUserByPhone(data.phone);
      if (existing) {
        return res.status(400).json({ error: 'Phone already registered' });
      }
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    const user = await createUser({
      email: data.email || undefined,
      phone: data.phone || undefined,
      name: data.name || undefined,
      passwordHash,
      provider: 'local',
    });

    res.json({ 
      success: true, 
      message: 'Регистрация успешна! Теперь вы можете войти.',
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(400).json({ error: 'Registration failed' });
  }
});

// Login with email/phone + password
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
      
      // Create JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        ENV.cookieSecret,
        { expiresIn: '30d' }
      );
      
      // Set cookie using setHeader instead of res.cookie() to avoid Cloudflare proxy issues
      const cookieValue = [
        `token=${token}`,
        'HttpOnly',
        ENV.isProduction ? 'Secure' : '',
        `Max-Age=${30 * 24 * 60 * 60}`, // 30 days in seconds
        `SameSite=${ENV.isProduction ? 'None' : 'Lax'}`,
        'Path=/'
      ].filter(Boolean).join('; ');
      
      // Debug logging
      console.log('[AUTH] Setting cookie:', {
        isProduction: ENV.isProduction,
        NODE_ENV: process.env.NODE_ENV,
        cookieValue: cookieValue.substring(0, 50) + '...', // Log first 50 chars
        protocol: req.protocol,
        secure: req.secure,
        hostname: req.hostname
      });
      
      // Disable caching to prevent Cloudflare from stripping Set-Cookie header
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.setHeader('Set-Cookie', cookieValue);
      
      res.json({ success: true, user: { id: user.id, email: user.email, phone: user.phone, name: user.name } });
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
        phone: user.phone,
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
