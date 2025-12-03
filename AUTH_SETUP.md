# Настройка авторизации

Проект поддерживает два способа авторизации:
1. **Google OAuth 2.0** - вход через аккаунт Google
2. **Email/Password** - традиционная регистрация с email и паролем

---

## 🔐 Переменные окружения

Добавьте в `.env` файл:

```env
# Google OAuth (обязательно для входа через Google)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Session secret (обязательно)
SESSION_SECRET=your_random_secret_key_min_32_chars

# Owner email (опционально - для автоматического назначения роли admin)
OWNER_EMAIL=your@email.com
```

---

## 📝 Получение Google OAuth credentials

### Шаг 1: Создайте проект в Google Cloud Console

1. Перейдите на https://console.cloud.google.com/
2. Создайте новый проект или выберите существующий
3. В меню слева выберите **APIs & Services** → **Credentials**

### Шаг 2: Настройте OAuth consent screen

1. Нажмите **OAuth consent screen** в левом меню
2. Выберите **External** и нажмите **Create**
3. Заполните обязательные поля:
   - App name: `Business Process Builder`
   - User support email: ваш email
   - Developer contact: ваш email
4. Нажмите **Save and Continue**
5. На странице **Scopes** нажмите **Add or Remove Scopes**
6. Выберите:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
7. Нажмите **Save and Continue**
8. На странице **Test users** добавьте тестовые email (если приложение в режиме Testing)
9. Нажмите **Save and Continue**

### Шаг 3: Создайте OAuth 2.0 Client ID

1. Вернитесь в **Credentials**
2. Нажмите **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Выберите **Application type**: **Web application**
4. Заполните:
   - Name: `Business Process Builder Web`
   - Authorized JavaScript origins:
     - `http://localhost:3000` (для разработки)
     - `https://yourdomain.com` (для production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback` (для разработки)
     - `https://yourdomain.com/api/auth/google/callback` (для production)
5. Нажмите **Create**
6. Скопируйте **Client ID** и **Client Secret**

### Шаг 4: Добавьте credentials в .env

```env
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnop
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

---

## 🔑 Генерация SESSION_SECRET

Используйте один из способов:

### Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### OpenSSL:
```bash
openssl rand -hex 32
```

### Online:
https://generate-secret.vercel.app/32

Добавьте в `.env`:
```env
SESSION_SECRET=your_generated_secret_here
```

---

## 👤 Настройка владельца (Owner)

Первый пользователь с email указанным в `OWNER_EMAIL` автоматически получит роль `admin`.

```env
OWNER_EMAIL=owner@example.com
```

Если не указать - все пользователи будут иметь роль `user`.

Чтобы вручную назначить админа:
1. Зайдите в базу данных
2. Найдите пользователя в таблице `users`
3. Измените поле `role` на `admin`

---

## 🚀 Production настройка

### Для Render.com:

1. В настройках проекта добавьте Environment Variables:
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_secret
GOOGLE_CALLBACK_URL=https://your-app.onrender.com/api/auth/google/callback
SESSION_SECRET=your_generated_secret
OWNER_EMAIL=your@email.com
```

2. В Google Cloud Console добавьте production URL в Authorized redirect URIs:
```
https://your-app.onrender.com/api/auth/google/callback
```

### Для Vercel:

1. В настройках проекта добавьте Environment Variables (те же)
2. Обновите `GOOGLE_CALLBACK_URL`:
```
GOOGLE_CALLBACK_URL=https://your-app.vercel.app/api/auth/google/callback
```

---

## 🧪 Тестирование

### Локально:

1. Запустите проект: `pnpm dev`
2. Откройте http://localhost:3000/login
3. Попробуйте:
   - Регистрацию через Email/Password
   - Вход через Email/Password
   - Вход через Google

### Проверка авторизации:

```bash
# Регистрация
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Вход
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Получить текущего пользователя
curl http://localhost:3000/api/auth/me

# Выход
curl -X POST http://localhost:3000/api/auth/logout
```

---

## ❓ Частые проблемы

### "redirect_uri_mismatch"

**Причина:** URL в Google Cloud Console не совпадает с `GOOGLE_CALLBACK_URL`

**Решение:** 
1. Проверьте что URL в `.env` точно совпадает с URL в Google Console
2. Убедитесь что нет лишних слешей в конце
3. Проверьте протокол (http vs https)

### "Invalid session secret"

**Причина:** `SESSION_SECRET` не установлен или слишком короткий

**Решение:** Сгенерируйте новый secret минимум 32 символа

### Пользователь не может войти

**Причина:** Email не подтвержден в Google или приложение в режиме Testing

**Решение:** 
1. Добавьте email в Test users в Google Cloud Console
2. Или опубликуйте приложение (Publish App)

### Google OAuth не работает в production

**Причина:** Не обновлены Authorized redirect URIs

**Решение:** Добавьте production URL в Google Cloud Console

---

## 🔒 Безопасность

1. **Никогда не коммитьте `.env` файл** - он уже в `.gitignore`
2. **Используйте разные secrets** для development и production
3. **Регулярно обновляйте** `SESSION_SECRET` и `GOOGLE_CLIENT_SECRET`
4. **Включите HTTPS** в production (автоматически на Render/Vercel)
5. **Ограничьте доступ** к Google Cloud Console

---

## 📚 Дополнительная информация

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Documentation](http://www.passportjs.org/)
- [Express Session Documentation](https://github.com/expressjs/session)
