import { apiRequest } from '@/api/context/apiClient';

export interface WidgetInstall {
  id: number;
  name: string;
  api_key_id: number;
  created_by_id?: number | null;
  external_user_id?: string | null;
  embed_type: 'iframe' | 'loader';
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  width: number;
  height: number;
  button_text_open: string;
  button_text_close: string;
  z_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WidgetInstallPayload {
  name: string;
  api_key_id: number;
  external_user_id?: string | null;
  embed_type: 'iframe' | 'loader';
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  width: number;
  height: number;
  button_text_open: string;
  button_text_close: string;
  z_index: number;
  is_active: boolean;
}

export function getWidgetInstalls() {
  return apiRequest<WidgetInstall[]>('/widget-installs');
}

export function createWidgetInstall(payload: WidgetInstallPayload) {
  return apiRequest<WidgetInstall>('/widget-installs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateWidgetInstall(id: number, payload: Partial<WidgetInstallPayload>) {
  return apiRequest<WidgetInstall>(`/widget-installs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteWidgetInstall(id: number) {
  return apiRequest<{ message: string }>(`/widget-installs/${id}`, {
    method: 'DELETE',
  });
}