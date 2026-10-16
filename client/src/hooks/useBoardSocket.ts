import { useEffect, useRef } from "react";
import { getSocket } from "../lib/socket";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Handlers = Record<string, (payload: any) => void>;

export function useBoardSocket(boardId: string | undefined, handlers: Handlers): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!boardId) {
      return;
    }
    const socket = getSocket();
    socket.connect();

    const join = () => {
      socket.emit("board:join", boardId, (result: { ok: boolean } | undefined) => {
        if (!result?.ok) {
          console.warn(`Could not join realtime room for board ${boardId}`);
        }
      });
    };
    if (socket.connected) {
      join();
    } else {
      socket.once("connect", join);
    }

    const subscriptions = Object.keys(handlersRef.current).map((event) => {
      const listener = (payload: any) => {
        handlersRef.current[event]?.(payload);
      };
      socket.on(event, listener);
      return { event, listener };
    });

    return () => {
      subscriptions.forEach(({ event, listener }) => socket.off(event, listener));
      socket.off("connect", join);
      socket.emit("board:leave", boardId);
    };
  }, [boardId]);
}
