import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

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

  // Получить или создать чат
  const { data: chat } = trpc.support.getOrCreateChat.useQuery(undefined, {
    enabled: isAuthenticated && isOpen,
  });

  // Получить сообщения
  const { data: messages = [], refetch: refetchMessages } = trpc.support.getMessages.useQuery(
    { chatId: chatId! },
    { enabled: !!chatId, refetchInterval: 3000 } // Polling каждые 3 секунды
  );

  // Отправить сообщение
  const sendMessageMutation = trpc.support.sendMessage.useMutation({
    onSuccess: () => {
      setMessage("");
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

  // Отметить сообщения как прочитанные при открытии
  useEffect(() => {
    if (isOpen && chatId) {
      markAsReadMutation.mutate({ chatId });
    }
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
