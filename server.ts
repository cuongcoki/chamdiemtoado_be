/**
 * Node modules
 */
import express from "express";
import { createServer } from "http";

/**
 * Config & Setup
 */
import config from "@/config";
import configApp from "@/config/configApp";
import { logger } from "@/helpers/winston";

/**
 * Database
 */
import { connectToDatabase, disconnectFromDatabase } from "@/database/mongoose";

/**
 * Routes
 */
import publicRouter from "@/routes/public";
import privateRouter from "@/routes/private";

/**
 * Middlewares
 */
import authenticate from "@/middlewares/authenticate";

import {
  enhancedErrorHandler,
  notFoundHandler,
} from "@/helpers/errorHandle";

// TEST LOG NGAY TỪ ĐẦU
console.log("🔥 BẮT ĐẦU KHỞI ĐỘNG SERVER...");
logger.info("🔥 Logger hoạt động!");

// ========================================
// KHỞI TẠO EXPRESS APP & HTTP SERVER
// ========================================
const app = express();
const httpServer = createServer(app);
console.log("✅ Đã khởi tạo Express app");

// ========================================
// CẤU HÌNH MIDDLEWARE
// ========================================
configApp(app);
console.log("✅ Đã config app");

// ========================================
// ROUTES
// ========================================

// ** Public API here
app.use("/api/public", publicRouter);

// ** Private API here
app.use("/api/*", authenticate);

app.use("/api/private", privateRouter);

// 404 Handler
app.use(notFoundHandler);

// ✅ Dùng enhancedErrorHandler
app.use(enhancedErrorHandler); // ← Không phải errorHandler

// ========================================

// ========================================
// KHỞI ĐỘNG SERVER
// ========================================
const startServer = async () => {
  try {
    console.log("🔄 Đang kết nối database...");

    // Kết nối database
    await connectToDatabase();

    console.log("✅ Đã kết nối database");

    // Khởi động server
    const PORT = config.PORT;
    const HOST = config.HOST || "0.0.0.0";

     httpServer.listen(PORT, HOST, () => {
      console.log('='.repeat(50));
      
      // ✅ Không hardcode localhost
      if (config.NODE_ENV === 'development') {
        logger.info(`🚀 Server: http://localhost:${PORT}`);
      } else {
        logger.info(`🚀 Server đang chạy tại PORT: ${PORT}`);
        logger.info(`🌐 HOST: ${HOST}`);
      }
      
      logger.info(`🌍 Môi trường: ${config.NODE_ENV}`);
    //   logger.info(`🔌 Socket.IO ready`);
      console.log('='.repeat(50));
    });
    

    // ========================================
    // GRACEFUL SHUTDOWN
    // ========================================

    const handleShutdown = async (signal: string) => {
      logger.warn(`\n🛑 Nhận tín hiệu ${signal}. Đang tắt server...`);

      httpServer.close(async () => {
        logger.info("✅ Đã đóng tất cả kết nối HTTP");

        try {
          await disconnectFromDatabase();
          logger.info("✅ Server đã tắt hoàn toàn");
          process.exit(0);
        } catch (error) {
          logger.error("❌ Lỗi khi tắt server:", error);
          process.exit(1);
        }
      });

      setTimeout(() => {
        logger.error("⚠️  Không thể tắt server gracefully, buộc phải tắt");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));

    process.on("uncaughtException", (error) => {
      console.error("❌ Uncaught Exception:", error);
      logger.error("❌ Uncaught Exception:", error);
      handleShutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("❌ Unhandled Rejection:", reason);
      logger.error("❌ Unhandled Rejection tại:", promise, "lý do:", reason);
      handleShutdown("unhandledRejection");
    });
  } catch (error) {
    console.error("❌ LỖI KHI KHỞI ĐỘNG SERVER:", error);
    logger.error("❌ Lỗi khi khởi động server:", error);
    process.exit(1);
  }
};

// Bắt đầu server
console.log("🎬 Gọi startServer()...");
startServer();

export default app;
