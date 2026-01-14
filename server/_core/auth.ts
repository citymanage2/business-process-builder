/**
 * Authentication Module - Email/Password
 * 
 * This module provides authentication using:
 * - Email/Password with bcrypt hashing
 */

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserByPhone, getUserById, createUser, updateUserLastSignIn } from '../db';
import { ENV } from './env';

/**
 * Configure Passport strategies
 */
export function configurePassport() {
  // Local Strategy (Email/Phone + Password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'identifier', // Frontend sends 'identifier' field
        passwordField: 'password',
      },
      async (emailOrPhone, password, done) => {
        try {
          console.log('[Auth] Login attempt:', emailOrPhone);
          
          // Try to find user by email or phone
          let user = await getUserByEmail(emailOrPhone);
          console.log('[Auth] getUserByEmail result:', user ? 'found' : 'not found');
          
          if (!user) {
            user = await getUserByPhone(emailOrPhone);
            console.log('[Auth] getUserByPhone result:', user ? 'found' : 'not found');
          }

          if (!user) {
            console.log('[Auth] User not found');
            return done(null, false, { message: 'Неверный email/телефон или пароль' });
          }

          if (!user.passwordHash) {
            console.log('[Auth] User has no password hash');
            return done(null, false, { message: 'Используйте вход через Google' });
          }

          console.log('[Auth] Comparing password...');
          const isValid = await bcrypt.compare(password, user.passwordHash);
          console.log('[Auth] Password valid:', isValid);

          if (!isValid) {
            return done(null, false, { message: 'Неверный email/телефон или пароль' });
          }

          console.log('[Auth] Updating last sign in...');
          // Temporarily skip updating lastSignedIn to debug
          // await updateUserLastSignIn(user.id);
          console.log('[Auth] Login successful');

          return done(null, user);
        } catch (error) {
          console.error('[Auth] Login error:', error);
          return done(error as Error);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await getUserById(id);
      done(null, user || null);
    } catch (error) {
      done(error as Error);
    }
  });
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
