import "dotenv/config";
import http from "node:http";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { initSocket } from "./lib/socket.js";

async function main() {
  await connectDatabase();

  const app = createApp();
  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT} (HTTP + Socket.IO)`);
  });
}

main().catch((err) => {
  console.error("[server] failed to start:", err);
  process.exit(1);
});
