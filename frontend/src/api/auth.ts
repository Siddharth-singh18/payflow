import { apiClient } from './client';
import type { ApiEnvelope, EmptyApiEnvelope, LoginResponse, RegisterResponse } from '../types/auth';

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginPayload {
  emailOrPhone: string;
  password: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

export const registerUser = async (payload: RegisterPayload): Promise<RegisterResponse> => {
  const response = await apiClient.post<ApiEnvelope<RegisterResponse>>('/auth/register', payload);
  return response.data.data;
};

export const verifyOtp = async (payload: VerifyOtpPayload): Promise<EmptyApiEnvelope> => {
  const response = await apiClient.post<EmptyApiEnvelope>('/auth/verify-otp', payload);
  return response.data;
};

export const loginUser = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await apiClient.post<ApiEnvelope<LoginResponse>>('/auth/login', payload);
  return response.data.data;
};

export const forgotPassword = async (
  payload: ForgotPasswordPayload
): Promise<EmptyApiEnvelope> => {
  const response = await apiClient.post<EmptyApiEnvelope>('/auth/forgot-password', payload);
  return response.data;
};

export const resetPassword = async (payload: ResetPasswordPayload): Promise<EmptyApiEnvelope> => {
  const response = await apiClient.post<EmptyApiEnvelope>('/auth/reset-password', payload);
  return response.data;
};

export const logoutUser = async (refreshToken: string): Promise<EmptyApiEnvelope> => {
  const response = await apiClient.post<EmptyApiEnvelope>('/auth/logout', { refreshToken });
  return response.data;
};
