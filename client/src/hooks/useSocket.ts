import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/_core/hooks/useAuth";

export function useSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Создаем Socket.IO соединение
    const socket = io({
      path: "/socket.io",
      withCredentials: true,
      autoConnect: true,
      auth: {
        userId: user.id,
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket.IO] Connected");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[Socket.IO] Disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket.IO] Connection error:", error);
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const joinChat = (chatId: number) => {
    if (socketRef.current) {
      socketRef.current.emit("join_chat", chatId);
    }
  };

  const leaveChat = (chatId: number) => {
    if (socketRef.current) {
      socketRef.current.emit("leave_chat", chatId);
    }
  };

  const onNewMessage = (callback: (message: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on("new_message", callback);
    }
  };

  const offNewMessage = () => {
    if (socketRef.current) {
      socketRef.current.off("new_message");
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinChat,
    leaveChat,
    onNewMessage,
    offNewMessage,
  };
}
