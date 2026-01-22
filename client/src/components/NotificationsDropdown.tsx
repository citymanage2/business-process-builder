import React from 'react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Bell,
  BellOff,
  MessageSquare,
  UserPlus,
  GitBranch,
  AlertCircle,
  Check,
  CheckCheck,
  Trash2,
} from 'lucide-react';

interface NotificationsDropdownProps {
  language?: 'en' | 'ru';
}

export default function NotificationsDropdown({
  language = 'ru',
}: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  // Queries
  const notificationsQuery = trpc.builder.notifications.list.useQuery(
    { limit: 10 },
    { enabled: isOpen }
  );
  
  const unreadCountQuery = trpc.builder.notifications.unreadCount.useQuery();
  
  // Mutations
  const markRead = trpc.builder.notifications.markRead.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
      unreadCountQuery.refetch();
    },
  });
  
  const markAllRead = trpc.builder.notifications.markAllRead.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
      unreadCountQuery.refetch();
    },
  });
  
  const deleteNotification = trpc.builder.notifications.delete.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
      unreadCountQuery.refetch();
    },
  });
  
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'collaboration_invite':
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case 'new_comment':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case 'mention':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'process_update':
        return <GitBranch className="w-4 h-4 text-orange-500" />;
      case 'system':
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };
  
  const handleNotificationClick = (notification: any) => {
    if (notification.isRead === 0) {
      markRead.mutate({ id: notification.id });
    }
    setIsOpen(false);
  };
  
  const unreadCount = unreadCountQuery.data || 0;
  
  const texts = {
    en: {
      notifications: 'Notifications',
      markAllRead: 'Mark all as read',
      noNotifications: 'No notifications',
      viewAll: 'View all',
    },
    ru: {
      notifications: 'Уведомления',
      markAllRead: 'Отметить все как прочитанные',
      noNotifications: 'Нет уведомлений',
      viewAll: 'Показать все',
    },
  };
  
  const t = texts[language];
  
  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {t.notifications}
          </span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              {t.markAllRead}
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px]">
          {notificationsQuery.isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notificationsQuery.data && notificationsQuery.data.length > 0 ? (
            <div className="py-1">
              {notificationsQuery.data.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex items-start gap-3 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors',
                    notification.isRead === 0 && 'bg-primary/5'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm',
                        notification.isRead === 0 && 'font-medium'
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(notification.createdAt), 'd MMM, HH:mm', {
                        locale: language === 'ru' ? ru : undefined,
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification.mutate({ id: notification.id });
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <BellOff className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">{t.noNotifications}</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
