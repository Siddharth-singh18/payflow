import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { forgotPassword } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { SubmitButton, TextField } from '../components/FormControls';
import { useAuthStore } from '../store/authStore';

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter your registered email')
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const setPendingVerificationEmail = useAuthStore((state) => state.setPendingVerificationEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  const onSubmit = async (values: ForgotPasswordFormValues): Promise<void> => {
    setIsSubmitting(true);

    try {
      await forgotPassword(values);
      setPendingVerificationEmail(values.email);
      toast.success('Password reset OTP sent');
      void navigate('/reset-password');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Password help"
      subtitle="We will send a reset OTP to the email linked with your PayFlow account."
      title="Reset securely"
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
        <SubmitButton icon={<MailCheck size={18} />} isLoading={isSubmitting}>
          Send reset OTP
        </SubmitButton>
      </motion.form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Remembered it?{' '}
        <Link className="font-semibold text-payflow-teal hover:text-teal-800" to="/login">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
};
