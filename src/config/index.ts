/**
 * Node modules
 */
import getEnvVar from '@/helpers/getEnvVar';
import dotenv from 'dotenv';

// Load biến môi trường từ file .env
dotenv.config();


/**
 * Cấu hình toàn bộ ứng dụng
 */
const config = {
  // ========================================
  // SERVER CONFIG
  // ========================================
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // ========================================
  // DATABASE CONFIG
  // ========================================
  MONGO_URI: getEnvVar('MONGO_URI', 'mongodb://localhost:27017/lms-database'),

  // ========================================
  // CORS CONFIG
  // ========================================
  WHITELIST_ORIGINS: process.env.WHITELIST_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://14.225.211.7:8333'

  ],

  HOST: process.env.HOST || '0.0.0.0',
  BASE_URL: process.env.BASE_URL || `http://localhost:${Number(process.env.PORT) || 3001}`,

  // ========================================
  // LOGGING CONFIG
  // ========================================
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // ========================================
  // PAGINATION CONFIG
  // ========================================
  defaultReslimit: 20,
  defaultResOffset: 0,

  // ========================================
  // JWT CONFIG - BẮT BUỘC PHẢI CÓ
  // ========================================
  JWT_ACCESS_SECRET: getEnvVar(
    'JWT_ACCESS_SECRET',
    'default-access-secret-change-in-production'
  ),
  JWT_REFRESH_SECRET: getEnvVar(
    'JWT_REFRESH_SECRET',
    'default-refresh-secret-change-in-production'
  ),
  JWT_ACCESS_EXPIRE: process.env.JWT_ACCESS_EXPIRE || '1d',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',

  // ========================================
  // EMAIL CONFIG (Nodemailer)
  // ========================================
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: Number(process.env.EMAIL_PORT) || 587,
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',

  // ========================================
  // CLOUDINARY CONFIG (Optional)
  // ========================================
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  // ========================================
  // FILE UPLOAD CONFIG
  // ========================================
  MAX_FILE_SIZE: Number(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
};

export default config;