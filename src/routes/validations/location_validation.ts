import { body, param, query } from 'express-validator';
import { validate } from '@/helpers/errorHandle';
import type { Request, Response, NextFunction } from 'express';

// Parse toa_do và cham_diem từ JSON string (form-data) thành object trước khi validate
export const parseLocationFields = (req: Request, _res: Response, next: NextFunction) => {
  // Trim key bị thừa whitespace/tab từ Postman
  const body = req.body as Record<string, unknown>;
  for (const key of Object.keys(body)) {
    const trimmed = key.trim();
    if (trimmed !== key) {
      body[trimmed] = body[key];
      delete body[key];
    }
  }

  const tryParse = (key: string) => {
    let val = body[key];
    while (typeof val === 'string') {
      try { val = JSON.parse(val); } catch { break; }
    }
    body[key] = val;
  };
  tryParse('toa_do');
  tryParse('cham_diem');
  tryParse('captions');
  tryParse('existing_images');

  console.log('═══════════════ REQUEST BODY ═══════════════');
  console.log('📌 text fields:', {
    ten_xa:    body.ten_xa,
    ten_huyen: body.ten_huyen,
    ten_tinh:  body.ten_tinh,
    note:      body.note,
  });
  console.log('📌 toa_do:',    JSON.stringify(body.toa_do));
  console.log('📌 cham_diem:', JSON.stringify(body.cham_diem, null, 2));
  console.log('📌 captions:',  JSON.stringify(body.captions));
  console.log('📌 files count:', (req as any).files?.length ?? 0);
  console.log('════════════════════════════════════════════');

  next();
};

const tieuChiFields = ['do_doc', 'taluy', 'lop_phu', 'loai_dat'];

const tieuChiValidation = (required: boolean) =>
  tieuChiFields.flatMap((field) => {
    const diemChain = body(`cham_diem.${field}.diem`);
    const moTaChain = body(`cham_diem.${field}.mo_ta`);

    if (required) {
      return [
        // diemChain
        //   .notEmpty().withMessage(`cham_diem.${field}.diem là bắt buộc`)
        //   .isInt({ min: 1, max: 5 }).withMessage(`cham_diem.${field}.diem phải từ 1 đến 5`),
        moTaChain
          .trim()
          .notEmpty().withMessage(`cham_diem.${field}.mo_ta là bắt buộc`),
      ];
    }

    return [
      // diemChain
      //   .optional()
      //   .isInt({ min: 1, max: 5 }).withMessage(`cham_diem.${field}.diem phải từ 1 đến 5`),
      moTaChain
        .optional()
        .trim(),
    ];
  });

export const createLocationValidation = [
  body('ten_xa').trim().notEmpty().withMessage('Tên xã là bắt buộc'),
  // body('ten_huyen').trim().notEmpty().withMessage('Tên huyện là bắt buộc'),
  // body('ten_tinh').trim().notEmpty().withMessage('Tên tỉnh là bắt buộc'),

  body('toa_do.lat')
    .notEmpty().withMessage('Vĩ độ (lat) là bắt buộc')
    .isFloat({ min: -90, max: 90 }).withMessage('Vĩ độ không hợp lệ'),
  body('toa_do.lng')
    .notEmpty().withMessage('Kinh độ (lng) là bắt buộc')
    .isFloat({ min: -180, max: 180 }).withMessage('Kinh độ không hợp lệ'),

  body('note').optional().trim(),

  body('cham_diem.nguy_co')
    .notEmpty().withMessage('Mức độ nguy hiểm (nguy_co) là bắt buộc')
    .isIn(['cao', 'trung bình', 'thấp']).withMessage('nguy_co phải là: cao, trung bình, thấp'),

  ...tieuChiValidation(true),

  validate,
];

export const updateLocationValidation = [
  param('id').isMongoId().withMessage('Location ID không hợp lệ'),

  body('ten_xa').optional().trim().notEmpty().withMessage('Tên xã không được rỗng'),
  // body('ten_huyen').optional().trim().notEmpty().withMessage('Tên huyện không được rỗng'),
  // body('ten_tinh').optional().trim().notEmpty().withMessage('Tên tỉnh không được rỗng'),

  body('toa_do.lat').optional().isFloat({ min: -90, max: 90 }).withMessage('Vĩ độ không hợp lệ'),
  body('toa_do.lng').optional().isFloat({ min: -180, max: 180 }).withMessage('Kinh độ không hợp lệ'),

  body('note').optional().trim(),

  body('muc_do_nguy_hiem')
    .optional()
    .isIn(['cao', 'trung bình', 'thấp']).withMessage('Mức độ nguy hiểm phải là: cao, trung bình, thấp'),

  ...tieuChiValidation(false),

  validate,
];

export const locationIdParamValidation = [
  param('id').isMongoId().withMessage('Location ID không hợp lệ'),
  validate,
];

export const getLocationsQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page phải là số nguyên >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit phải từ 1 đến 100'),
  query('muc_do_nguy_hiem')
    .optional()
    .isIn(['cao', 'trung bình', 'thấp']).withMessage('muc_do_nguy_hiem phải là: cao, trung bình, thấp'),
  validate,
];
