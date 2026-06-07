import { Router } from 'express';
import {
  createSplitController,
  createSplitSchema,
  listSplitsController,
  settleSplitController,
  splitParamsSchema
} from '../controllers/splitController.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';

export const splitRouter = Router();

splitRouter.use(authenticate);

splitRouter.post('/create', validate({ body: createSplitSchema }), createSplitController);
splitRouter.get('/', listSplitsController);
splitRouter.post('/:id/settle', validate({ params: splitParamsSchema }), settleSplitController);
