import { apiClient } from './client';
import type { ApiEnvelope } from '../types/auth';
import type { KycStatusResponse } from '../types/kyc';

export const getKycStatus = async (): Promise<KycStatusResponse> => {
  const response = await apiClient.get<ApiEnvelope<{ kyc: KycStatusResponse }>>('/kyc/status');
  return response.data.data.kyc;
};

export const submitKyc = async (aadhaar: File, pan: File): Promise<KycStatusResponse> => {
  const formData = new FormData();
  formData.append('aadhaar', aadhaar);
  formData.append('pan', pan);

  const response = await apiClient.post<ApiEnvelope<{ kyc: KycStatusResponse }>>(
    '/kyc/submit',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }
  );
  return response.data.data.kyc;
};
