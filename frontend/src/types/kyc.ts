export type KycStatus = 'not_submitted' | 'pending' | 'verified' | 'rejected';
export type KycTier = 'unverified' | 'verified';

export interface KycStatusResponse {
  status: KycStatus;
  tier: KycTier;
  rejectionReason?: string;
  submittedAt?: string;
  reviewedAt?: string;
}
