import { body } from 'express-validator';
import { validate } from '@/helpers/errorHandle';

export const registerValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username là bắt buộc')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username phải từ 3 đến 30 ký tự')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username chỉ được chứa chữ cái, số và dấu _'),

  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password là bắt buộc')
    .isLength({ min: 6 })
    .withMessage('Password phải có ít nhất 6 ký tự'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Tên phải từ 2 đến 50 ký tự'),

  body('email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),

  validate,
];

export const loginValidation = [
  body('username')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username không hợp lệ'),

  body('password')
    .trim()
    .notEmpty()
    .withMessage('Password là bắt buộc')
    .isLength({ min: 6 })
    .withMessage('Password phải có ít nhất 6 ký tự'),

  validate,
];
