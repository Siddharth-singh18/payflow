import { Types } from 'mongoose';
import { SplitBillModel } from '../models/SplitBill.js';
import { UserModel } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { transferMoney } from './walletService.js';

interface SplitParticipantInput {
  userId: string;
  amount?: number;
}

interface CreateSplitInput {
  createdBy: string;
  title: string;
  totalAmount: number;
  splitType: 'equal' | 'custom';
  participants: SplitParticipantInput[];
}

const toPaise = (amount: number): number => Math.round(amount * 100);
const toRupees = (paise: number): number => paise / 100;

const ensureUsersExist = async (userIds: string[]): Promise<void> => {
  const count = await UserModel.countDocuments({ _id: { $in: userIds } }).exec();

  if (count !== userIds.length) {
    throw new AppError('One or more split participants do not exist', 400, 'INVALID_PARTICIPANTS');
  }
};

export const createSplit = async (input: CreateSplitInput) => {
  const totalAmountPaise = toPaise(input.totalAmount);
  const participantIds = [...new Set(input.participants.map((participant) => participant.userId))];

  if (participantIds.includes(input.createdBy)) {
    throw new AppError('Creator cannot be a settlement participant', 400, 'INVALID_SPLIT_CREATOR');
  }

  await ensureUsersExist(participantIds);

  const participantAmounts =
    input.splitType === 'equal'
      ? participantIds.map((userId, index) => {
          const baseShare = Math.floor(totalAmountPaise / participantIds.length);
          const remainder = totalAmountPaise % participantIds.length;
          return {
            userId,
            amount: baseShare + (index < remainder ? 1 : 0)
          };
        })
      : input.participants.map((participant) => {
          if (participant.amount === undefined) {
            throw new AppError('Custom split requires amount for every participant', 400, 'CUSTOM_SPLIT_AMOUNT_REQUIRED');
          }

          return {
            userId: participant.userId,
            amount: toPaise(participant.amount)
          };
        });

  const amountSum = participantAmounts.reduce((sum, participant) => sum + participant.amount, 0);

  if (amountSum !== totalAmountPaise) {
    throw new AppError('Split participant amounts must equal total amount', 400, 'SPLIT_AMOUNT_MISMATCH');
  }

  const split = await SplitBillModel.create({
    createdBy: input.createdBy,
    title: input.title,
    totalAmount: totalAmountPaise,
    participants: participantAmounts.map((participant) => ({
      userId: new Types.ObjectId(participant.userId),
      amount: participant.amount,
      status: 'pending'
    }))
  });

  return split;
};

export const listActiveSplits = async (userId: string) => {
  const objectId = new Types.ObjectId(userId);
  const splits = await SplitBillModel.find({
    status: 'active',
    $or: [{ createdBy: objectId }, { 'participants.userId': objectId }]
  })
    .sort({ createdAt: -1 })
    .exec();

  return splits.map((split) => ({
    id: split._id.toString(),
    title: split.title,
    createdBy: split.createdBy.toString(),
    totalAmount: toRupees(split.totalAmount),
    totalAmountPaise: split.totalAmount,
    status: split.status,
    participants: split.participants.map((participant) => ({
      userId: participant.userId.toString(),
      amount: toRupees(participant.amount),
      amountPaise: participant.amount,
      status: participant.status,
      settledAt: participant.settledAt,
      referenceId: participant.referenceId
    })),
    createdAt: split.createdAt
  }));
};

export const settleSplitShare = async (splitId: string, userId: string) => {
  const split = await SplitBillModel.findById(splitId).exec();

  if (!split || split.status !== 'active') {
    throw new AppError('Active split not found', 404, 'SPLIT_NOT_FOUND');
  }

  const participant = split.participants.find((item) => item.userId.toString() === userId);

  if (!participant) {
    throw new AppError('You are not a participant in this split', 403, 'SPLIT_PARTICIPANT_REQUIRED');
  }

  if (participant.status === 'settled') {
    throw new AppError('Split share is already settled', 409, 'SPLIT_ALREADY_SETTLED');
  }

  const transfer = await transferMoney({
    senderUserId: userId,
    recipient: split.createdBy.toString(),
    amount: toRupees(participant.amount),
    idempotencyKey: `split:${split._id.toString()}:${userId}`,
    channel: 'split',
    category: 'split_bill',
    note: `Split settlement: ${split.title}`
  });

  participant.status = 'settled';
  participant.settledAt = new Date();
  participant.referenceId = transfer.referenceId;

  if (split.participants.every((item) => item.status === 'settled')) {
    split.status = 'settled';
  }

  await split.save();

  return {
    splitId: split._id.toString(),
    status: split.status,
    transfer
  };
};
