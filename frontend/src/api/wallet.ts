import { apiClient } from './client';
import type { ApiEnvelope } from '../types/auth';
import type { TransferResult, WalletBalance } from '../types/wallet';

export interface TransferPayload {
  recipient: string;
  amount: number;
  note?: string | undefined;
}

export interface WalletQr {
  payload: string;
  qrDataUrl: string;
}

export interface PayQrPayload {
  payload: string;
  amount: number;
  note?: string | undefined;
}

const createIdempotencyKey = (): string => {
  return globalThis.crypto.randomUUID();
};

export const getWalletBalance = async (): Promise<WalletBalance> => {
  const response = await apiClient.get<ApiEnvelope<{ wallet: WalletBalance }>>('/wallet/balance');
  return response.data.data.wallet;
};

export const transferMoney = async (payload: TransferPayload): Promise<TransferResult> => {
  const body = payload.note ? payload : { recipient: payload.recipient, amount: payload.amount };
  const response = await apiClient.post<ApiEnvelope<{ transfer: TransferResult }>>(
    '/wallet/transfer',
    body,
    {
      headers: {
        'X-Idempotency-Key': createIdempotencyKey(),
        'X-Device-Fingerprint': window.navigator.userAgent
      }
    }
  );
  return response.data.data.transfer;
};

export const getWalletQr = async (): Promise<WalletQr> => {
  const response = await apiClient.get<ApiEnvelope<{ qr: WalletQr }>>('/wallet/qr');
  return response.data.data.qr;
};

export const payQr = async (payload: PayQrPayload): Promise<TransferResult> => {
  const body = payload.note ? payload : { payload: payload.payload, amount: payload.amount };
  const response = await apiClient.post<ApiEnvelope<{ transfer: TransferResult }>>(
    '/wallet/pay-qr',
    body,
    {
      headers: {
        'X-Idempotency-Key': createIdempotencyKey()
      }
    }
  );
  return response.data.data.transfer;
};
