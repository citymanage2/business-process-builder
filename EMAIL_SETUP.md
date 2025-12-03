# Email Setup Guide

Система требует настройки SMTP для отправки писем верификации и восстановления пароля.

## Необходимые переменные окружения

Добавьте следующие переменные в настройки проекта (Settings → Secrets в Management UI):

```
FRONTEND_URL=https://your-domain.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

## Настройка Gmail SMTP

### 1. Включите двухфакторную аутентификацию

1. Перейдите в [Google Account Security](https://myaccount.google.com/security)
2. Включите "2-Step Verification"

### 2. Создайте App Password

1. Перейдите в [App Passwords](https://myaccount.google.com/apppasswords)
2. Выберите "Mail" и "Other (Custom name)"
3. Введите название "Business Process Builder"
4. Скопируйте сгенерированный пароль (16 символов)
5. Используйте этот пароль в `SMTP_PASS`

### 3. Настройте переменные

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  (16-символьный App Password)
SMTP_FROM=your-gmail@gmail.com
```

## Альтернативные SMTP провайдеры

### SendGrid

```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_FROM=verified-sender@yourdomain.com
```

### Mailgun

```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-smtp-password
SMTP_FROM=noreply@your-domain.mailgun.org
```

### Amazon SES

```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASS=your-ses-smtp-password
SMTP_FROM=verified-email@yourdomain.com
```

## Тестирование

После настройки SMTP:

1. Зарегистрируйте нового пользователя
2. Проверьте почту на письмо верификации
3. Проверьте папку "Спам" если письмо не пришло
4. Попробуйте восстановление пароля

## Troubleshooting

### Письма не приходят

1. **Проверьте логи сервера** - ошибки SMTP будут в консоли
2. **Проверьте App Password** - убедитесь что используете App Password, а не обычный пароль Gmail
3. **Проверьте спам** - первые письма могут попадать в спам
4. **Проверьте лимиты** - Gmail имеет лимит ~500 писем/день для бесплатных аккаунтов

### "Invalid login" ошибка Gmail

- Убедитесь что включена двухфакторная аутентификация
- Создайте новый App Password
- Проверьте что нет пробелов в пароле

### Письма в спаме

1. Настройте SPF/DKIM записи для вашего домена
2. Используйте профессиональный SMTP сервис (SendGrid, Mailgun)
3. Добавьте "от" адрес в контакты

## Безопасность

⚠️ **Важно:**

- Никогда не коммитьте SMTP пароли в git
- Используйте App Passwords, не основной пароль
- Регулярно ротируйте SMTP пароли
- Используйте отдельный email для отправки

## Production рекомендации

Для production используйте профессиональный SMTP сервис:

1. **SendGrid** - бесплатно до 100 писем/день
2. **Mailgun** - бесплатно до 5000 писем/месяц  
3. **Amazon SES** - $0.10 за 1000 писем

Эти сервисы обеспечивают:
- Высокую доставляемость
- Детальную аналитику
- Автоматическую обработку отписок
- Лучшую репутацию отправителя
