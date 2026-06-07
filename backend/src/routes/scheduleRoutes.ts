import { Router } from 'express';
import {
  cancelScheduleController,
  createScheduleController,
  createScheduleSchema,
  listSchedulesController,
  scheduleParamsSchema
} from '../controllers/scheduleController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const scheduleRouter = Router();

scheduleRouter.use(authenticate);

scheduleRouter.post('/', validate({ body: createScheduleSchema }), createScheduleController);
scheduleRouter.get('/', listSchedulesController);
scheduleRouter.delete('/:id', validate({ params: scheduleParamsSchema }), cancelScheduleController);
