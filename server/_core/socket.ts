import { Server as HTTPServer } from "http";
import { Server as IOServer } from "socket.io";
import { sdk } from "./sdk";

export function setupSocket(httpServer: HTTPServer) {
  const io = new IOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === "development" 
        ? "http://localhost:3000" 
        : true,
      credentials: true,
    },
    path: "/socket.io",
  });

  // Middleware для аутентификации
  io.use(async (socket, next) => {
    try {
      // Создаем mock request объект для sdk.authenticateRequest
      const mockReq = {
        headers: socket.handshake.headers,
        cookies: socket.handshake.headers.cookie,
      } as any;

      const user = await sdk.authenticateRequest(mockReq);
      if (!user) {
        return next(new Error("Authentication error: No user found"));
      }

      // Сохраняем данные пользователя в socket
      socket.data.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket.IO] User connected: ${socket.data.user?.name || socket.data.user?.openId}`);

    // Присоединиться к комнате чата
    socket.on("join_chat", (chatId: number) => {
      const room = `chat_${chatId}`;
      socket.join(room);
      console.log(`[Socket.IO] User ${socket.data.user?.name} joined ${room}`);
    });

    // Покинуть комнату чата
    socket.on("leave_chat", (chatId: number) => {
      const room = `chat_${chatId}`;
      socket.leave(room);
      console.log(`[Socket.IO] User ${socket.data.user?.name} left ${room}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket.IO] User disconnected: ${socket.data.user?.name}`);
    });
  });

  return io;
}

export type SocketIOServer = ReturnType<typeof setupSocket>;
