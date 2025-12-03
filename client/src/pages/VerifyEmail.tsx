import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/verify-email');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Токен верификации не найден');
      return;
    }

    // Verify email
    fetch(`/api/auth/verify-email?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus('success');
          setMessage(data.message || 'Email успешно подтвержден!');
        } else {
          setStatus('error');
          setMessage(data.error || 'Ошибка верификации');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Произошла ошибка при верификации');
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-16 w-16 text-indigo-600 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-16 w-16 text-green-600" />}
            {status === 'error' && <XCircle className="h-16 w-16 text-red-600" />}
          </div>
          <CardTitle className="text-2xl">
            {status === 'loading' && 'Проверка...'}
            {status === 'success' && 'Успешно!'}
            {status === 'error' && 'Ошибка'}
          </CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'success' && (
            <Button onClick={() => navigate('/login')} className="w-full">
              Войти в систему
            </Button>
          )}
          {status === 'error' && (
            <div className="space-y-2">
              <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
                Вернуться к входу
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
