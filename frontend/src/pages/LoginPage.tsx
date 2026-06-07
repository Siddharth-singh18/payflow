import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { loginUser } from '../api/auth';
import { getApiErrorMessage } from '../api/client';
import { AuthShell } from '../components/AuthShell';
import { SubmitButton, TextField } from '../components/FormControls';
import { useAuthStore } from '../store/authStore';

const loginSchema = z.object({
  emailOrPhone: z.string().trim().min(3, 'Enter your email or phone'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrPhone: '',
      password: ''
    }
  });

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    setIsSubmitting(true);

    try {
      const result = await loginUser(values);
      setSession(result.user, result.tokens);
      toast.success('Welcome back to PayFlow');
      void navigate(result.user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Sign in"
      subtitle="Access your wallet, transfers, transaction history, and verification status."
      title="Welcome back"
    >
      <motion.form
        animate={{ opacity: 1, x: 0 }}
        className="space-y-5"
        initial={{ opacity: 0, x: 16 }}
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        transition={{ duration: 0.25 }}
      >
        <TextField
          autoComplete="username"
          error={errors.emailOrPhone?.message}
          label="Email or phone"
          placeholder="siddharth@payflow.com"
          {...register('emailOrPhone')}
        />
        <TextField
          autoComplete="current-password"
          error={errors.password?.message}
          label="Password"
          placeholder="Enter your password"
          type="password"
          {...register('password')}
        />
        <div className="flex items-center justify-between text-sm">
          <Link className="font-medium text-payflow-teal hover:text-teal-800 dark:text-payflow-mint dark:hover:text-teal-200" to="/forgot-password">
            Forgot password?
          </Link>
        </div>
        <SubmitButton icon={<LogIn size={18} />} isLoading={isSubmitting}>
          Sign in
        </SubmitButton>
      </motion.form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        New to PayFlow?{' '}
        <Link className="font-semibold text-payflow-teal hover:text-teal-800 dark:text-payflow-mint dark:hover:text-teal-200" to="/register">
          Create account
        </Link>
      </p>
    </AuthShell>
  );
};
