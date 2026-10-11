import "dotenv/config";
import { createApp } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port.");

const app = createApp();
await connectDatabase();
const server = app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});

let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    const forceClose = setTimeout(() => server.closeAllConnections(), 10_000);
    forceClose.unref();
    server.close((error) => {
      clearTimeout(forceClose);
      if (error) {
        console.error("Failed to close the HTTP server cleanly.", error);
        process.exitCode = 1;
      }
      void disconnectDatabase().catch((disconnectError: unknown) => {
        console.error("Failed to disconnect from the database cleanly.", disconnectError);
        process.exitCode = 1;
      });
    });
  });
}
