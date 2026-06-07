import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { verifyOtp } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { SubmitButton, TextField } from '../components/FormControls';
import { OtpInput } from '../components/OtpInput';
import { useAuthStore } from '../store/authStore';

const verifyOtpSchema = z.object({
  email: z.string().trim().email('Enter the email used for registration'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP')
});

type VerifyOtpFormValues = z.infer<typeof verifyOtpSchema>;

export const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const pendingEmail = useAuthStore((state) => state.pendingVerificationEmail);
  const setPendingVerificationEmail = useAuthStore((state) => state.setPendingVerificationEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email: pendingEmail ?? '',
      otp: ''
    }
  });

  const onSubmit = async (values: VerifyOtpFormValues): Promise<void> => {
    setIsSubmitting(true);

    try {
      await verifyOtp(values);
      setPendingVerificationEmail(null);
      toast.success('Email verified successfully');
      void navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Verify OTP"
      subtitle="Enter the 6-digit code sent to your registered email to activate wallet access."
      title="Confirm your email"
    >
      <motion.form
        animate={{ opacity: 1, x: 0 }}
        className="space-y-5"
        initial={{ opacity: 0, x: 16 }}
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        transition={{ duration: 0.25 }}
      >
        <TextField
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          placeholder="siddharth@payflow.com"
          type="email"
          {...register('email')}
        />
        <Controller
          control={control}
          name="otp"
          render={({ field }) => (
            <OtpInput error={errors.otp?.message} onChange={field.onChange} value={field.value} />
          )}
        />
        <SubmitButton icon={<ShieldCheck size={18} />} isLoading={isSubmitting}>
          Verify account
        </SubmitButton>
      </motion.form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Ready to sign in?{' '}
        <Link className="font-semibold text-payflow-teal hover:text-teal-800" to="/login">
          Go to login
        </Link>
      </p>
    </AuthShell>
  );
};
