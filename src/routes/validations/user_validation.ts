import { body, param } from 'express-validator';
import { validate } from '@/helpers/errorHandle';

export const createUserValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username là bắt buộc')
    .isLength({ min: 3, max: 30 }).withMessage('Username phải từ 3 đến 30 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username chỉ được chứa chữ cái, số và dấu _'),

  body('password')
    .trim()
    .notEmpty().withMessage('Password là bắt buộc')
    .isLength({ min: 6 }).withMessage('Password phải có ít nhất 6 ký tự'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Tên phải từ 2 đến 50 ký tự'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),

  body('role')
    .optional()
    .isIn(['user', 'admin']).withMessage('Role phải là user hoặc admin'),

  validate,
];

export const updateUserValidation = [
  param('id')
    .notEmpty().withMessage('User ID là bắt buộc')
    .isMongoId().withMessage('User ID không hợp lệ'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Tên phải từ 2 đến 50 ký tự'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),

  body('role')
    .optional()
    .isIn(['user', 'admin']).withMessage('Role phải là user hoặc admin'),

  body('avatar')
    .optional({ checkFalsy: true })
    .trim()
    .isURL().withMessage('Avatar phải là URL hợp lệ'),

  validate,
];

export const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Tên phải từ 2 đến 50 ký tự'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail().withMessage('Email không hợp lệ')
    .normalizeEmail(),

  body('avatar')
    .optional({ checkFalsy: true })
    .trim()
    .isURL().withMessage('Avatar phải là URL hợp lệ'),

  validate,
];

export const changePasswordValidation = [
  body('current_password')
    .trim()
    .notEmpty().withMessage('Mật khẩu hiện tại là bắt buộc'),

  body('new_password')
    .trim()
    .notEmpty().withMessage('Mật khẩu mới là bắt buộc')
    .isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự'),

  validate,
];

export const userIdParamValidation = [
  param('id')
    .notEmpty().withMessage('User ID là bắt buộc')
    .isMongoId().withMessage('User ID không hợp lệ'),

  validate,
];
