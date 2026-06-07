import path from 'node:path';
import multer from 'multer';
import { AppError } from '../utils/AppError.js';

const uploadDirectory = path.resolve(process.cwd(), 'uploads');

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const basename = `${file.fieldname}-${String(Date.now())}-${String(
      Math.round(Math.random() * 1_000_000)
    )}`;
    callback(null, `${basename}${extension}`);
  }
});

export const kycUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(new AppError('Only JPEG, PNG, and PDF files are allowed', 400, 'INVALID_FILE_TYPE'));
      return;
    }

    callback(null, true);
  }
});
