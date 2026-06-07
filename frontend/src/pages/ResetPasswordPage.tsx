import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { resetPassword } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { SubmitButton, TextField } from '../components/FormControls';
import { OtpInput } from '../components/OtpInput';
import { useAuthStore } from '../store/authStore';

const resetPasswordSchema = z.object({
  email: z.string().trim().email('Enter your registered email'),
  otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit OTP'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128)
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const pendingEmail = useAuthStore((state) => state.pendingVerificationEmail);
  const setPendingVerificationEmail = useAuthStore((state) => state.setPendingVerificationEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: pendingEmail ?? '',
      otp: '',
      newPassword: ''
    }
  });

  const onSubmit = async (values: ResetPasswordFormValues): Promise<void> => {
    setIsSubmitting(true);

    try {
      await resetPassword(values);
      setPendingVerificationEmail(null);
      toast.success('Password updated successfully');
      void navigate('/login', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="New password"
      subtitle="Use the OTP from your email and choose a new password for the account."
      title="Complete reset"
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
        <TextField
          autoComplete="new-password"
          error={errors.newPassword?.message}
          label="New password"
          placeholder="Minimum 8 characters"
          type="password"
          {...register('newPassword')}
        />
        <SubmitButton icon={<KeyRound size={18} />} isLoading={isSubmitting}>
          Update password
        </SubmitButton>
      </motion.form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Have access already?{' '}
        <Link className="font-semibold text-payflow-teal hover:text-teal-800" to="/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};
