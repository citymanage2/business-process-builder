import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";

interface Message {
  id: number;
  chatId: number;
  senderId: number;
  senderRole: "user" | "admin";
  message: string;
  isRead: number;
  createdAt: Date;
}

export default function SupportChat() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chatId, setChatId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasMarkedAsRead = useRef(false);

  // Получить или создать чат
  const { data: chat } = trpc.support.getOrCreateChat.useQuery(undefined, {
    enabled: isAuthenticated && isOpen,
  });

  // WebSocket для real-time обновлений
  const { isConnected, joinChat, leaveChat, onNewMessage, offNewMessage } = useSocket();

  // Получить сообщения
  const { data: messages = [], refetch: refetchMessages } = trpc.support.getMessages.useQuery(
    { chatId: chatId! },
    { enabled: !!chatId } // Убрали polling - используем WebSocket
  );

  // Поиск FAQ по ключевым словам
  const [searchQuery, setSearchQuery] = useState("");
  const { data: faqResults = [] } = trpc.faq.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 3 }
  );

  // Отправить сообщение
  const sendMessageMutation = trpc.support.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
      setSearchQuery("");
      refetchMessages();
    },
  });

  // Отметить как прочитанное
  const markAsReadMutation = trpc.support.markAsRead.useMutation();

  // Установить chatId при получении чата
  useEffect(() => {
    if (chat) {
      setChatId(chat.id);
    }
  }, [chat]);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Подписаться на WebSocket события при открытии чата
  useEffect(() => {
    if (chatId && isOpen) {
      // Присоединиться к комнате чата
      joinChat(chatId);

      // Подписаться на новые сообщения
      onNewMessage(() => {
        refetchMessages();
      });

      return () => {
        leaveChat(chatId);
        offNewMessage();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isOpen]);

  // Отметить сообщения как прочитанные при открытии
  useEffect(() => {
    if (isOpen && chatId && !hasMarkedAsRead.current) {
      hasMarkedAsRead.current = true;
      markAsReadMutation.mutate({ chatId });
    }
    if (!isOpen) {
      hasMarkedAsRead.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, chatId]);

  const handleSend = () => {
    if (!message.trim() || !chatId) return;
    
    sendMessageMutation.mutate({
      chatId,
      message: message.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Поиск подсказок при вводе текста
  useEffect(() => {
    if (message.trim().length > 3) {
      const timer = setTimeout(() => {
        setSearchQuery(message.trim());
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchQuery("");
    }
  }, [message]);



  const handleSuggestionClick = (answer: string) => {
    setMessage(answer);
    setSearchQuery("");
  };

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      ) : (
        <Card className="w-96 h-[500px] flex flex-col shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">Поддержка</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0 hover:bg-primary-foreground/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg: Message) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderRole === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.senderRole === "user"
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
          </div>

          {/* FAQ Подсказки */}
          {faqResults.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/30 max-h-32 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-2">Возможно, это поможет:</p>
              <div className="space-y-1">
                {faqResults.map((suggestion: { id: number; question: string; answer: string }) => (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion.question)}
                    className="w-full text-left text-xs p-2 rounded hover:bg-muted transition-colors"
                  >
                    <p className="font-medium text-primary">{suggestion.question}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Введите сообщение..."
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
        </Card>
      )}
    </div>
  );
}
