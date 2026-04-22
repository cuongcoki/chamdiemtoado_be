import { logger } from '@/helpers/winston';
import { BadRequestError, NotFoundError, ForbiddenError } from '@/helpers/errorHandle';
import { deleteLocalFile, toPublicUrl, toFullUrl } from '@/helpers/upload';
import Location from '@/models/location';
import type { IImage } from '@/models/location';
import type { Request, Response, NextFunction } from 'express';

const withFullImageUrls = (location: any) => {
  const obj = location.toObject ? location.toObject() : { ...location };
  obj.images = (obj.images ?? []).map((img: any) => ({
    ...img,
    url: toFullUrl(img.url),
  }));
  return obj;
};

const parseJSON = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== 'string') return (value ?? fallback) as T;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

class LocationController {
  /**
   * POST /locations - Tạo location (form-data)
   * Fields: ten_xa, ten_huyen, ten_tinh, toa_do (JSON), note,
   *         image_type, cham_diem (JSON)
   * Files:  images[] (tối đa 10 ảnh)
   */
  async createLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const files = (req.files as Express.Multer.File[]) ?? [];

      const toa_do   = parseJSON(req.body.toa_do,   null);
      const cham_diem = parseJSON(req.body.cham_diem, null);

      if (!toa_do)    throw new BadRequestError('toa_do không hợp lệ (JSON)');
      if (!cham_diem) throw new BadRequestError('cham_diem không hợp lệ (JSON)');

      // Build images từ file upload
      const captions: string[] = parseJSON(req.body.captions, []);
      const uploadedImages: IImage[] = files.map((f, i) => ({
        url: toPublicUrl(f.path),
        ...(captions[i] ? { caption: captions[i] } : {}),
      }));

      const image_type = uploadedImages.length > 1 ? 'multi' : 'single';

      const location = await Location.create({
        ten_xa:           req.body.ten_xa,
        ten_huyen:        req.body.ten_huyen ?? null,
        ten_tinh:         req.body.ten_tinh  ?? null,
        toa_do,
        note:             req.body.note,
        image_type,
        images:           uploadedImages,
        cham_diem,
        created_by:       req.user!.userId,
      });

      logger.info(`Location created: ${location.id} by user ${req.user!.userId}`);

