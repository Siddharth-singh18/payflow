import QRCode from 'qrcode';
import { UserModel } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { transferMoney } from './walletService.js';

interface QrResponse {
  payload: string;
  qrDataUrl: string;
}

interface PayQrInput {
  senderUserId: string;
  payload: string;
  amount: number;
  note?: string;
  idempotencyKey: string;
}

const parsePayflowPayload = (payload: string): URL => {
  try {
    const parsed = new URL(payload);

    if (parsed.protocol !== 'payflow:' || parsed.hostname !== 'pay') {
      throw new Error('Invalid PayFlow QR payload');
    }

    return parsed;
  } catch {
    throw new AppError('Invalid PayFlow QR payload', 400, 'INVALID_QR_PAYLOAD');
  }
};

export const generateWalletQr = async (userId: string): Promise<QrResponse> => {
  const user = await UserModel.findById(userId).select('name').exec();

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const payload = `payflow://pay?vpa=${encodeURIComponent(userId)}&name=${encodeURIComponent(user.name)}`;
  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320
  });

  return { payload, qrDataUrl };
};

export const payViaQr = async (input: PayQrInput) => {
  const parsed = parsePayflowPayload(input.payload);
  const recipient = parsed.searchParams.get('vpa');

  if (!recipient) {
    throw new AppError('QR payload is missing recipient', 400, 'QR_RECIPIENT_MISSING');
  }

  return transferMoney({
    senderUserId: input.senderUserId,
    recipient,
    amount: input.amount,
    idempotencyKey: input.idempotencyKey,
    channel: 'qr',
    category: 'qr_payment',
    ...(input.note ? { note: input.note } : {})
  });
};
