import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DashboardPage } from './pages/DashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { HistoryPage } from './pages/HistoryPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { QrPage } from './pages/QrPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SendMoneyPage } from './pages/SendMoneyPage';
import { SplitBillsPage } from './pages/SplitBillsPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { useAuthStore } from './store/authStore';
import { useSocket } from './hooks/useSocket';

const queryClient = new QueryClient();

const RequireAuth = ({ children }: { children: ReactElement }) => {
  const tokens = useAuthStore((state) => state.tokens);
  return tokens ? children : <Navigate replace to="/login" />;
};

export const App = () => {
  useSocket();

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route element={<Navigate replace to="/login" />} path="/" />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RegisterPage />} path="/register" />
        <Route element={<VerifyOtpPage />} path="/verify-otp" />
        <Route element={<ForgotPasswordPage />} path="/forgot-password" />
        <Route element={<ResetPasswordPage />} path="/reset-password" />
        <Route
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
          path="/dashboard"
        />
        <Route
          element={
            <RequireAuth>
              <SendMoneyPage />
            </RequireAuth>
          }
          path="/send"
        />
        <Route
          element={
            <RequireAuth>
              <HistoryPage />
            </RequireAuth>
          }
          path="/history"
        />
        <Route
          element={
            <RequireAuth>
              <AnalyticsPage />
            </RequireAuth>
          }
          path="/analytics"
        />
        <Route
          element={
            <RequireAuth>
              <QrPage />
            </RequireAuth>
          }
          path="/qr"
        />
        <Route
          element={
            <RequireAuth>
              <SplitBillsPage />
            </RequireAuth>
          }
          path="/split"
        />
        <Route
          element={
            <RequireAuth>
              <ProfilePage />
            </RequireAuth>
          }
          path="/profile"
        />
        <Route
          element={
            <RequireAuth>
              <AdminDashboardPage />
            </RequireAuth>
          }
          path="/admin"
        />
        <Route element={<Navigate replace to="/login" />} path="*" />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          className:
            'text-sm !bg-white !text-slate-900 !border !border-slate-200/80 dark:!bg-payflow-ink dark:!text-slate-50 dark:!border-payflow-dark-border',
          duration: 3500
        }}
      />
    </QueryClientProvider>
  );
};
