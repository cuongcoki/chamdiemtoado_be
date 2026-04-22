/**
 * Node modules
 */
import express, { Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import path from "path";

/**
 * Config & Helpers
 */
import config from ".";
import limiter from "../helpers/express_rate_limit";
import { logger } from "../helpers/winston";

/**
 * Types
 */
import { CorsOptions } from "cors";

/**
 * Cấu hình các middleware cho Express application
 * @param app - Express application instance
 */
const configApp = (app: Express): void => {
  // ========================================
  // CẤU HÌNH CORS
  // ========================================
  const corsOptions: CorsOptions = {
    origin(origin, callback) {
      // Cho phép request từ:
      // - Development environment (không có origin header)
      // - Các domain trong whitelist
      if (
        config.NODE_ENV === "development" ||
        !origin ||
        config.WHITELIST_ORIGINS.includes(origin)
      ) {
        callback(null, true);
      } else {
        // Từ chối request từ domain không được phép
        callback(
          new Error(`CORS error: ${origin} không được phép truy cập`),
          false
        );
        logger.warn(`CORS error: ${origin} không được phép truy cập`);
      }
    },
    credentials: true, // Cho phép gửi cookies
  };

  // Áp dụng CORS middleware
  app.use(cors(corsOptions));

  // ========================================
  // PARSER MIDDLEWARE
  // ========================================

  // Parse JSON request body
  app.use(express.json({ limit: "10mb" }));

  // Parse URL-encoded request body (form data)
  // extended: true cho phép parse nested objects
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Parse cookies từ request headers
  app.use(cookieParser());

  // ========================================
  // BẢO MẬT & PERFORMANCE
  // ========================================

  // Nén response để giảm kích thước và tăng tốc độ
  app.use(
    compression({
      threshold: 1024, // Chỉ nén response lớn hơn 1KB
      level: 6, // Mức độ nén (0-9, mặc định là 6)
    })
  );

  // Cài đặt các HTTP headers bảo mật với Helmet
  app.use(helmet());

  // ========================================
  // RATE LIMITING
  // ========================================

  // Giới hạn số lượng request để tránh spam và DDoS
  app.use(limiter);

  // ========================================
  // STATIC FILES - UPLOAD FOLDER
  // ========================================

  // Serve static files từ folder upload
  app.use('/upload', express.static(path.join(__dirname, '../upload')));

  // ========================================
  // LOGGING
  // ========================================

  // Log tất cả các incoming requests
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
    next();
  });

  logger.info("✅ Đã cấu hình tất cả middleware thành công");
};

export default configApp;