import { Types } from 'mongoose';
import {
  ScheduledPaymentModel,
  type ScheduleFrequency,
  type ScheduledPaymentDocument
} from '../models/ScheduledPayment.js';
import { AppError } from '../utils/AppError.js';
import { transferMoney } from './walletService.js';

interface CreateScheduleInput {
  userId: string;
  recipient: string;
  amount: number;
  frequency: ScheduleFrequency;
  startDate: Date;
  note?: string;
}

const toPaise = (amount: number): number => Math.round(amount * 100);
const toRupees = (paise: number): number => paise / 100;

const getNextRunAt = (from: Date, frequency: ScheduleFrequency): Date => {
  const next = new Date(from);

  if (frequency === 'daily') {
    next.setDate(next.getDate() + 1);
  } else if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else {
    next.setMonth(next.getMonth() + 1);
  }

  return next;
};

const toScheduleResponse = (schedule: ScheduledPaymentDocument) => ({
  id: schedule._id.toString(),
  recipient: schedule.recipient,
  amount: toRupees(schedule.amount),
  amountPaise: schedule.amount,
  frequency: schedule.frequency,
  note: schedule.note,
  nextRunAt: schedule.nextRunAt,
  lastRunAt: schedule.lastRunAt,
  status: schedule.status,
  failureReason: schedule.failureReason,
  createdAt: schedule.createdAt
});

export const createSchedule = async (input: CreateScheduleInput) => {
  if (input.startDate.getTime() < Date.now() - 60_000) {
    throw new AppError('Start date cannot be in the past', 400, 'INVALID_START_DATE');
  }

  const schedule = await ScheduledPaymentModel.create({
    userId: new Types.ObjectId(input.userId),
    recipient: input.recipient,
    amount: toPaise(input.amount),
    frequency: input.frequency,
    nextRunAt: input.startDate,
    ...(input.note ? { note: input.note } : {})
  });

  return toScheduleResponse(schedule);
};

export const listSchedules = async (userId: string) => {
  const schedules = await ScheduledPaymentModel.find({ userId: new Types.ObjectId(userId) })
    .sort({ nextRunAt: 1 })
    .exec();

  return schedules.map(toScheduleResponse);
};

export const cancelSchedule = async (userId: string, scheduleId: string) => {
  const schedule = await ScheduledPaymentModel.findOneAndUpdate(
    {
      _id: scheduleId,
      userId,
      status: 'active'
    },
    { $set: { status: 'cancelled' } },
    { new: true }
  ).exec();

  if (!schedule) {
    throw new AppError('Active schedule not found', 404, 'SCHEDULE_NOT_FOUND');
  }

  return toScheduleResponse(schedule);
};

export const executeDueSchedules = async (): Promise<number> => {
  const dueSchedules = await ScheduledPaymentModel.find({
    status: 'active',
    nextRunAt: { $lte: new Date() }
  })
    .limit(50)
    .exec();

  let executedCount = 0;

  for (const schedule of dueSchedules) {
    try {
      const transfer = await transferMoney({
        senderUserId: schedule.userId.toString(),
        recipient: schedule.recipient,
        amount: toRupees(schedule.amount),
        idempotencyKey: `schedule:${schedule._id.toString()}:${schedule.nextRunAt.toISOString()}`,
        channel: 'scheduled',
        category: 'scheduled_payment',
        ...(schedule.note ? { note: schedule.note } : {})
      });

      schedule.lastRunAt = new Date();
      schedule.nextRunAt = getNextRunAt(schedule.nextRunAt, schedule.frequency);
      schedule.set('failureReason', undefined);
      await schedule.save();
      executedCount += transfer.referenceId ? 1 : 0;
    } catch (error) {
      schedule.status = 'failed';
      schedule.failureReason = error instanceof Error ? error.message : 'Scheduled payment failed';
      await schedule.save();
    }
  }

  return executedCount;
};
