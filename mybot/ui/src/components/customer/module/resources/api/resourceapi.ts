import { API_BASE, apiRequest } from '@/api/context/apiClient';

export interface ResourceItem {
  id: number;
  title: string;
  resource_type: string;
  content?: string | null;
  filename?: string | null;
  original_name?: string | null;
  mime_type?: string | null;
  size?: number | null;
  url?: string | null;
  is_active: boolean;
  is_indexed: boolean;
  created_by_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTextResourcePayload {
  title: string;
  resource_type: string;
  content: string;
  is_active: boolean;
}

export interface CreateUrlResourcePayload {
  title: string;
  url: string;
  resource_type: string;
  is_active: boolean;
}

export interface UpdateResourcePayload {
  title?: string;
  resource_type?: string;
  content?: string;
  is_active?: boolean;
  is_indexed?: boolean;
}

export interface ResourceIndexResponse {
  message: string;
  resource_id: number;
  chunks: number;
  embedding_model: string;
}

export function resourceUrl(url?: string | null) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export function getResources() {
  return apiRequest<ResourceItem[]>('/resources');
}

export function createTextResource(payload: CreateTextResourcePayload) {
  return apiRequest<ResourceItem>('/resources', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createUrlResource(payload: CreateUrlResourcePayload) {
  return apiRequest<ResourceItem>('/resources/url', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function uploadResourceFile(title: string, resourceType: string, file: File) {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('resource_type', resourceType);
  formData.append('file', file);

  return apiRequest<ResourceItem>('/resources/upload', {
    method: 'POST',
    body: formData,
  });
}

export function updateResource(id: number, payload: UpdateResourcePayload) {
  return apiRequest<ResourceItem>(`/resources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function indexResource(id: number) {
  return apiRequest<ResourceIndexResponse>(`/resources/${id}/index`, {
    method: 'POST',
  });
}

export function deleteResource(id: number) {
  return apiRequest<{ message: string }>(`/resources/${id}`, {
    method: 'DELETE',
  });
}

export interface ResourceDeindexResponse {
  message: string;
  resource_id: number;
}

export function deindexResource(id: number) {
  return apiRequest<ResourceDeindexResponse>(`/resources/${id}/deindex`, {
    method: 'POST',
  });
}