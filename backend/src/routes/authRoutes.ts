import { Router } from 'express';
import {
  forgotPassword,
  forgotPasswordSchema,
  login,
  loginSchema,
  logout,
  refresh,
  refreshSchema,
  register,
  registerSchema,
  resetPasswordController,
  resetPasswordSchema,
  verifyOtp,
  verifyOtpSchema
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { authRateLimiter } from '../middlewares/rateLimit.js';
import { validate } from '../middlewares/validate.js';

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post('/register', validate({ body: registerSchema }), register);
authRouter.post('/verify-otp', validate({ body: verifyOtpSchema }), verifyOtp);
authRouter.post('/login', validate({ body: loginSchema }), login);
authRouter.post('/refresh', validate({ body: refreshSchema }), refresh);
authRouter.post('/logout', authenticate, validate({ body: refreshSchema }), logout);
authRouter.post('/forgot-password', validate({ body: forgotPasswordSchema }), forgotPassword);
authRouter.post('/reset-password', validate({ body: resetPasswordSchema }), resetPasswordController);
