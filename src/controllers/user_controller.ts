/**
 * Node modules
 */
import bcrypt from 'bcrypt';

/**
 * Custom modules
 */
import { jwtService } from '@/helpers/jwt';
import { logger } from '../helpers/winston';
import config from '../config';
import {
  UnauthorizedError,
  BadRequestError,
} from '@/helpers/errorHandle';

/**
 * Models
 */
import User from '@/models/user';
import { deleteLocalFile, toPublicUrl, toFullUrl } from '@/helpers/upload';

/**
 * Types
 */
import type { Request, Response, NextFunction } from 'express';

class AuthController {
  /**
   * Register - Đăng ký bằng username và password
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password, name, email } = req.body;

      if (!username || !password) {
        throw new BadRequestError('Username và password là bắt buộc');
      }

      const existingUsername = await User.findOne({ username: username.toLowerCase() });
      if (existingUsername) {
        throw new BadRequestError('Username đã tồn tại');
      }

      if (email) {
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
          throw new BadRequestError('Email đã tồn tại');
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        username,
        name: name || username,
        email: email || undefined,
        password: hashedPassword,
      });

      logger.info(`User registered: ${user.username}`);

      res.status(201).json({
        success: true,
        message: 'Đăng ký thành công',
        data: {
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login - Đăng nhập bằng email hoặc username
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, username, password } = req.body;

      if ((!email && !username) || !password) {
        throw new BadRequestError('Email/username và password là bắt buộc');
      }

      const query = email ? { email } : { username };
      const user = await User.findOne(query).select('+password');

      if (!user) {
        throw new UnauthorizedError('Thông tin đăng nhập không đúng');
      }

      if (!user.isActive) {
        throw new UnauthorizedError('Tài khoản đã bị khóa');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Thông tin đăng nhập không đúng');
      }

      const { accessToken, refreshToken } = await jwtService.generateTokens(
        user.id,
        user.role
      );

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      logger.info(`User logged in: ${user.username}`);

      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          accessToken,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: toFullUrl(user.avatar ?? ''),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * My Profile - Lấy thông tin cá nhân
   */
  async myProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) {
        throw new UnauthorizedError('Không tìm thấy tài khoản');
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: toFullUrl(user.avatar ?? ''),
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /me - Cập nhật profile cá nhân
   */
  async updateMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.user!.userId);
      if (!user) throw new UnauthorizedError('Không tìm thấy tài khoản');

      const { name, email, avatar } = req.body;

      if (email && email !== user.email) {
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) throw new BadRequestError('Email đã tồn tại');
      }

      if (name   !== undefined) user.name   = name;
      if (email  !== undefined) user.email  = email;
      if (avatar !== undefined) user.avatar = avatar;

      await user.save();
      logger.info(`User updated profile: ${user.username}`);

      res.json({
        success: true,
        message: 'Cập nhật profile thành công',
        data: {
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: toFullUrl(user.avatar ?? ''),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /me/avatar - Upload avatar
   */
  async uploadAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new BadRequestError('Vui lòng chọn file ảnh');

      const user = await User.findById(req.user!.userId);
      if (!user) throw new UnauthorizedError('Không tìm thấy tài khoản');

      // Xóa avatar cũ nếu là file local
      if (user.avatar) deleteLocalFile(user.avatar);

      user.avatar = toPublicUrl(req.file.path);
      await user.save();

      logger.info(`User uploaded avatar: ${user.username}`);

      res.json({
        success: true,
        message: 'Cập nhật avatar thành công',
        data: { avatar: user.avatar },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /me/password - Đổi mật khẩu
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { current_password, new_password } = req.body;

      const user = await User.findById(req.user!.userId).select('+password');
      if (!user) throw new UnauthorizedError('Không tìm thấy tài khoản');

      const isValid = await bcrypt.compare(current_password, user.password);
      if (!isValid) throw new BadRequestError('Mật khẩu hiện tại không đúng');

      user.password = await bcrypt.hash(new_password, 10);
      await user.save();

      logger.info(`User changed password: ${user.username}`);

      res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh Access Token - Làm mới access token
   */
  async refreshAccessToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token không tồn tại');
      }

      const newAccessToken = await jwtService.refreshAccessToken(refreshToken);

      logger.info('Access token refreshed');

      res.json({
        success: true,
        message: 'Làm mới token thành công',
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout - Đăng xuất
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('refreshToken');

      logger.info('User logged out');

      res.json({
        success: true,
        message: 'Đăng xuất thành công',
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
