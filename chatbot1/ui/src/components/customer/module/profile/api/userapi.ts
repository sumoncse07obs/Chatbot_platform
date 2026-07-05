import type { AuthUser } from '@/types';
import { apiRequest } from '@/api/context/apiClient';
import { setAuthUser } from '@/api/auth/auth';

export interface UpdateProfilePayload {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;

  avatar?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  address?: string | null;
  company_name?: string | null;
  website?: string | null;
  bio?: string | null;

  system_prompt?: string | null;
  openai_api_key?: string | null;
}

export interface ChangePasswordPayload {
  new_password: string;
}

function normalizeUserResponse(response: AuthUser | { user: AuthUser }): AuthUser {
  return 'user' in response ? response.user : response;
}

export async function getProfile() {
  const response = await apiRequest<AuthUser | { user: AuthUser }>('/auth/me');
  const user = normalizeUserResponse(response);
  setAuthUser(user);
  return user;
}

export async function updateProfile(payload: UpdateProfilePayload) {
  const response = await apiRequest<AuthUser | { user: AuthUser }>('/auth/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  const user = normalizeUserResponse(response);
  setAuthUser(user);
  return user;
}

export function changeProfilePassword(payload: ChangePasswordPayload) {
  return apiRequest<{ message: string }>('/auth/me/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
