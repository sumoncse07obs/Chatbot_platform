import { API_BASE, apiRequest } from '@/api/context/apiClient';

export interface MediaItem {
  id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  url: string;
  uploaded_by_id?: number | null;
  created_at: string;
}

export function mediaUrl(url: string) {
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
}

export function getMedia() {
  return apiRequest<MediaItem[]>('/media');
}

export function uploadMedia(file: File) {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest<MediaItem>('/media/upload', {
    method: 'POST',
    body: formData,
  });
}

export function deleteMedia(id: number) {
  return apiRequest<{ message: string }>(`/media/${id}`, {
    method: 'DELETE',
  });
}
