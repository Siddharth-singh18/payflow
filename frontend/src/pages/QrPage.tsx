import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Download, QrCode, ScanLine, Send, Shield, StopCircle, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { getApiErrorMessage } from '../api/client';
import { getWalletQr, payQr } from '../api/wallet';
import { AppLayout } from '../components/AppLayout';
import { SubmitButton, TextField } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import { PageCard, PageCardHeader } from '../components/ui/PageCard';
import { formatMoney } from '../utils/format';
import type { Html5QrcodeScanner } from 'html5-qrcode';

const qrPaymentSchema = z.object({
  payload: z.string().trim().min(10, 'Scan or paste a PayFlow QR payload'),
  amount: z.coerce.number().positive('Enter an amount greater than zero').max(100000),
  note: z.string().trim().max(180).optional()
});

type QrPaymentFormValues = z.infer<typeof qrPaymentSchema>;

export const QrPage = () => {
  const queryClient = useQueryClient();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const walletQrQuery = useQuery({ queryKey: ['wallet', 'qr'], queryFn: getWalletQr });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<QrPaymentFormValues>({
    resolver: zodResolver(qrPaymentSchema),
    defaultValues: {
      payload: '',
      amount: 100,
      note: ''
    }
  });
  const paymentMutation = useMutation({
    mutationFn: payQr,
    onSuccess: async (result) => {
      toast.success(`Paid ${formatMoney(result.amount)} via QR`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      ]);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    }
  });
  const scannedPayload = watch('payload');

  useEffect(() => {
    return () => {
      void scannerRef.current?.clear();
    };
  }, []);

  const startScanner = async (): Promise<void> => {
    const { Html5QrcodeScanner } = await import('html5-qrcode');
    setIsScanning(true);

    scannerRef.current = new Html5QrcodeScanner(
      'payflow-qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scannerRef.current.render(
      (decodedText) => {
        setValue('payload', decodedText, { shouldValidate: true });
        toast.success('QR payload scanned');
        void scannerRef.current?.clear().then(() => {
          setIsScanning(false);
        });
      },
      () => undefined
    );
  };

  const stopScanner = (): void => {
    void scannerRef.current?.clear().then(() => {
      setIsScanning(false);
    });
  };

  const onSubmit = (values: QrPaymentFormValues): void => {
    paymentMutation.mutate(values);
  };

  return (
    <AppLayout subtitle="Display your wallet QR or scan another PayFlow QR to pay." title="QR Payments">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <PageCard>
          <PageCardHeader icon={<QrCode size={20} />} title="Your PayFlow QR" />
          {walletQrQuery.isLoading ? (
            <Skeleton className="mx-auto h-80 max-w-80 rounded-2xl" />
          ) : walletQrQuery.data ? (
            <div className="text-center">
              <div className="mx-auto max-w-[20rem] rounded-2xl border border-teal-100 bg-gradient-to-b from-teal-50/80 to-white p-5 shadow-inner dark:border-payflow-dark-border dark:from-payflow-dark-elevated dark:to-payflow-ink">
                <img
                  alt="PayFlow wallet QR code"
                  className="mx-auto h-64 w-64 rounded-xl bg-white p-3 shadow-sm dark:bg-white"
                  src={walletQrQuery.data.qrDataUrl}
                />
              </div>
              <p className="mt-4 break-all rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-payflow-dark-bg/80 dark:text-slate-400">
                {walletQrQuery.data.payload}
              </p>
              <a
                className="pf-btn-primary mt-5 !w-auto px-6"
                download="payflow-qr.png"
                href={walletQrQuery.data.qrDataUrl}
              >
                <Download size={17} />
                Download QR
              </a>
            </div>
          ) : null}
        </PageCard>

        <PageCard>
          <PageCardHeader
            action={
              <button
                className="pf-btn-ghost h-10"
                onClick={() => {
                  if (isScanning) {
                    stopScanner();
                    return;
                  }

                  void startScanner();
                }}
                type="button"
              >
                {isScanning ? <StopCircle size={18} /> : <ScanLine size={18} />}
                {isScanning ? 'Stop scanner' : 'Open camera'}
              </button>
            }
            title="Scan and pay"
          />
          <div className={isScanning ? 'mb-5 rounded-2xl border border-slate-200/80 bg-slate-50 p-3 dark:border-payflow-dark-border dark:bg-payflow-dark-bg/50' : 'hidden'}>
            <div id="payflow-qr-reader" />
          </div>
          <form className="space-y-5" onSubmit={(event) => void handleSubmit(onSubmit)(event)}>
            <TextField
              error={errors.payload?.message}
              label="QR payload"
              placeholder="payflow://pay?vpa=..."
              {...register('payload')}
            />
            <TextField
              error={errors.amount?.message}
              inputMode="decimal"
              label="Amount"
              min={1}
              type="number"
              {...register('amount')}
            />
            <TextField
              error={errors.note?.message}
              label="Note"
              placeholder="Coffee, groceries, invoice"
              {...register('note')}
            />
            <SubmitButton
              disabled={!scannedPayload}
              icon={<Send size={18} />}
              isLoading={paymentMutation.isPending}
            >
              Pay QR
            </SubmitButton>
          </form>
        </PageCard>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="pf-card flex items-start gap-4 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-[#0f766e] dark:bg-teal-950/50 dark:text-teal-300">
            <Shield size={20} />
          </span>
          <div>
            <p className="text-sm font-bold">Secure Payments</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Your payments are protected with end-to-end encryption.
            </p>
          </div>
        </article>
        <article className="pf-card flex items-start gap-4 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <Zap size={20} />
          </span>
          <div>
            <p className="text-sm font-bold">Instant Transfer</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Money transfer is instant, safe and reliable with PayFlow.
            </p>
          </div>
        </article>
        <article className="pf-card flex items-start gap-4 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300">
            <Award size={20} />
          </span>
          <div>
            <p className="text-sm font-bold">Trusted by Millions</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Join millions of users who trust PayFlow for their payments.
            </p>
          </div>
        </article>
      </div>
    </AppLayout>
  );
};
