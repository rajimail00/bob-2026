import type { Server } from "socket.io";

let io: Server | null = null;

function conversationRoom(jobId: string, workerId: string) {
  return `job:${jobId}:worker:${workerId}`;
}

export function setRealtimeServer(server: Server) {
  io = server;
}

/** A no-op when Socket.IO is not running, such as during REST integration tests. */
export function broadcastToConversation(jobId: string, workerId: string, event: string, payload: unknown) {
  io?.to(conversationRoom(jobId, workerId)).emit(event, payload);
}

/** Emits to the personal room joined by every authenticated socket for this user. */
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export { conversationRoom };
