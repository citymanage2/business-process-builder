/**
 * Authentication Routes
 * Handles Google OAuth and Email/Password authentication
 */

import { Router } from 'express';
import passport from 'passport';
import { z } from 'zod';
import { hashPassword } from './auth';
import { createUser, getUserByEmail } from '../db';

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

    // Create user
    const user = await createUser({
      email: data.email,
      name: data.name,
      passwordHash,
      provider: 'local',
    });

    // Login user
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ error: 'Login failed' });
      }
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
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

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=auth_failed' }),
  (req, res) => {
    // Successful authentication, redirect to home
    res.redirect('/');
  }
);

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
