import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { registerUser } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { SubmitButton, TextField } from '../components/FormControls';
import { useAuthStore } from '../store/authStore';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Enter a valid email'),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128)
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export const RegisterPage = () => {
  const navigate = useNavigate();
  const setPendingVerificationEmail = useAuthStore((state) => state.setPendingVerificationEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: ''
    }
  });

  const onSubmit = async (values: RegisterFormValues): Promise<void> => {
    setIsSubmitting(true);

    try {
      await registerUser(values);
      setPendingVerificationEmail(values.email);
      toast.success('OTP sent to your email');
      void navigate('/verify-otp');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Create account"
      subtitle="Your wallet is created automatically after registration, then secured with OTP verification."
      title="Start with PayFlow"
    >
      <motion.form
        animate={{ opacity: 1, x: 0 }}
        className="space-y-5"
        initial={{ opacity: 0, x: 16 }}
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        transition={{ duration: 0.25 }}
      >
        <TextField
          autoComplete="name"
          error={errors.name?.message}
          label="Full name"
          placeholder="Siddharth Sharma"
          {...register('name')}
        />
        <TextField
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          placeholder="siddharth@payflow.com"
          type="email"
          {...register('email')}
        />
        <TextField
          autoComplete="tel"
          error={errors.phone?.message}
          inputMode="numeric"
          label="Phone"
          placeholder="9876543210"
          {...register('phone')}
        />
        <TextField
          autoComplete="new-password"
          error={errors.password?.message}
          label="Password"
          placeholder="Minimum 8 characters"
          type="password"
          {...register('password')}
        />
        <SubmitButton icon={<UserPlus size={18} />} isLoading={isSubmitting}>
          Create wallet
        </SubmitButton>
      </motion.form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Already have an account?{' '}
        <Link className="font-semibold text-payflow-teal hover:text-teal-800 dark:text-payflow-mint dark:hover:text-teal-200" to="/login">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};
