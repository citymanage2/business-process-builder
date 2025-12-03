/**
 * Authentication Module - Google OAuth & Email/Password
 * 
 * This module provides authentication using:
 * - Google OAuth 2.0
 * - Email/Password with bcrypt hashing
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserById, createUser, updateUserLastSignIn } from '../db';
import { ENV } from './env';

/**
 * Configure Passport strategies
 */
export function configurePassport() {
  // Google OAuth Strategy
  if (ENV.googleClientId && ENV.googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: ENV.googleClientId,
          clientSecret: ENV.googleClientSecret,
          callbackURL: '/api/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found in Google profile'));
            }

            // Check if user exists
            let user = await getUserByEmail(email);

            if (!user) {
              // Create new user
              user = await createUser({
                email,
                name: profile.displayName,
                provider: 'google',
                providerId: profile.id,
              });
            } else {
              // Update last sign in
              await updateUserLastSignIn(user.id);
            }

            return done(null, user);
          } catch (error) {
            return done(error as Error);
          }
        }
      )
    );
  }

  // Local Strategy (Email/Password)
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          const user = await getUserByEmail(email);

          if (!user) {
            return done(null, false, { message: 'Неверный email или пароль' });
          }

          if (!user.passwordHash) {
            return done(null, false, { message: 'Используйте вход через Google' });
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);

          if (!isValid) {
            return done(null, false, { message: 'Неверный email или пароль' });
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
