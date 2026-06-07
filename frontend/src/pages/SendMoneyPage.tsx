import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Search, Send, Shield, X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { transferMoney } from '../api/wallet';
import { getApiErrorMessage } from '../api/client';
import { AppLayout } from '../components/AppLayout';
import { SubmitButton, TextField } from '../components/FormControls';
import { PageCard, PageCardHeader } from '../components/ui/PageCard';
import type { TransferResult } from '../types/wallet';
import { formatMoney } from '../utils/format';

const sendSchema = z.object({
  recipient: z.string().trim().min(3, 'Enter recipient email, phone, or user ID').max(120),
  amount: z.coerce.number().positive('Enter an amount greater than zero').max(100000),
  note: z.string().trim().max(100, 'Note can be up to 100 characters').optional()
});

type SendFormValues = z.infer<typeof sendSchema>;

const quickAmounts = [100, 500, 1000, 2000];

export const SendMoneyPage = () => {
  const queryClient = useQueryClient();
  const [pendingValues, setPendingValues] = useState<SendFormValues | null>(null);
  const [lastTransfer, setLastTransfer] = useState<TransferResult | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<SendFormValues>({
    resolver: zodResolver(sendSchema),
    defaultValues: {
      recipient: '',
      amount: 100,
      note: ''
    }
  });

  const transferMutation = useMutation({
    mutationFn: transferMoney,
    onSuccess: async (result) => {
      setLastTransfer(result);
      setPendingValues(null);
      toast.success('Transfer completed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      ]);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    }
  });

  const noteValue = watch('note') ?? '';
  const amountValue = watch('amount');

  const onSubmit = (values: SendFormValues): void => {
    setPendingValues(values);
    setLastTransfer(null);
  };

  return (
    <AppLayout subtitle="Pay another PayFlow wallet by email, phone, or user ID." title="Send Money">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <PageCard>
          <PageCardHeader
            description="Recipient lookup is handled during transfer validation."
            icon={<Send size={20} />}
            title="New transfer"
          />

          <form
            className="space-y-5"
            onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          >
            <TextField
              error={errors.recipient?.message}
              label="Search user"
              placeholder="Email, phone, or PayFlow user ID"
              {...register('recipient')}
            />
            <div>
              <label className="block">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Amount</span>
                <div className="mt-2 flex overflow-hidden rounded-xl border" style={{ borderColor: 'var(--pf-card-border)' }}>
                  <input
                    className="pf-input h-12 flex-1 rounded-none border-0 focus:ring-0"
                    inputMode="decimal"
                    min={1}
                    type="number"
                    {...register('amount')}
                  />
                  <span className="flex items-center border-l px-4 text-sm font-semibold text-slate-600 dark:text-slate-300" style={{ borderColor: 'var(--pf-card-border)', backgroundColor: 'var(--pf-page-bg)' }}>
                    ₹ INR
                  </span>
                </div>
              </label>
              {errors.amount?.message ? (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {quickAmounts.map((amount) => (
                  <button
                    className={`h-10 rounded-xl border px-4 text-sm font-semibold shadow-sm transition ${
                      Number(amountValue) === amount
                        ? 'border-[#0f766e] bg-teal-50 text-[#0f766e] dark:border-teal-400 dark:bg-teal-950/50 dark:text-teal-300'
                        : 'border-slate-200 text-slate-700 hover:border-[#0f766e] dark:border-[#1e293b] dark:text-slate-300'
                    }`}
                    key={amount}
                    onClick={() => {
                      setValue('amount', amount, { shouldValidate: true });
                    }}
                    style={
                      Number(amountValue) !== amount
                        ? { backgroundColor: 'var(--pf-card-bg)', borderColor: 'var(--pf-card-border)' }
                        : undefined
                    }
                    type="button"
                  >
                    {formatMoney(amount)}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Note (optional)</span>
              <textarea
                className="pf-input mt-2 min-h-[88px] resize-none py-3"
                placeholder="Dinner, rent, gift..."
                {...register('note')}
              />
              <span className="mt-1 block text-right text-xs text-slate-400">{noteValue.length}/100</span>
              {errors.note?.message ? (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.note.message}</p>
              ) : null}
            </label>
            <SubmitButton icon={<Search size={18} />}>Review transfer</SubmitButton>
          </form>
        </PageCard>

        <PageCard>
          <h2 className="text-base font-bold">Transfer status</h2>
          <AnimatePresence mode="wait">
            {lastTransfer ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 text-center"
                exit={{ opacity: 0, y: -12 }}
                initial={{ opacity: 0, y: 12 }}
                key="success"
              >
                <CheckCircle2 className="mx-auto text-emerald-600" size={58} />
                <p className="mt-4 text-xl font-semibold">Payment sent</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {formatMoney(lastTransfer.amount)} paid to {lastTransfer.receiver.name}
                </p>
                <div className="mt-6 rounded-lg bg-slate-50 p-4 text-left text-sm dark:bg-slate-900">
                  <p className="font-medium">Reference</p>
                  <p className="mt-1 break-all text-slate-500 dark:text-slate-400">
                    {lastTransfer.referenceId}
                  </p>
                  <p className="mt-4 font-medium">Remaining balance</p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {formatMoney(lastTransfer.senderBalance)}
                  </p>
                </div>
              </motion.div>
            ) : pendingValues ? (
              <motion.div
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
                exit={{ opacity: 0, y: -12 }}
                initial={{ opacity: 0, y: 12 }}
                key="confirm"
              >
                <div className="rounded-lg bg-slate-50 p-5 dark:bg-slate-900">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Recipient</p>
                  <p className="mt-1 break-all text-lg font-semibold">{pendingValues.recipient}</p>
                  <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Amount</p>
                  <p className="mt-1 text-3xl font-semibold">{formatMoney(pendingValues.amount)}</p>
                  {pendingValues.note ? (
                    <>
                      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">Note</p>
                      <p className="mt-1 font-medium">{pendingValues.note}</p>
                    </>
                  ) : null}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-semibold dark:border-slate-800"
                    onClick={() => {
                      setPendingValues(null);
                    }}
                    type="button"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                  <SubmitButton
                    icon={<Send size={18} />}
                    isLoading={transferMutation.isPending}
                    onClick={() => {
                      transferMutation.mutate(pendingValues);
                    }}
                    type="button"
                  >
                    Confirm
                  </SubmitButton>
                </div>
              </motion.div>
            ) : (
              <motion.div
                animate={{ opacity: 1 }}
                className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center dark:border-payflow-dark-border dark:bg-payflow-dark-bg/50"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="empty"
              >
                <div className="relative mb-8 h-24 w-40">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="h-16 w-16 rounded-2xl bg-teal-50 dark:bg-teal-950/40" />
                  </div>
                  <Send className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-payflow-teal" size={32} />
                  <div className="absolute left-6 top-8 h-2 w-2 rounded-full bg-emerald-400" />
                  <div className="absolute right-4 top-4 h-3 w-3 rounded-full bg-cyan-400" />
                  <div className="absolute bottom-2 right-12 h-2 w-2 rounded-full bg-teal-500" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Enter transfer details to review and confirm.</p>
                <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">Your transfer summary will appear here.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </PageCard>
      </div>

      <div className="mt-6">
        <div className="pf-card flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-teal-50 text-payflow-teal dark:bg-teal-950/40 dark:text-payflow-mint">
              <Shield size={22} />
            </span>
            <div>
              <p className="text-[15px] font-bold">Your security is our priority</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400">All transfers are encrypted and 100% secure.</p>
            </div>
          </div>
          <span className="text-slate-400">›</span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pf-card flex items-start gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-payflow-teal dark:bg-teal-950/40 dark:text-payflow-mint">
              <span className="text-xl">⚡</span>
            </span>
            <div>
              <p className="text-[13px] font-bold">Instant Transfers</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Money reaches in seconds</p>
            </div>
          </div>
          <div className="pf-card flex items-start gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Shield size={18} />
            </span>
            <div>
              <p className="text-[13px] font-bold">Bank-level Security</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">256-bit encryption for all transactions</p>
            </div>
          </div>
          <div className="pf-card flex items-start gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <span className="font-bold">%</span>
            </span>
            <div>
              <p className="text-[13px] font-bold">Zero Hidden Fees</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">What you see is what you pay</p>
            </div>
          </div>
          <div className="pf-card flex items-start gap-4 p-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <span className="text-xl font-bold">🎧</span>
            </span>
            <div>
              <p className="text-[13px] font-bold">24/7 Support</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">We're always here to help you</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
