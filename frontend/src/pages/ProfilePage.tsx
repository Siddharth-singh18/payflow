import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, FileUp, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { getApiErrorMessage } from '../api/client';
import { getKycStatus, submitKyc } from '../api/kyc';
import { AppLayout } from '../components/AppLayout';
import { SubmitButton, TextField } from '../components/FormControls';
import { Skeleton } from '../components/Skeleton';
import { PageCard, PageCardHeader } from '../components/ui/PageCard';
import { useAuthStore } from '../store/authStore';
import { formatMoney } from '../utils/format';

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number')
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const ProfilePage = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [aadhaar, setAadhaar] = useState<File | null>(null);
  const [pan, setPan] = useState<File | null>(null);
  const kycQuery = useQuery({ queryKey: ['kyc', 'status'], queryFn: getKycStatus });
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      phone: user?.phone ?? ''
    }
  });
  const kycMutation = useMutation({
    mutationFn: ({ aadhaarFile, panFile }: { aadhaarFile: File; panFile: File }) =>
      submitKyc(aadhaarFile, panFile),
    onSuccess: async () => {
      toast.success('KYC submitted for review');
      setAadhaar(null);
      setPan(null);
      await queryClient.invalidateQueries({ queryKey: ['kyc'] });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    }
  });
  const dailyLimit = kycQuery.data?.tier === 'verified' ? 100000 : 10000;

  const onProfileSubmit = (): void => {
    toast('Profile update API is not available yet');
  };

  const submitDocuments = (): void => {
    if (!aadhaar || !pan) {
      toast.error('Select Aadhaar and PAN documents');
      return;
    }

    kycMutation.mutate({ aadhaarFile: aadhaar, panFile: pan });
  };

  return (
    <AppLayout subtitle="Account information, KYC status, and wallet security settings." title="Profile">
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <PageCard>
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarPreview ? (
                <img alt="Profile preview" className="h-20 w-20 rounded-lg object-cover" src={avatarPreview} />
              ) : (
                <span className="grid h-20 w-20 place-items-center rounded-lg bg-teal-50 text-payflow-teal dark:bg-teal-950/40">
                  <UserRound size={34} />
                </span>
              )}
              <label className="absolute -bottom-2 -right-2 grid h-9 w-9 cursor-pointer place-items-center rounded-lg bg-payflow-teal text-white">
                <Camera size={17} />
                <input
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      setAvatarPreview(URL.createObjectURL(file));
                    }
                  }}
                  type="file"
                />
              </label>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold">{user?.name}</h2>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
              <p className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {user?.role}
              </p>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={(event) => void handleSubmit(onProfileSubmit)(event)}>
            <TextField error={errors.name?.message} label="Name" {...register('name')} />
            <TextField error={errors.phone?.message} label="Phone" {...register('phone')} />
            <SubmitButton type="submit">Save profile</SubmitButton>
          </form>
        </PageCard>

        <PageCard>
          <PageCardHeader
            description={`Daily wallet limit: ${formatMoney(dailyLimit)}`}
            icon={<ShieldCheck size={20} />}
            title="KYC status"
          />
          {kycQuery.isLoading ? (
            <Skeleton className="mt-5 h-24" />
          ) : (
            <div className="mt-5 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-sm">
                <span className="text-slate-500 dark:text-slate-400">Status: </span>
                <span className="font-semibold capitalize">
                  {kycQuery.data?.status.replaceAll('_', ' ') ?? 'not submitted'}
                </span>
              </p>
              <p className="mt-2 text-sm">
                <span className="text-slate-500 dark:text-slate-400">Tier: </span>
                <span className="font-semibold capitalize">{kycQuery.data?.tier ?? 'unverified'}</span>
              </p>
              {kycQuery.data?.rejectionReason ? (
                <p className="mt-2 text-sm text-red-600">{kycQuery.data.rejectionReason}</p>
              ) : null}
            </div>
          )}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <DocumentPicker label="Aadhaar document" onSelect={setAadhaar} selected={aadhaar?.name} />
            <DocumentPicker label="PAN document" onSelect={setPan} selected={pan?.name} />
          </div>
          <SubmitButton
            className="mt-5"
            icon={<FileUp size={18} />}
            isLoading={kycMutation.isPending}
            onClick={submitDocuments}
            type="button"
          >
            Submit KYC
          </SubmitButton>
        </PageCard>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <PageCard>
          <h2 className="text-base font-semibold">Security settings</h2>
          <div className="mt-4 space-y-3">
            <TextField label="Change password" placeholder="Use forgot password flow for OTP reset" disabled />
            <TextField label="Two-factor status" value={user?.isEmailVerified ? 'Email verified' : 'Email pending'} disabled />
          </div>
        </PageCard>
        <PageCard>
          <h2 className="text-base font-bold">Active sessions</h2>
          <div className="mt-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-sm font-semibold">Current browser</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{window.navigator.userAgent}</p>
          </div>
        </PageCard>
      </section>
    </AppLayout>
  );
};

const DocumentPicker = ({
  label,
  selected,
  onSelect
}: {
  label: string;
  selected?: string | undefined;
  onSelect: (file: File | null) => void;
}) => (
  <label className="block rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
    <span className="text-sm font-semibold">{label}</span>
    <span className="mt-2 block truncate text-xs text-slate-500 dark:text-slate-400">
      {selected ?? 'PDF or image file'}
    </span>
    <input
      accept="image/*,.pdf"
      className="mt-3 block w-full text-sm"
      onChange={(event) => {
        onSelect(event.target.files?.[0] ?? null);
      }}
      type="file"
    />
  </label>
);
