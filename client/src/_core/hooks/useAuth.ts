import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { useCallback, useEffect, useMemo } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = getLoginUrl() } =
    options ?? {};
  const utils = trpc.useUtils();

  // ✅ ИЗМЕНЕНО: Запрос текущего пользователя с правильными настройками
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 1000 * 60 * 5, // ✅ ДОБАВЛЕНО: Кеш на 5 минут
  });

  // ✅ УЛУЧШЕНО: Функция logout с правильной очисткой
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' // ✅ ДОБАВЛЕНО: Отправка cookie
      });
      
      // ✅ ДОБАВЛЕНО: Очищаем все состояние
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      localStorage.removeItem('manus-runtime-user-info');
      
      // ✅ ИЗМЕНЕНО: Перенаправляем на логин
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // В случае ошибки все равно перенаправляем
      window.location.href = '/login';
    }
  }, [utils]);

  // ✅ УЛУЧШЕНО: Вычисляем состояние авторизации
  const state = useMemo(() => {
    const user = meQuery.data ?? null;
    
    // ✅ ДОБАВЛЕНО: Сохраняем в localStorage для синхронизации
    if (user) {
      localStorage.setItem("manus-runtime-user-info", JSON.stringify(user));
    } else {
      localStorage.removeItem("manus-runtime-user-info");
    }
    
    return {
      user,
      loading: meQuery.isLoading,
      error: meQuery.error ?? null,
      isAuthenticated: Boolean(user),
    };
  }, [meQuery.data, meQuery.error, meQuery.isLoading]);

  // ✅ ДОБАВЛЕНО: Логирование для отладки
  useEffect(() => {
    if (meQuery.data) {
      console.log('✅ User authenticated:', meQuery.data);
    } else if (!meQuery.isLoading) {
      console.log('❌ User not authenticated');
    }
  }, [meQuery.data, meQuery.isLoading]);

  // ✅ Редирект на логин если не авторизован
  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    console.log('Redirecting to login: user not authenticated');
    window.location.href = redirectPath;
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
