import crypto from 'node:crypto';
import mongoose, { Types, type ClientSession } from 'mongoose';
import { env } from '../config/env.js';
import { razorpay } from '../config/razorpay.js';
import { TransactionModel } from '../models/Transaction.js';
import { UserModel } from '../models/User.js';
import { WalletModel, type WalletDocument } from '../models/Wallet.js';
import { AppError } from '../utils/AppError.js';
import { assessTransferFraud, type FraudAssessment } from '../utils/fraudDetection.js';
import {
  completeTransferIdempotencyKey,
  reserveTransferIdempotencyKey
} from '../utils/idempotency.js';
import {
  notifyPaymentCredit,
  notifyPaymentDebit,
  notifyWalletCredit
} from './notificationService.js';

const generateVirtualAccountNumber = (): string => {
  const suffix = crypto.randomInt(1000000000, 9999999999).toString();
  return `PF${suffix}`;
};

export const createWalletForUser = async (
  userId: Types.ObjectId,
  session: ClientSession
): Promise<void> => {
  await WalletModel.create(
    [
      {
        userId,
        balance: 0,
        currency: 'INR',
        virtualAccountNumber: generateVirtualAccountNumber()
      }
    ],
    { session }
  );
};

interface WalletBalanceResponse {
  balance: number;
  balancePaise: number;
  currency: 'INR';
  virtualAccountNumber: string;
  isFrozen: boolean;
}

interface TransferInput {
  senderUserId: string;
  recipient: string;
  amount: number;
  note?: string;
  idempotencyKey?: string;
  deviceFingerprint?: string;
  ipAddress?: string;
  userAgent?: string;
  channel?: 'wallet' | 'qr' | 'split' | 'scheduled';
  category?: string;
}

export interface TransferResponse {
  referenceId: string;
  amount: number;
  amountPaise: number;
  senderBalance: number;
  senderBalancePaise: number;
  receiver: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  fraud: FraudAssessment;
}

interface AddMoneyOrderInput {
  userId: string;
  amount: number;
}

interface AddMoneyOrderResponse {
  keyId: string;
  orderId: string;
  receipt: string;
  amount: number;
  amountPaise: number;
  currency: 'INR';
}

export interface RazorpayCapturedPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string>;
}

interface RazorpayCreditResponse {
  credited: boolean;
  referenceId: string;
}

const toRupees = (paise: number): number => paise / 100;

const toPaise = (amount: number): number => {
  const paise = Math.round(amount * 100);

  if (!Number.isSafeInteger(paise) || paise < 100) {
    throw new AppError('Transfer amount must be at least ₹1', 400, 'INVALID_AMOUNT');
  }

  return paise;
};

const getWalletOrThrow = async (userId: string): Promise<WalletDocument> => {
  const wallet = await WalletModel.findOne({ userId }).exec();

  if (!wallet) {
    throw new AppError('Wallet not found', 404, 'WALLET_NOT_FOUND');
  }

  return wallet;
};

export const getWalletBalance = async (userId: string): Promise<WalletBalanceResponse> => {
  const wallet = await getWalletOrThrow(userId);

  return {
    balance: toRupees(wallet.balance),
    balancePaise: wallet.balance,
    currency: wallet.currency,
    virtualAccountNumber: wallet.virtualAccountNumber,
    isFrozen: wallet.isFrozen
  };
};

export const createAddMoneyOrder = async (
  input: AddMoneyOrderInput
): Promise<AddMoneyOrderResponse> => {
  const amountPaise = toPaise(input.amount);
  const wallet = await getWalletOrThrow(input.userId);
  const receipt = `PFA${crypto.randomUUID().replace(/-/g, '').slice(0, 32).toUpperCase()}`;

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt,
    notes: {
      userId: input.userId,
      walletId: wallet._id.toString(),
      receipt
    }
  });

  await TransactionModel.create({
    userId: input.userId,
    walletId: wallet._id,
    type: 'credit',
    status: 'pending',
    channel: 'razorpay',
    amount: amountPaise,
    balanceAfter: wallet.balance,
    currency: 'INR',
    category: 'wallet_topup',
    referenceId: receipt,
    providerOrderId: order.id,
    description: 'Wallet top-up initiated'
  });

  return {
    keyId: env.RAZORPAY_KEY_ID,
    orderId: order.id,
    receipt,
    amount: toRupees(amountPaise),
    amountPaise,
    currency: 'INR'
  };
};

