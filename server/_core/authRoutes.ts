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

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes work!' });
});

router.post('/test-post', (req, res) => {
  res.json({ message: 'POST works!', body: req.body });
});

router.get('/test-db', async (req, res) => {
  try {
    const user = await getUserByEmail('test@example.com');
    res.json({ message: 'DB works!', user: user ? 'found' : 'not found' });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

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
router.post('/login', async (req, res) => {
  try {
    console.log('[Auth] Login request received:', req.body);
    
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      console.log('[Auth] Missing identifier or password');
      return res.status(400).json({ error: 'Email/phone and password are required' });
    }
    
    console.log('[Auth] Looking up user by identifier:', identifier);
    
    // Try to find user by email or phone
    let user = await getUserByEmail(identifier);
    console.log('[Auth] getUserByEmail result:', user ? 'found' : 'not found');
    
    if (!user) {
      user = await getUserByPhone(identifier);
      console.log('[Auth] getUserByPhone result:', user ? 'found' : 'not found');
    }
    
    if (!user) {
      console.log('[Auth] User not found');
      return res.status(401).json({ error: 'Неверный email/телефон или пароль' });
    }
    
    console.log('[Auth] User found:', { id: user.id, email: user.email, hasPassword: !!user.passwordHash });
    
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Используйте вход через Google' });
    }
    
    // Verify password
    console.log('[Auth] Verifying password...');
    console.log('[Auth] Password from request:', password);
    console.log('[Auth] Password hash from DB:', user.passwordHash);
    
    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    console.log('[Auth] Password valid:', isValid);
    
    if (!isValid) {
      console.log('[Auth] Password verification failed');
      return res.status(401).json({ error: 'Неверный email/телефон или пароль' });
    }
    
    console.log('[Auth] Password verified successfully');
    
    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      ENV.cookieSecret,
      { expiresIn: '30d' }
    );
    
    // Set cookie
    const cookieValue = [
      `token=${token}`,
      'HttpOnly',
      ENV.isProduction ? 'Secure' : '',
      `Max-Age=${30 * 24 * 60 * 60}`,
      `SameSite=${ENV.isProduction ? 'None' : 'Lax'}`,
      'Path=/'
    ].filter(Boolean).join('; ');
    
    console.log('[Auth] Login successful, setting cookie');
    
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Set-Cookie', cookieValue);
    
    res.json({ 
      success: true, 
      user: { 
        id: user.id, 
        email: user.email, 
        phone: user.phone, 
        name: user.name,
        role: user.role,
        tokenBalance: user.tokenBalance
      } 
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
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
