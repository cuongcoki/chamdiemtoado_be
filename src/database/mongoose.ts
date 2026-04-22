/**
 * Node modules
 */
import mongoose from 'mongoose';

/**
 * Custom modules
 */
import config from '../config';
import { logger } from '../helpers/winston';

/**
 * Types
 */
import type { ConnectOptions } from 'mongoose';

/**
 * Client options cho MongoDB connection
 */
const clientOptions: ConnectOptions = {
  dbName: 'lms-database',
  appName: 'LMS Backend API',
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  },
};

/**
 * Thiết lập kết nối đến MongoDB database sử dụng Mongoose.
 * 
 * - Sử dụng MONGO_URI từ config
 * - clientOptions chứa các cấu hình bổ sung
 * - Xử lý lỗi khi kết nối thất bại
 * 
 * @throws {Error} Nếu MONGO_URI không được định nghĩa hoặc kết nối thất bại
 */
export const connectToDatabase = async (): Promise<void> => {
  if (!config.MONGO_URI) {
    throw new Error('MONGO_URI không được định nghĩa trong cấu hình.');
  }

  try {
    await mongoose.connect(config.MONGO_URI, clientOptions);
    
    logger.info('✅ Kết nối database thành công', {
      dbName: clientOptions.dbName,
      appName: clientOptions.appName,
    });
  } catch (error) {
    logger.error('❌ Lỗi khi kết nối database:', error);
    
    if (error instanceof Error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Ngắt kết nối khỏi MongoDB database.
 * 
 * - Được gọi khi server shutdown gracefully
 * - Log thông tin khi ngắt kết nối thành công
 * - Xử lý lỗi nếu có
 */
export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    
    logger.info('✅ Đã ngắt kết nối database thành công');
  } catch (error) {
    logger.error('❌ Lỗi khi ngắt kết nối database:', error);
    
    if (error instanceof Error) {
      throw new Error(`Database disconnection failed: ${error.message}`);
    }
    throw error;
  }
};