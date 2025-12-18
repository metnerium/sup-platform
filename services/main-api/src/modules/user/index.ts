export { userService, UserService } from './user.service';
export { userController, UserController } from './user.controller';
export {
  validate,
  updateUserSchema,
  updateAvatarSchema,
  updateStatusSchema,
  searchUsersSchema,
  addContactSchema,
  blockUserSchema,
  userIdParamSchema,
  contactIdParamSchema,
  blockedUserIdParamSchema,
} from './user.validator';
export { default as userRoutes } from './user.routes';
