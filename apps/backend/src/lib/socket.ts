import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { env } from "../config/env.js";
import { verifyAccessToken } from "./jwt.js";
import { jobRepository } from "../features/jobs/job.repository.js";
import { messageService } from "../features/messages/message.service.js";
import { createMessageSchema } from "../features/messages/message.validation.js";

let io: Server | null = null;

function conversationRoom(jobId: string, workerId: string) {
  return `job:${jobId}:worker:${workerId}`;
}

/** Broadcasts to one applicant's conversation room. A no-op if Socket.IO isn't running (e.g.
 * tests, or REST-only environments) — real-time delivery is a bonus on top of the persisted
 * message, not a dependency. */
export function broadcastToConversation(jobId: string, workerId: string, event: string, payload: unknown) {
  io?.to(conversationRoom(jobId, workerId)).emit(event, payload);
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
          void notifyOtherParticipant(payload.jobId, payload.workerId, userId, message);
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
  io?.to(`user:${userId}`).emit(event, payload);
}

/** Pushes a lightweight "you have a new message" ping to whichever side of the conversation
 * didn't send it, so their Orders badges can update even without the chat screen open. */
export async function notifyOtherParticipant(jobId: string, workerId: string, senderId: string, message: unknown) {
  const job = await jobRepository.findRawById(jobId);
  if (!job) return;
  const clientId = job.clientId.toString();
  const recipientId = senderId === clientId ? workerId : clientId;
  notifyUser(recipientId, "message:notify", { jobId, workerId, message });
}
