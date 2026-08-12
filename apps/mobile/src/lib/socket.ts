import Constants from "expo-constants";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/features/auth/store/authStore";

const apiUrl = (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? "http://localhost:4000/api/v1";
// Socket.IO attaches to the HTTP server root, not the /api/v1 REST prefix.
const socketUrl = apiUrl.replace(/\/api\/v1\/?$/, "");

let socket: Socket | null = null;

/** Lazily creates (or reuses) the single app-wide socket connection, authenticated with the current access token. */
export function getSocket(): Socket {
  const token = useAuthStore.getState().accessToken;

  if (!socket) {
    socket = io(socketUrl, { autoConnect: false, auth: { token } });
  } else {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
