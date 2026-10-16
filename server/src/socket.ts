import type { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { allowedOrigins, env } from "./env.js";
import { prisma } from "./prisma.js";
import { boardRoom, setSocketServer } from "./realtime.js";

interface SocketData {
  userId: string;
}

export function initSocketServer(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins(),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== "string" || token.length === 0) {
      next(new Error("Unauthorized"));
      return;
    }
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub?: string };
      if (!payload.sub) {
        next(new Error("Unauthorized"));
        return;
      }
      (socket.data as SocketData).userId = payload.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = (socket.data as SocketData).userId;

    socket.on("board:join", async (boardId: unknown, ack?: (result: { ok: boolean }) => void) => {
      if (typeof boardId !== "string") {
        ack?.({ ok: false });
        return;
      }
      const board = await prisma.board.findFirst({
        where: {
          id: boardId,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        select: { id: true },
      });
      if (!board) {
        ack?.({ ok: false });
        return;
      }
      await socket.join(boardRoom(boardId));
      ack?.({ ok: true });
    });

    socket.on("board:leave", (boardId: unknown) => {
      if (typeof boardId === "string") {
        socket.leave(boardRoom(boardId));
      }
    });
  });

  setSocketServer(io);
  return io;
}
