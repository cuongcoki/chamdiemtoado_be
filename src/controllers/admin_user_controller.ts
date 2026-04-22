import bcrypt from 'bcrypt';
import { logger } from '@/helpers/winston';
import { BadRequestError, NotFoundError } from '@/helpers/errorHandle';
import { toFullUrl, deleteLocalFile } from '@/helpers/upload';
import User from '@/models/user';
import type { Request, Response, NextFunction } from 'express';

const withFullAvatar = (user: any) => {
  const obj = user.toObject ? user.toObject() : { ...user };
  if (obj.avatar) obj.avatar = toFullUrl(obj.avatar);
  return obj;
};

class AdminUserController {
  /**
   * GET /users - Lấy danh sách tất cả user
   */
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find().skip(skip).limit(limit).sort({ createdAt: -1 }).lean(),
        User.countDocuments(),
      ]);

      res.json({
        success: true,
        data: {
          users: users.map(withFullAvatar),
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /users/:id - Chi tiết user
   */
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) throw new NotFoundError('Không tìm thấy user');

      res.json({ success: true, data: { user: withFullAvatar(user) } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /users - Tạo user mới
   */
  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password, name, email, role } = req.body;

      const existingUsername = await User.findOne({ username: username.toLowerCase() });
      if (existingUsername) throw new BadRequestError('Username đã tồn tại');

      if (email) {
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) throw new BadRequestError('Email đã tồn tại');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        username,
        name: name || username,
        email: email || undefined,
        password: hashedPassword,
        role: role || 'user',
      });

      logger.info(`Admin created user: ${user.username}`);

      res.status(201).json({
        success: true,
        message: 'Tạo user thành công',
        data: { user: withFullAvatar(user) },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /users/:id - Cập nhật thông tin user
   */
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { username ,name, email, role, avatar } = req.body;

      const user = await User.findById(req.params.id);
      if (!user) throw new NotFoundError('Không tìm thấy user');

      if (username && username !== user.username) {
        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) throw new BadRequestError('Username đã tồn tại');
      }

      if (email && email !== user.email) {
        const existingEmail = await User.findOne({ email: email.toLowerCase() });
        if (existingEmail) throw new BadRequestError('Email đã tồn tại');
      }

      if (username !== undefined) user.username = username.toLowerCase();
      if (name !== undefined) user.name = name;
      if (email !== undefined) user.email = email;
      if (role !== undefined) user.role = role;
      if (avatar !== undefined) user.avatar = avatar;

      await user.save();

      logger.info(`Admin updated user: ${user.username}`);

      res.json({
        success: true,
        message: 'Cập nhật user thành công',
        data: { user: withFullAvatar(user) },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /users/:id - Xóa 1 user
   */
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) throw new NotFoundError('Không tìm thấy user');

      if (user.avatar) deleteLocalFile(user.avatar);
      await user.deleteOne();
      logger.info(`Admin deleted user: ${user.username}`);

      res.json({ success: true, message: 'Xóa user thành công' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /users/bulk - Xóa nhiều user theo mảng ids
   */
  async deleteManyUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestError('ids phải là mảng và không được rỗng');
      }

      const users = await User.find({ _id: { $in: ids } });
      users.forEach((u) => { if (u.avatar) deleteLocalFile(u.avatar); });

      const result = await User.deleteMany({ _id: { $in: ids } });

      logger.info(`Admin deleted ${result.deletedCount} users`);

      res.json({
        success: true,
        message: `Đã xóa ${result.deletedCount} user`,
        data: { deletedCount: result.deletedCount },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /users/:id/active - Bật/tắt trạng thái active
   */
  async toggleActiveUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) throw new NotFoundError('Không tìm thấy user');

      user.isActive = !user.isActive;
      await user.save();

      logger.info(`Admin toggled user active: ${user.username} → ${user.isActive}`);

      res.json({
        success: true,
        message: `Tài khoản đã được ${user.isActive ? 'kích hoạt' : 'khóa'}`,
        data: { user: withFullAvatar(user) },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AdminUserController();
