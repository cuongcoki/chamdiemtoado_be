/**
 * Node modules
 */
import { Router } from 'express';

/**
 * Controllers
 */
import authController from '@/controllers/user_controller';

/**
 * Validations
 */
import { registerValidation, loginValidation } from '@/routes/validations/auth_validation';

const publicRouter = Router();

publicRouter.post('/auth/register', registerValidation, authController.register);
publicRouter.post('/auth/login', loginValidation, authController.login);
publicRouter.post('/auth/refresh-token', authController.refreshAccessToken);
publicRouter.post('/auth/logout', authController.logout);

export default publicRouter;
