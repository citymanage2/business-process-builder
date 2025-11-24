import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Send, Loader2, AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";

interface Message {
  id: number;
  chatId: number;
  senderId: number;
  senderRole: "user" | "admin";
  message: string;
  isRead: number;
  createdAt: Date;
}

interface Chat {
  id: number;
  userId: number;
  status: "open" | "closed";
  lastMessageAt: Date;
  createdAt: Date;
  userName: string | null;
  userEmail: string | null;
}

export default function AdminSupport() {
  const { user, loading } = useAuth();
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Получить все чаты
  const { data: chats = [], refetch: refetchChats } = trpc.support.getAllChats.useQuery(undefined, {
    refetchInterval: 5000, // Обновление каждые 5 секунд
  });

  // Получить сообщения выбранного чата
  const { data: messages = [], refetch: refetchMessages } = trpc.support.getMessages.useQuery(
    { chatId: selectedChatId! },
    { enabled: !!selectedChatId, refetchInterval: 3000 }
  );

  // Отправить сообщение
  const sendMessageMutation = trpc.support.adminSendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      refetchMessages();
      refetchChats();
    },
  });

  // Отметить как прочитанное
  const markAsReadMutation = trpc.support.adminMarkAsRead.useMutation({
    onSuccess: () => {
      refetchChats();
    },
  });

  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Отметить сообщения как прочитанные при выборе чата
  useEffect(() => {
    if (selectedChatId) {
      markAsReadMutation.mutate({ chatId: selectedChatId });
    }
  }, [selectedChatId]);

  // Проверка прав доступа
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <h1 className="text-2xl font-bold">Доступ запрещен</h1>
        <p className="text-muted-foreground">У вас нет прав для просмотра этой страницы</p>
        <Link href="/">
          <Button>
            <Home className="w-4 h-4 mr-2" />
            На главную
          </Button>
        </Link>
      </div>
    );
  }

  const handleSend = () => {
    if (!message.trim() || !selectedChatId) return;
    
    sendMessageMutation.mutate({
      chatId: selectedChatId,
      message: message.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const selectedChat = chats.find((c: Chat) => c.id === selectedChatId);

  // Подсчет непрочитанных сообщений для каждого чата
  const getUnreadCount = (chatId: number) => {
    // Это упрощенная версия - в реальности нужно получать из API
    return 0;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Чаты поддержки</h1>
          </div>
          <Link href="/admin">
            <Button variant="outline">
              Назад к админ-панели
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Список чатов */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Активные чаты</CardTitle>
              <CardDescription>Всего чатов: {chats.length}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-y-auto max-h-[calc(100vh-320px)]">
                {chats.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Нет активных чатов
                  </div>
                ) : (
                  chats.map((chat: Chat) => (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChatId(chat.id)}
                      className={`w-full p-4 border-b hover:bg-accent transition-colors text-left ${
                        selectedChatId === chat.id ? "bg-accent" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {chat.userName || "Пользователь"}
                          </p>
                          <p className="text-sm text-muted-foreground truncate">
                            {chat.userEmail || "Нет email"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(chat.lastMessageAt).toLocaleString("ru-RU")}
                          </p>
                        </div>
                        <Badge variant={chat.status === "open" ? "default" : "secondary"}>
                          {chat.status === "open" ? "Открыт" : "Закрыт"}
                        </Badge>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Окно чата */}
          <Card className="md:col-span-2 flex flex-col">
            {selectedChat ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedChat.userName || "Пользователь"}</CardTitle>
                      <CardDescription>{selectedChat.userEmail}</CardDescription>
                    </div>
                    <Badge variant={selectedChat.status === "open" ? "default" : "secondary"}>
                      {selectedChat.status === "open" ? "Открыт" : "Закрыт"}
                    </Badge>
                  </div>
                </CardHeader>

                {/* Сообщения */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg: Message) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderRole === "admin" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.senderRole === "admin"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </CardContent>

                {/* Поле ввода */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Введите ответ..."
                      className="flex-1"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!message.trim() || sendMessageMutation.isPending}
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Выберите чат для просмотра сообщений</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
