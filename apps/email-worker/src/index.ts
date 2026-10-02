// نقطه‌ی ورود کانتینر. email-worker.ts فقط startWorker را export می‌کرد و هیچ‌جا صدا زده نمی‌شد.
import { startWorker, stopWorker } from "./email-worker";

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[EmailWorker] ${signal} received, shutting down...`);
  try {
    await stopWorker();
    process.exit(0);
  } catch (error) {
    console.error("[EmailWorker] Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

startWorker().catch((error: unknown) => {
  console.error("[EmailWorker] Failed to start:", error);
  process.exit(1);
});
