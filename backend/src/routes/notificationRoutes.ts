import { Router } from 'express';
import {
  getNotifications,
  notificationQuerySchema,
  readAllNotifications
} from '../controllers/notificationController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const notificationRouter = Router();

notificationRouter.use(authenticate);

notificationRouter.get('/', validate({ query: notificationQuerySchema }), getNotifications);
notificationRouter.put('/read-all', readAllNotifications);
