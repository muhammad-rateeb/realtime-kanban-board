import type { Server } from "socket.io";

let io: Server | null = null;

export function setSocketServer(instance: Server): void {
  io = instance;
}

export function boardRoom(boardId: string): string {
  return `board:${boardId}`;
}

export function emitToBoard<T>(boardId: string, event: string, payload: T): void {
  if (io) {
    io.to(boardRoom(boardId)).emit(event, payload);
  }
}
