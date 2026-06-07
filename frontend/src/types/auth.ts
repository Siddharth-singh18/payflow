export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  isEmailVerified: boolean;
  kycStatus: 'not_submitted' | 'pending' | 'verified' | 'rejected';
  kycTier: 'unverified' | 'verified';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface EmptyApiEnvelope {
  success: boolean;
  message: string;
}

export interface LoginResponse {
  user: AuthUser;
  tokens: TokenPair;
}

export interface RegisterResponse {
  user: AuthUser;
}
