export type UserRole = 'user' | 'admin';
export type KycStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';
export type KycTier = 'unverified' | 'verified';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface JwtUserPayload {
  userId: string;
  role: UserRole;
  sessionId: string;
}

export interface AuthenticatedUser {
  userId: string;
  role: UserRole;
  sessionId: string;
}
