import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiEnvelope, TokenPair } from '../types/auth';

const configuredApiUrl: unknown = import.meta.env.VITE_API_URL;
const apiBaseUrl =
  typeof configuredApiUrl === 'string' && configuredApiUrl.length > 0
    ? configuredApiUrl
    : 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

apiClient.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().tokens?.accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      throw error instanceof Error ? error : new Error('Request failed');
    }

    if (error.response?.status !== 401 || !error.config) {
      throw error;
    }

    const originalRequest = error.config;

    if (originalRequest.headers['x-payflow-retry']) {
      useAuthStore.getState().clearSession();
      throw error;
    }

    const refreshToken = useAuthStore.getState().tokens?.refreshToken;

    if (!refreshToken) {
      useAuthStore.getState().clearSession();
      throw error;
    }

    try {
      originalRequest.headers.set('x-payflow-retry', 'true');
      const response = await axios.post<ApiEnvelope<{ tokens: TokenPair }>>(
        `${apiBaseUrl}/auth/refresh`,
        { refreshToken }
      );
      useAuthStore.getState().setTokens(response.data.data.tokens);
      originalRequest.headers.Authorization = `Bearer ${response.data.data.tokens.accessToken}`;
      return await apiClient(originalRequest);
    } catch (refreshError) {
      useAuthStore.getState().clearSession();
      throw refreshError instanceof Error ? refreshError : new Error('Token refresh failed');
    }
  }
);

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const payload: unknown = error.response?.data;

    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const message = (payload as { message?: unknown }).message;

      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};
