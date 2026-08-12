import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env.js";
import { verifyAccessToken } from "./jwt.js";
import { messageService } from "../features/messages/message.service.js";
import { createMessageSchema } from "../features/messages/message.validation.js";

let io: Server | null = null;

/** Broadcasts to a job's room. A no-op if Socket.IO isn't running (e.g. tests, or REST-only
 * environments) — real-time delivery is a bonus on top of the persisted message, not a dependency. */
export function broadcastToJob(jobId: string, event: string, payload: unknown) {
  io?.to(`job:${jobId}`).emit(event, payload);
}

interface AuthedSocket extends Socket {
  userId?: string;
}

/**
 * Wires Socket.IO onto the same HTTP server as Express. Auth mirrors the REST API's JWT
 * (access token passed as `auth.token` on connect) so the same session covers both.
 */
export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN },
  });

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

    socket.on("job:join", async (jobId: string, ack?: (ok: boolean, error?: string) => void) => {
      try {
        await messageService.assertParticipant(jobId, userId);
        await socket.join(`job:${jobId}`);
        ack?.(true);
      } catch (err) {
        ack?.(false, err instanceof Error ? err.message : "Unable to join conversation");
      }
    });

    socket.on("job:leave", (jobId: string) => {
      void socket.leave(`job:${jobId}`);
    });

    socket.on("message:send", async (payload: { jobId: string; text?: string; attachmentUrl?: string }, ack?: (ok: boolean, error?: string) => void) => {
      try {
        const input = createMessageSchema.parse({ text: payload.text, attachmentUrl: payload.attachmentUrl });
        const message = await messageService.send(payload.jobId, userId, input);
        broadcastToJob(payload.jobId, "message:new", message);
        ack?.(true);
      } catch (err) {
        ack?.(false, err instanceof Error ? err.message : "Couldn't send message");
      }
    });
  });

  return io;
}

/** Emits a notification to a specific user's personal room — for use outside request/response flow. */
export function notifyUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