const findRecipientUser = async (recipient: string) => {
  const normalizedRecipient = recipient.toLowerCase();
  const objectIdFilter = mongoose.isValidObjectId(recipient) ? [{ _id: recipient }] : [];

  return UserModel.findOne({
    $or: [...objectIdFilter, { email: normalizedRecipient }, { phone: recipient }]
  }).exec();
};

export const transferMoney = async (input: TransferInput): Promise<TransferResponse> => {
  const idempotencyKey = input.idempotencyKey ?? crypto.randomUUID();
  await reserveTransferIdempotencyKey(input.senderUserId, idempotencyKey);

  const amountPaise = toPaise(input.amount);
  const fraudContext = {
    userId: input.senderUserId,
    amountPaise,
    ...(input.deviceFingerprint ? { deviceFingerprint: input.deviceFingerprint } : {}),
    ...(input.ipAddress ? { ipAddress: input.ipAddress } : {}),
    ...(input.userAgent ? { userAgent: input.userAgent } : {})
  };
  const fraudAssessment = await assessTransferFraud(fraudContext);
  const receiver = await findRecipientUser(input.recipient);

  if (!receiver) {
    throw new AppError('Recipient user not found', 404, 'RECIPIENT_NOT_FOUND');
  }

  if (receiver.isBlocked) {
    throw new AppError('Recipient account is blocked', 403, 'RECIPIENT_BLOCKED');
  }

  if (receiver._id.toString() === input.senderUserId) {
    throw new AppError('Cannot transfer money to your own wallet', 400, 'SELF_TRANSFER_NOT_ALLOWED');
  }

  const session = await mongoose.startSession();
  const referenceId = `PFT${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;
  let receiverBalancePaise = 0;

  try {
    const transferResult = await session.withTransaction(async () => {
      const receiverWallet = await WalletModel.findOne({
        userId: receiver._id,
        isFrozen: false
      })
        .session(session)
        .exec();

      if (!receiverWallet) {
        throw new AppError('Recipient wallet is unavailable', 404, 'RECIPIENT_WALLET_NOT_FOUND');
      }

      const debitedSenderWallet = await WalletModel.findOneAndUpdate(
        {
          userId: input.senderUserId,
          isFrozen: false,
          balance: { $gte: amountPaise }
        },
        { $inc: { balance: -amountPaise } },
        { new: true, session }
      ).exec();

      if (!debitedSenderWallet) {
        throw new AppError('Insufficient balance or wallet unavailable', 400, 'INSUFFICIENT_BALANCE');
      }

      const creditedReceiverWallet = await WalletModel.findOneAndUpdate(
        {
          _id: receiverWallet._id,
          isFrozen: false
        },
        { $inc: { balance: amountPaise } },
        { new: true, session }
      ).exec();

      if (!creditedReceiverWallet) {
        throw new AppError('Unable to credit recipient wallet', 500, 'RECIPIENT_CREDIT_FAILED');
      }

      receiverBalancePaise = creditedReceiverWallet.balance;

      await TransactionModel.create(
        [
          {
            userId: input.senderUserId,
            walletId: debitedSenderWallet._id,
            counterpartyUserId: receiver._id,
            type: 'debit',
            status: 'completed',
            channel: input.channel ?? 'wallet',
            amount: amountPaise,
            balanceAfter: debitedSenderWallet.balance,
            currency: 'INR',
            category: input.category ?? 'wallet_transfer',
            referenceId,
            idempotencyKey,
            note: input.note,
            description: `Paid ${receiver.name}`,
            isFlagged: fraudAssessment.isFlagged,
            fraudScore: fraudAssessment.score,
            fraudReasons: fraudAssessment.reasons
          },
          {
            userId: receiver._id,
            walletId: creditedReceiverWallet._id,
            counterpartyUserId: input.senderUserId,
            type: 'credit',
            status: 'completed',
            channel: input.channel ?? 'wallet',
            amount: amountPaise,
            balanceAfter: creditedReceiverWallet.balance,
            currency: 'INR',
            category: input.category ?? 'wallet_transfer',
            referenceId,
            note: input.note,
            description: 'Received wallet transfer',
            isFlagged: false,
            fraudScore: 0,
            fraudReasons: []
          }
        ],
        { session, ordered: true }
      );

      return {
        senderBalancePaise: debitedSenderWallet.balance
      };
    });

    await completeTransferIdempotencyKey(input.senderUserId, idempotencyKey, referenceId);
    await Promise.all([
      notifyPaymentDebit({
        userId: input.senderUserId,
        amount: toRupees(amountPaise),
        to: receiver.name,
        balance: toRupees(transferResult.senderBalancePaise),
        referenceId
      }),
      notifyPaymentCredit({
        userId: receiver._id.toString(),
        amount: toRupees(amountPaise),
        from: input.senderUserId,
        balance: toRupees(receiverBalancePaise),
        referenceId
      })
    ]);

    return {
      referenceId,
      amount: toRupees(amountPaise),
      amountPaise,
      senderBalance: toRupees(transferResult.senderBalancePaise),
      senderBalancePaise: transferResult.senderBalancePaise,
      receiver: {
        id: receiver._id.toString(),
        name: receiver.name,
        email: receiver.email,
        phone: receiver.phone
      },
      fraud: fraudAssessment
    };
  } finally {
    await session.endSession();
  }
};

export const creditWalletFromRazorpayPayment = async (
  payment: RazorpayCapturedPayment
): Promise<RazorpayCreditResponse> => {
  if (payment.status !== 'captured') {
    throw new AppError('Razorpay payment is not captured', 400, 'PAYMENT_NOT_CAPTURED');
  }

  if (payment.currency !== 'INR') {
    throw new AppError('Only INR payments are supported', 400, 'UNSUPPORTED_PAYMENT_CURRENCY');
  }

  const existingCompletedTransaction = await TransactionModel.findOne({
    providerPaymentId: payment.id,
    status: 'completed'
  }).exec();

  if (existingCompletedTransaction) {
    return {
      credited: false,
      referenceId: existingCompletedTransaction.referenceId
    };
  }

  const session = await mongoose.startSession();
  let creditedUserId = '';
  let creditedBalancePaise = 0;
  let referenceId = '';

  try {
    const creditResult = await session.withTransaction(async () => {
      const pendingTransaction = await TransactionModel.findOne({
        providerOrderId: payment.order_id,
        channel: 'razorpay',
        status: 'pending'
      })
        .session(session)
        .exec();

      const userId = pendingTransaction?.userId.toString() ?? payment.notes?.userId;

      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new AppError('Unable to resolve wallet owner for payment', 400, 'PAYMENT_OWNER_MISSING');
      }

      const wallet = await WalletModel.findOneAndUpdate(
        {
          userId,
          isFrozen: false
        },
        { $inc: { balance: payment.amount } },
        { new: true, session }
      ).exec();

      if (!wallet) {
        throw new AppError('Wallet not found or frozen', 404, 'WALLET_NOT_AVAILABLE');
      }

      creditedUserId = userId;
      creditedBalancePaise = wallet.balance;
      referenceId = pendingTransaction?.referenceId ?? `PFA${payment.id.toUpperCase()}`;

      if (pendingTransaction) {
        pendingTransaction.status = 'completed';
        pendingTransaction.balanceAfter = wallet.balance;
        pendingTransaction.providerPaymentId = payment.id;
        pendingTransaction.description = 'Wallet top-up completed';
        pendingTransaction.metadata = {
          razorpayOrderId: payment.order_id,
          razorpayPaymentId: payment.id
        };
        await pendingTransaction.save({ session });
      } else {
        await TransactionModel.create(
          [
            {
              userId,
              walletId: wallet._id,
              type: 'credit',
              status: 'completed',
              channel: 'razorpay',
              amount: payment.amount,
              balanceAfter: wallet.balance,
              currency: 'INR',
              category: 'wallet_topup',
              referenceId,
              providerOrderId: payment.order_id,
              providerPaymentId: payment.id,
              description: 'Wallet top-up completed',
              metadata: {
                razorpayOrderId: payment.order_id,
                razorpayPaymentId: payment.id
              }
            }
          ],
          { session }
        );
      }

      return { referenceId };
    });

    await notifyWalletCredit({
      userId: creditedUserId,
      amount: toRupees(payment.amount),
      source: 'Razorpay',
      balance: toRupees(creditedBalancePaise),
      referenceId: creditResult.referenceId
    });

    return {
      credited: true,
      referenceId: creditResult.referenceId
    };
  } finally {
    await session.endSession();
  }
};
