import "dotenv/config";
import app from "./app.js";
import { prisma } from "./config/prisma.js";

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Booth Command API running on port ${PORT}`);
  });

  // 20-minute server timeouts for heavy bulk import processing
  server.timeout = 1200000;
  server.keepAliveTimeout = 1210000;
  server.headersTimeout = 1220000;

  try {
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    // Keep serving so CORS/health endpoints still respond; fix DATABASE_URL in Railway
    console.error("Database connection failed:", error);
  }

  const shutdown = async (signal: string) => {
    console.log(`${signal} received. Shutting down...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log("Server stopped");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startServer();