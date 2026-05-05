import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BadRequestError } from '@/helpers/errorHandle';
import config from '@/config';
import type { Request } from 'express';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 12 * 1024 * 1024; // 12MB

// Thư mục gốc dự án — process.cwd() luôn là nơi chạy lệnh node/ts-node
export const PROJECT_ROOT = process.cwd();
const UPLOAD_ROOT = path.join(PROJECT_ROOT, 'uploads/image');

const createStorage = (folder: string) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dest = path.join(UPLOAD_ROOT, folder);
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req: Request, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = `${folder}-${req.user?.userId ?? 'unknown'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
      cb(null, name);
    },
  });

const imageFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(new BadRequestError('Chỉ chấp nhận file ảnh: jpeg, jpg, png, webp'));
  }
  cb(null, true);
};

// Avatar - folder: upload/image/users/
export const uploadUserAvatar = multer({
  storage: createStorage('users'),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('avatar');

// Location images - folder: upload/image/locations/
export const uploadLocationImages = multer({
  storage: createStorage('locations'),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).array('images', 10);

/**
 * Xóa file vật lý nếu là file local (không phải URL bên ngoài)
 */
export const deleteLocalFile = (filePath: string): void => {
  if (!filePath || filePath.startsWith('http')) return;
  const fullPath = path.join(PROJECT_ROOT, filePath.replace(/^\//, ''));
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
};

/**
 * Chuyển absolute path → relative public URL
 * VD: .../src/upload/image/users/x.jpg → /upload/image/users/x.jpg
 */
export const toPublicUrl = (absolutePath: string): string => {
  const normalized = absolutePath.replace(/\\/g, '/');
  const idx = normalized.indexOf('/uploads/');
  return idx !== -1 ? normalized.slice(idx) : absolutePath;
};

// Backup ZIP upload - lưu vào memory để adm-zip đọc trực tiếp
export const uploadBackupZip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new BadRequestError('Chỉ chấp nhận file .zip'));
    }
  },
}).single('backup');

/**
 * Chuyển relative URL → full URL kèm domain
 * VD: /upload/image/users/x.jpg → http://localhost:3001/upload/image/users/x.jpg
 */
export const toFullUrl = (relativeUrl: string): string => {
  if (!relativeUrl) return relativeUrl;
  if (relativeUrl.startsWith('http')) return relativeUrl;
  const base = config.BASE_URL.replace(/\/$/, '');
  return `${base}${relativeUrl}`;
};
