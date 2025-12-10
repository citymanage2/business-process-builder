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
          // Try to find user by email or phone
          let user = await getUserByEmail(emailOrPhone);
          
          if (!user) {
            user = await getUserByPhone(emailOrPhone);
          }

          if (!user) {
            return done(null, false, { message: 'Неверный email/телефон или пароль' });
          }

          if (!user.passwordHash) {
            return done(null, false, { message: 'Используйте вход через Google' });
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);

          if (!isValid) {
            return done(null, false, { message: 'Неверный email/телефон или пароль' });
          }

          await updateUserLastSignIn(user.id);

          return done(null, user);
        } catch (error) {
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
