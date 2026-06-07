import { Router } from 'express';
import {
  getKycStatusController,
  submitKycController
} from '../controllers/kycController.js';
import { authenticate } from '../middlewares/auth.js';
import { kycUpload } from '../middlewares/upload.js';

export const kycRouter = Router();

kycRouter.use(authenticate);

kycRouter.post(
  '/submit',
  kycUpload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'pan', maxCount: 1 }
  ]),
  submitKycController
);
kycRouter.get('/status', getKycStatusController);