      res.status(201).json({
        success: true,
        message: 'Tạo location thành công',
        data: { location: withFullImageUrls(location) },
      });
    } catch (error) {
      // Nếu lỗi → xóa file vừa upload
      const files = (req.files as Express.Multer.File[]) ?? [];
      files.forEach((f) => deleteLocalFile(toPublicUrl(f.path)));
      next(error);
    }
  }

  /**
   * PUT /locations/:id - Cập nhật location (form-data)
   * Fields: (bất kỳ field nào cần update)
   *         existing_images (JSON) = mảng ảnh cũ muốn GIỮ LẠI
   *         captions (JSON) = caption cho ảnh mới upload
   * Files:  images[] = ảnh mới thêm vào
   *
   * Logic ảnh:
   *   - Ảnh trong DB nhưng KHÔNG có trong existing_images → bị xóa file + xóa khỏi DB
   *   - Ảnh mới upload → thêm vào
   *   - Kết quả = existing_images + ảnh mới
   */
  async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const location = await Location.findById(req.params.id);
      if (!location) throw new NotFoundError('Không tìm thấy location');

      if (
        req.user!.role !== 'admin' &&
        location.created_by.toString() !== req.user!.userId
      ) {
        throw new ForbiddenError('Bạn không có quyền chỉnh sửa location này');
      }

      const files = (req.files as Express.Multer.File[]) ?? [];

      // Ảnh cũ muốn giữ lại
      const existingImages: IImage[] = parseJSON(req.body.existing_images, location.images as IImage[]);

      // Tìm ảnh bị xóa (có trong DB nhưng không trong existing_images)
      const keepUrls = new Set(existingImages.map((img) => img.url));
      const removedImages = (location.images as IImage[]).filter((img) => !keepUrls.has(img.url));
      removedImages.forEach((img) => deleteLocalFile(img.url));

      // Build ảnh mới upload
      const captions: string[] = parseJSON(req.body.captions, []);
      const newImages: IImage[] = files.map((f, i) => ({
        url: toPublicUrl(f.path),
        ...(captions[i] ? { caption: captions[i] } : {}),
      }));

      const mergedImages = [...existingImages, ...newImages];
      const image_type = mergedImages.length > 1 ? 'multi' : 'single';

      // Cập nhật các field text
      if (req.body.ten_xa    !== undefined) location.ten_xa    = req.body.ten_xa;
      if (req.body.ten_huyen !== undefined) location.ten_huyen = req.body.ten_huyen;
      if (req.body.ten_tinh  !== undefined) location.ten_tinh  = req.body.ten_tinh;
      if (req.body.note             !== undefined) location.note             = req.body.note;

      const toa_do    = parseJSON(req.body.toa_do, null);
      const cham_diem = parseJSON(req.body.cham_diem, null);
      if (toa_do)    location.toa_do    = toa_do;
      if (cham_diem) location.cham_diem = cham_diem;

      location.images     = mergedImages;
      location.image_type = image_type;

      await location.save();

      logger.info(`Location updated: ${location.id} by user ${req.user!.userId}`);

      res.json({
        success: true,
        message: 'Cập nhật location thành công',
        data: { location: withFullImageUrls(location) },
      });
    } catch (error) {
      const files = (req.files as Express.Multer.File[]) ?? [];
      files.forEach((f) => deleteLocalFile(toPublicUrl(f.path)));
      next(error);
    }
  }

  /**
   * DELETE /locations/:id - Xóa location + toàn bộ ảnh
   */
  async deleteLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const location = await Location.findById(req.params.id);
      if (!location) throw new NotFoundError('Không tìm thấy location');

      if (
        req.user!.role !== 'admin' &&
        location.created_by.toString() !== req.user!.userId
      ) {
        throw new ForbiddenError('Bạn không có quyền xóa location này');
      }

      // Xóa toàn bộ file ảnh
      (location.images as IImage[]).forEach((img) => deleteLocalFile(img.url));

      await location.deleteOne();
      logger.info(`Location deleted: ${req.params.id} by user ${req.user!.userId}`);

      res.json({ success: true, message: 'Xóa location thành công' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /locations/bulk - Xóa nhiều location theo mảng ids
   */
  async deleteManyLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        throw new BadRequestError('ids phải là mảng và không được rỗng');
      }

      const filter: Record<string, any> = { _id: { $in: ids } };
      if (req.user!.role !== 'admin') filter.created_by = req.user!.userId;

      const locations = await Location.find(filter);

      if (locations.length === 0) {
        throw new NotFoundError('Không tìm thấy location nào để xóa');
      }

      // Xóa toàn bộ file ảnh
      locations.forEach((loc) =>
        (loc.images as IImage[]).forEach((img) => deleteLocalFile(img.url))
      );

      const result = await Location.deleteMany(filter);

      logger.info(`Deleted ${result.deletedCount} locations by user ${req.user!.userId}`);

      res.json({
        success: true,
        message: `Đã xóa ${result.deletedCount} location`,
        data: { deletedCount: result.deletedCount },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /locations - Danh sách (filter + phân trang)
   */
  async getLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
      const skip  = (page - 1) * limit;

      const filter: Record<string, any> = {};
      if (req.query.ten_tinh)  filter.ten_tinh  = { $regex: req.query.ten_tinh,  $options: 'i' };
      if (req.query.ten_huyen) filter.ten_huyen = { $regex: req.query.ten_huyen, $options: 'i' };
      if (req.query.ten_xa)    filter.ten_xa    = { $regex: req.query.ten_xa,    $options: 'i' };
      if (req.query.muc_do_nguy_hiem) filter['cham_diem.nguy_co'] = req.query.muc_do_nguy_hiem;
      if (req.user!.role !== 'admin') filter.created_by = req.user!.userId;

      const [locations, total] = await Promise.all([
        Location.find(filter)
          .populate('created_by', 'username name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Location.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          locations: locations.map(withFullImageUrls),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /locations/:id - Chi tiết
   */
  async getLocationById(req: Request, res: Response, next: NextFunction) {
    try {
      const location = await Location.findById(req.params.id)
        .populate('created_by', 'username name');
      if (!location) throw new NotFoundError('Không tìm thấy location');

      if (
        req.user!.role !== 'admin' &&
        location.created_by.toString() !== req.user!.userId
      ) {
        throw new ForbiddenError('Bạn không có quyền xem location này');
      }

      res.json({ success: true, data: { location: withFullImageUrls(location) } });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /locations/statistics - Thống kê tổng quan
   */
  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const filter: Record<string, any> = {};
      if (req.user!.role !== 'admin') filter.created_by = req.user!.userId;

      const [byMucDo, byTinh, total] = await Promise.all([
        Location.aggregate([
          { $match: filter },
          { $group: { _id: '$cham_diem.nguy_co', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Location.aggregate([
          { $match: filter },
          { $group: { _id: '$ten_tinh', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        Location.countDocuments(filter),
      ]);

      // Đảm bảo luôn trả đủ 3 mức dù count = 0
      const mucDoMap = Object.fromEntries(byMucDo.map((x: any) => [x._id, x.count]));
      const mucDoResult = (['cao', 'trung bình', 'thấp'] as const).map((level) => ({
        muc_do: level,
        count: mucDoMap[level] ?? 0,
      }));

      res.json({
        success: true,
        data: {
          total,
          by_muc_do_nguy_hiem: mucDoResult,
          by_tinh: byTinh.map((x: any) => ({ ten_tinh: x._id, count: x.count })),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /locations/map - Dữ liệu nhẹ cho bản đồ
   */
  async getMapData(req: Request, res: Response, next: NextFunction) {
    try {
      const filter: Record<string, any> = {};
      if (req.user!.role !== 'admin') filter.created_by = req.user!.userId;
      if (req.query.muc_do_nguy_hiem) filter['cham_diem.nguy_co'] = req.query.muc_do_nguy_hiem;
      if (req.query.ten_tinh) filter.ten_tinh = { $regex: req.query.ten_tinh, $options: 'i' };

      const locations = await Location.find(filter)
        .select('_id ten_xa ten_huyen ten_tinh toa_do cham_diem.nguy_co');

      res.json({ success: true, data: { locations } });
    } catch (error) {
      next(error);
    }
  }
}

export default new LocationController();
