import "dotenv/config";
import app from "./app";
import { prisma } from "./config/prisma";

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$connect();

    console.log("Database connected successfully");

    const server = app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Booth Command API running on port ${PORT}`);
      console.log(`http://0.0.0.0:${PORT}`);
    });

    // 20-minute server timeouts for heavy bulk import processing
    server.timeout = 1200000;
    server.keepAliveTimeout = 1210000;
    server.headersTimeout = 1220000;

    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Shutting down...`);

      server.close(async () => {
        await prisma.$disconnect();

        console.log("Database disconnected");
        console.log("Server stopped");

        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error("Database connection failed:", error);

    await prisma.$disconnect();

    process.exit(1);
  }
}

startServer();