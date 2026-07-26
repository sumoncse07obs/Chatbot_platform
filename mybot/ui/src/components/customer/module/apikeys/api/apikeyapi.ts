import { apiRequest } from '@/api/context/apiClient';

export interface ApiKeyItem {
  id: number;
  name: string;
  display_name: string;
  welcome_message?: string | null;
  temperature: number;
  key_preview: string;
  key_value?: string | null;
  avatar_url?: string | null;
  system_prompt?: string | null;
  is_active: boolean;
  created_by_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyPayload {
  name: string;
  display_name: string;
  welcome_message?: string | null;
  temperature: number;
  avatar_url?: string | null;
  system_prompt?: string | null;
  is_active: boolean;
}

export function getApiKeys() {
  return apiRequest<ApiKeyItem[]>('/api-keys');
}

export function createApiKey(payload: ApiKeyPayload) {
  return apiRequest<ApiKeyItem>('/api-keys', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateApiKey(id: number, payload: Partial<ApiKeyPayload>) {
  return apiRequest<ApiKeyItem>(`/api-keys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteApiKey(id: number) {
  return apiRequest<{ message: string }>(`/api-keys/${id}`, {
    method: 'DELETE',
  });
}

export function revealApiKey(id: number) {
  return apiRequest<{ key: string }>(`/api-keys/${id}/reveal`, {
    method: 'POST',
  });
}

export function rotateApiKey(id: number) {
  return apiRequest<ApiKeyItem>(`/api-keys/${id}/rotate`, {
    method: 'POST',
  });
}