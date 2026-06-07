import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Receipt, Users } from 'lucide-react';
import { useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { createSplit, getSplits, settleSplit } from '../api/split';
import { getApiErrorMessage } from '../api/client';
import { AppLayout } from '../components/AppLayout';
import { SubmitButton, TextField } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { PageCard, PageCardHeader } from '../components/ui/PageCard';
import { useAuthStore } from '../store/authStore';
import type { SplitBill } from '../types/split';
import { formatMoney } from '../utils/format';

const objectIdMessage = 'Enter a valid PayFlow user ID';

const splitSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(120),
  totalAmount: z.coerce.number().positive('Enter an amount greater than zero').max(500000),
  splitType: z.enum(['equal', 'custom']),
  participants: z
    .array(
      z.object({
        userId: z.string().trim().regex(/^[a-f\d]{24}$/i, objectIdMessage),
        amount: z.coerce.number().positive().optional()
      })
    )
    .min(1)
});

type SplitFormValues = z.infer<typeof splitSchema>;

export const SplitBillsPage = () => {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const splitsQuery = useQuery({ queryKey: ['splits'], queryFn: getSplits });
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<SplitFormValues>({
    resolver: zodResolver(splitSchema),
    defaultValues: {
      title: '',
      totalAmount: 1000,
      splitType: 'equal',
      participants: [{ userId: '', amount: undefined }]
    }
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'participants' });
  const splitType = watch('splitType');
  const createMutation = useMutation({
    mutationFn: createSplit,
    onSuccess: async () => {
      toast.success('Split created');
      reset();
      await queryClient.invalidateQueries({ queryKey: ['splits'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    }
  });
  const settleMutation = useMutation({
    mutationFn: settleSplit,
    onSuccess: async () => {
      toast.success('Share settled');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['splits'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      ]);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    }
  });

  const onSubmit = (values: SplitFormValues): void => {
    createMutation.mutate({
      title: values.title,
      totalAmount: values.totalAmount,
      splitType: values.splitType,
      participants: values.participants.map((participant) => ({
        userId: participant.userId,
        ...(values.splitType === 'custom' ? { amount: participant.amount } : {})
      }))
    });
  };

  return (
    <AppLayout subtitle="Create shared expenses and settle wallet shares." title="Split Bills">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <PageCard>
          <PageCardHeader icon={<Users size={20} />} title="Create split" />
          <form className="space-y-5" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
              <TextField
                error={errors.title?.message}
                label="Title"
                placeholder="Weekend dinner"
                {...register('title')}
              />
            <TextField
              error={errors.totalAmount?.message}
              inputMode="decimal"
              label="Total amount"
              min={1}
              type="number"
              {...register('totalAmount')}
            />
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Split type</span>
              <select
                className="mt-2 h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm dark:border-slate-800 dark:bg-slate-900"
                {...register('splitType')}
              >
                <option value="equal">Equal</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]" key={field.id}>
                  <TextField
                    error={errors.participants?.[index]?.userId?.message}
                    label={`Participant ${String(index + 1)}`}
                    placeholder="User ID"
                    {...register(['participants', String(index), 'userId'].join('.') as `participants.${number}.userId`)}
                  />
                  {splitType === 'custom' ? (
                    <TextField
                      error={errors.participants?.[index]?.amount?.message}
                      inputMode="decimal"
                      label="Amount"
                      min={1}
                      type="number"
                      {...register(['participants', String(index), 'amount'].join('.') as `participants.${number}.amount`)}
                    />
                  ) : null}
                  <button
                    className="h-12 self-end rounded-lg border border-slate-200 px-4 text-sm font-semibold dark:border-slate-800"
                    disabled={fields.length === 1}
                    onClick={() => {
                      remove(index);
                    }}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold dark:border-slate-800"
              onClick={() => {
                append({ userId: '', amount: undefined });
              }}
              type="button"
            >
              <Plus size={17} />
              Add participant
            </button>
            <SubmitButton icon={<Receipt size={18} />} isLoading={createMutation.isPending}>
              Create split
            </SubmitButton>
          </form>
        </PageCard>

        <section>
          <h2 className="mb-4 text-base font-bold">Active splits</h2>
          {splitsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : splitsQuery.data?.length ? (
            <div className="space-y-3">
              {splitsQuery.data.map((split) => (
                <SplitCard
                  currentUserId={currentUserId}
                  isSettling={settleMutation.isPending}
                  key={split.id}
                  onSettle={() => {
                    settleMutation.mutate(split.id);
                  }}
                  split={split}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              description="Create a group expense and settle shares through your wallet."
              icon={<Receipt className="text-payflow-teal dark:text-payflow-mint" size={40} />}
              title="No active splits yet"
            />
          )}
        </section>
      </div>
    </AppLayout>
  );
};

const SplitCard = ({
  split,
  currentUserId,
  isSettling,
  onSettle
}: {
  split: SplitBill;
  currentUserId?: string | undefined;
  isSettling: boolean;
  onSettle: () => void;
}) => {
  const settledAmount = useMemo(
    () =>
      split.participants
        .filter((participant) => participant.status === 'settled')
        .reduce((total, participant) => total + participant.amount, 0),
    [split.participants]
  );
  const progress = split.totalAmount > 0 ? Math.round((settledAmount / split.totalAmount) * 100) : 0;
  const myShare = split.participants.find((participant) => participant.userId === currentUserId);

  return (
    <article className="pf-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{split.title}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {formatMoney(split.totalAmount)} · {split.participants.length} participants
          </p>
        </div>
        <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold capitalize text-payflow-teal dark:bg-teal-950/40">
          {split.status}
        </span>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className="h-full rounded-full bg-payflow-teal" style={{ width: `${String(progress)}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{progress}% settled</p>
      <div className="mt-4 grid gap-2">
        {split.participants.map((participant) => (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-900" key={participant.userId}>
            <span className="truncate">{participant.userId}</span>
            <span className="font-semibold">
              {formatMoney(participant.amount)} · {participant.status}
            </span>
          </div>
        ))}
      </div>
      {myShare?.status === 'pending' ? (
        <SubmitButton className="mt-4" isLoading={isSettling} onClick={onSettle} type="button">
          Settle my share
        </SubmitButton>
      ) : null}
    </article>
  );
};
