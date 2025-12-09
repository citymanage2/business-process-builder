import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db'; // ✅ ИСПРАВЛЕНО: импортируем getDb вместо db
import { users } from '../../drizzle/schema';
import { eq, or } from 'drizzle-orm';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ✅ Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, name } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Укажите email или телефон' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
    }

    // ✅ ИСПРАВЛЕНО: Получаем db через getDb()
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'База данных недоступна' });
    }

    // Проверка существующего пользователя
    const existing = await db.select().from(users).where(
      email ? eq(users.email, email) : eq(users.phone, phone)
    ).limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ ИСПРАВЛЕНО: Создаем пользователя с правильными полями
    const [user] = await db.insert(users).values({
      email: email || null,
      phone: phone || null,
      passwordHash: hashedPassword, // ✅ ИСПРАВЛЕНО: было password
      name: name || null,
      provider: 'local', // ✅ ДОБАВЛЕНО: указываем провайдера
      role: 'user', // ✅ ДОБАВЛЕНО: роль по умолчанию
    }).returning();

    res.json({ 
      message: 'Регистрация успешна',
      userId: user.id 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ✅ Логин
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Укажите email/телефон и пароль' });
    }

    console.log('Login attempt for:', email); // ✅ ДОБАВЛЕНО: для отладки

    // ✅ ИСПРАВЛЕНО: Получаем db через getDb()
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ error: 'База данных недоступна' });
    }

    // Ищем пользователя по email или телефону
    const [user] = await db.select().from(users).where(
      or(
        eq(users.email, email),
        eq(users.phone, email)
      )
    ).limit(1);

    if (!user) {
      console.log('User not found'); // ✅ ДОБАВЛЕНО
      return res.status(401).json({ error: 'Неверный email/телефон или пароль' });
    }

    // ✅ ИСПРАВЛЕНО: Проверяем passwordHash вместо password
    if (!user.passwordHash) {
      console.log('User has no password (OAuth user?)'); // ✅ ДОБАВЛЕНО
      return res.status(401).json({ error: 'Пользователь зарегистрирован через OAuth' });
    }

    // Проверяем пароль
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      console.log('Invalid password'); // ✅ ДОБАВЛЕНО
      return res.status(401).json({ error: 'Неверный email/телефон или пароль' });
    }

    console.log('Password valid, creating token...'); // ✅ ДОБАВЛЕНО

    // Создаем JWT токен
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log('Setting cookie...'); // ✅ ДОБАВЛЕНО

    // ✅ ВАЖНО: Устанавливаем cookie с правильными настройками
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 дней
      path: '/',
    });

    console.log('Cookie set, sending response'); // ✅ ДОБАВЛЕНО

    res.json({ 
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ✅ Logout
router.post('/logout', (req, res) => {
  console.log('Logging out...'); // ✅ ДОБАВЛЕНО
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  res.json({ success: true });
});

export default router;
