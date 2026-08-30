import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env.js";
import { verifyAccessToken } from "./jwt.js";
import { messageService } from "../features/messages/message.service.js";
import { createMessageSchema } from "../features/messages/message.validation.js";
import { broadcastToConversation, conversationRoom, emitToUser, setRealtimeServer } from "./realtime.js";

interface AuthedSocket extends Socket {
  userId?: string;
}

/**
 * Wires Socket.IO onto the same HTTP server as Express. Auth mirrors the REST API's JWT
 * (access token passed as `auth.token` on connect) so the same session covers both.
 */
export function initSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN },
  });
  setRealtimeServer(io);

  io.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Authentication required"));

    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error("Session expired"));
    }
  });

  io.on("connection", (socket: AuthedSocket) => {
    const userId = socket.userId;
    if (!userId) return;

    // Personal room for direct notifications (new applicant, job won, etc.) regardless of open chat.
    void socket.join(`user:${userId}`);

    socket.on("job:join", async (payload: { jobId: string; workerId: string }, ack?: (ok: boolean, error?: string) => void) => {
      try {
        await messageService.assertParticipant(payload.jobId, payload.workerId, userId);
        await socket.join(conversationRoom(payload.jobId, payload.workerId));
        ack?.(true);
      } catch (err) {
        ack?.(false, err instanceof Error ? err.message : "Unable to join conversation");
      }
    });

    socket.on("job:leave", (payload: { jobId: string; workerId: string }) => {
      void socket.leave(conversationRoom(payload.jobId, payload.workerId));
    });

    socket.on(
      "message:send",
      async (
        payload: { jobId: string; workerId: string; text?: string; attachmentUrl?: string },
        ack?: (ok: boolean, error?: string) => void
      ) => {
        try {
          const input = createMessageSchema.parse({ text: payload.text, attachmentUrl: payload.attachmentUrl });
          const message = await messageService.send(payload.jobId, payload.workerId, userId, input);
          broadcastToConversation(payload.jobId, payload.workerId, "message:new", message);
          ack?.(true);
        } catch (err) {
          ack?.(false, err instanceof Error ? err.message : "Couldn't send message");
        }
      }
    );
  });

  return io;
}

/** Emits a notification to a specific user's personal room — for use outside request/response flow. */
export function notifyUser(userId: string, event: string, payload: unknown) {
  emitToUser(userId, event, payload);
}

/** Kept as a compatibility export for controllers that broadcast persisted messages. */
export { broadcastToConversation } from "./realtime.js";
