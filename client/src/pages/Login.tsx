import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { APP_LOGO, APP_TITLE } from '@/const';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  
  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // вЬЕ –Ф–Ю–С–Р–Т–Ы–Х–Э–Ю: –Ю—В–њ—А–∞–≤–Ї–∞ cookie
        body: JSON.stringify({ 
          email: loginIdentifier, 
          password: loginPassword 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('–Т—Е–Њ–і –≤—Л–њ–Њ–ї–љ–µ–љ —Г—Б–њ–µ—И–љ–Њ!');
        
        // вЬЕ –Ф–Ю–С–Р–Т–Ы–Х–Э–Ю: –Ф–∞–µ–Љ –≤—А–µ–Љ—П –љ–∞ —Г—Б—В–∞–љ–Њ–≤–Ї—Г cookie
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // вЬЕ –Ш–Ч–Ь–Х–Э–Х–Э–Ю: –Я—А–Є–љ—Г–і–Є—В–µ–ї—М–љ–∞—П –њ–µ—А–µ–Ј–∞–≥—А—Г–Ј–Ї–∞
        window.location.href = '/';
      } else {
        toast.error(data.error || '–Ю—И–Є–±–Ї–∞ –≤—Е–Њ–і–∞');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('–Ю—И–Є–±–Ї–∞ –њ–Њ–і–Ї–ї—О—З–µ–љ–Є—П –Ї —Б–µ—А–≤–µ—А—Г');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerEmail && !registerPhone) {
      toast.error('–£–Ї–∞–ґ–Є—В–µ email –Є–ї–Є –љ–Њ–Љ–µ—А —В–µ–ї–µ—Д–Њ–љ–∞');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // вЬЕ –Ф–Ю–С–Р–Т–Ы–Х–Э–Ю: –Ю—В–њ—А–∞–≤–Ї–∞ cookie
        body: JSON.stringify({ 
          email: registerEmail || undefined,
          phone: registerPhone || undefined,
          password: registerPassword,
          name: registerName 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || '–†–µ–≥–Є—Б—В—А–∞—Ж–Є—П —Г—Б–њ–µ—И–љ–∞! –Ґ–µ–њ–µ—А—М –≤—Л –Љ–Њ–ґ–µ—В–µ –≤–Њ–є—В–Є.');
        
        // вЬЕ –Ш–Ч–Ь–Х–Э–Х–Э–Ю: –£–ї—Г—З—И–µ–љ–љ–Њ–µ –њ–µ—А–µ–Ї–ї—О—З–µ–љ–Є–µ –љ–∞ –≤–Ї–ї–∞–і–Ї—Г –≤—Е–Њ–і–∞
        setTimeout(() => {
          setActiveTab('login');
          setLoginIdentifier(registerEmail || registerPhone);
        }, 1500);
      } else {
        toast.error(data.error || '–Ю—И–Є–±–Ї–∞ —А–µ–≥–Є—Б—В—А–∞—Ж–Є–Є');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('–Ю—И–Є–±–Ї–∞ –њ–Њ–і–Ї–ї—О—З–µ–љ–Є—П –Ї —Б–µ—А–≤–µ—А—Г');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          {APP_LOGO && (
            <div className="flex justify-center mb-4">
              <img src={APP_LOGO} alt={APP_TITLE} className="h-12 w-12" />
            </div>
          )}
          <CardTitle className="text-2xl font-bold">{APP_TITLE}</CardTitle>
          <CardDescription>
            –Т–Њ–є–і–Є—В–µ –Є–ї–Є –Ј–∞—А–µ–≥–Є—Б—В—А–Є—А—Г–є—В–µ—Б—М –і–ї—П –њ—А–Њ–і–Њ–ї–ґ–µ–љ–Є—П
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">–Т—Е–Њ–і</TabsTrigger>
              <TabsTrigger value="register">–†–µ–≥–Є—Б—В—А–∞—Ж–Є—П</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-identifier">Email –Є–ї–Є —В–µ–ї–µ—Д–Њ–љ</Label>
                  <Input
                    id="login-identifier"
                    type="text"
                    placeholder="your@email.com –Є–ї–Є +7..."
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">–Я–∞—А–Њ–ї—М</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="вАҐвАҐвАҐвАҐвАҐвАҐвАҐвАҐ"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      –Т—Е–Њ–і...
                    </>
                  ) : (
                    '–Т–Њ–є—В–Є'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">–Ш–Љ—П</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="–Т–∞—И–µ –Є–Љ—П"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your@email.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-phone">–Э–Њ–Љ–µ—А —В–µ–ї–µ—Д–Њ–љ–∞</Label>
                  <PhoneInput
                    value={registerPhone}
                    onChange={(value) => setRegisterPhone(value || '')}
                    placeholder="+7 (999) 123-45-67"
                  />
                  <p className="text-xs text-muted-foreground">
                    –£–Ї–∞–ґ–Є—В–µ email –Є–ї–Є —В–µ–ї–µ—Д–Њ–љ (–Є–ї–Є –Њ–±–∞)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">–Я–∞—А–Њ–ї—М</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="вАҐвАҐвАҐвАҐвАҐвАҐвАҐвАҐ"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    –Ь–Є–љ–Є–Љ—Г–Љ 6 —Б–Є–Љ–≤–Њ–ї–Њ–≤
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      –†–µ–≥–Є—Б—В—А–∞—Ж–Є—П...
                    </>
                  ) : (
                    '–Ч–∞—А–µ–≥–Є—Б—В—А–Є—А–Њ–≤–∞—В—М—Б—П'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-xs text-muted-foreground text-center">
            –Я—А–Њ–і–Њ–ї–ґ–∞—П, –≤—Л —Б–Њ–≥–ї–∞—И–∞–µ—В–µ—Б—М —Б —Г—Б–ї–Њ–≤–Є—П–Љ–Є –Є—Б–њ–Њ–ї—М–Ј–Њ–≤–∞–љ–Є—П
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}


