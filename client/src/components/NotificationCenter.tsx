import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Share2,
  AlertCircle,
  Clock,
  Settings,
  Trash2,
  Loader2,
  UserPlus,
  FileText,
} from "lucide-react";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const {
    data: notifications,
    isLoading,
    refetch,
  } = trpc.notifications.list.useQuery({ limit: 20 });
  
  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery();

  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => refetch(),
  });
  
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => refetch(),
  });
  
  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "invite":
        return <UserPlus className="w-4 h-4 text-blue-500" />;
      case "comment":
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      case "mention":
        return <span className="text-purple-500 font-bold text-sm">@</span>;
      case "change":
        return <FileText className="w-4 h-4 text-orange-500" />;
      case "deadline":
        return <Clock className="w-4 h-4 text-red-500" />;
      case "system":
        return <Settings className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount && unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Уведомления</CardTitle>
              {unreadCount && unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="w-3 h-3 mr-1" />
                  Прочитать все
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Нет уведомлений</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 hover:bg-accent/50 transition-colors ${
                        notification.isRead === 0 ? "bg-accent/30" : ""
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          {notification.content && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {notification.content}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(notification.createdAt), "d MMM, HH:mm", {
                              locale: ru,
                            })}
                          </p>
                        </div>
                        <div className="flex-shrink-0 flex gap-1">
                          {notification.isRead === 0 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                markAsReadMutation.mutate({ id: notification.id })
                              }
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              deleteMutation.mutate({ id: notification.id })
                            }
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
