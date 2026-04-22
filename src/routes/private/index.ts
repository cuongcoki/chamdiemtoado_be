/**
 * Node modules
 */
import { Router } from 'express';

/**
 * Middlewares
 */
import authenticate from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';

/**
 * Controllers
 */
import authController from '@/controllers/user_controller';
import adminUserController from '@/controllers/admin_user_controller';
import locationController from '@/controllers/location_controller';

/**
 * Validations
 */
import { uploadUserAvatar, uploadLocationImages } from '@/helpers/upload';
import {
  createUserValidation,
  updateUserValidation,
  updateProfileValidation,
  changePasswordValidation,
  userIdParamValidation,
} from '@/routes/validations/user_validation';
import {
  createLocationValidation,
  updateLocationValidation,
  locationIdParamValidation,
  getLocationsQueryValidation,
  parseLocationFields,
} from '@/routes/validations/location_validation';

const privateRouter = Router();

privateRouter.use(authenticate);

// --- Me ---
privateRouter.get('/me', authController.myProfile);
privateRouter.put('/me', updateProfileValidation, authController.updateMyProfile);
privateRouter.post('/me/avatar', uploadUserAvatar, authController.uploadAvatar);
privateRouter.patch('/me/password', changePasswordValidation, authController.changePassword);

// --- Admin: User Management ---
privateRouter.get('/users', authorize('admin'), adminUserController.getUsers);
privateRouter.get('/users/:id', authorize('admin'), userIdParamValidation, adminUserController.getUserById);
privateRouter.post('/users', authorize('admin'), createUserValidation, adminUserController.createUser);
privateRouter.put('/users/:id', authorize('admin'), updateUserValidation, adminUserController.updateUser);
privateRouter.patch('/users/:id/active', authorize('admin'), userIdParamValidation, adminUserController.toggleActiveUser);
privateRouter.delete('/users/:id', authorize('admin'), userIdParamValidation, adminUserController.deleteUser);
privateRouter.delete('/users', authorize('admin'), adminUserController.deleteManyUsers);

// --- Location ---
privateRouter.get('/locations/statistics', locationController.getStatistics);
privateRouter.get('/locations/map', locationController.getMapData);
privateRouter.get('/locations', getLocationsQueryValidation, locationController.getLocations);
privateRouter.get('/locations/:id', locationIdParamValidation, locationController.getLocationById);
privateRouter.post('/locations', uploadLocationImages, parseLocationFields, createLocationValidation, locationController.createLocation);
privateRouter.put('/locations/:id', uploadLocationImages, parseLocationFields, updateLocationValidation, locationController.updateLocation);
privateRouter.delete('/locations/:id', locationIdParamValidation, locationController.deleteLocation);
privateRouter.delete('/locations', locationController.deleteManyLocations);

export default privateRouter;
