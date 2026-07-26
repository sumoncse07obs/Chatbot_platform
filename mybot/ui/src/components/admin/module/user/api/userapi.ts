import type { Role } from '@/types';

import { apiRequest } from '@/api/context/apiClient';

export interface AdminUser {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  role: Role;
  is_active: boolean;
  created_at?: string;
}

export interface CreateAdminUserPayload {
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  password: string;
  role: Role;
  is_active?: boolean;
}

export interface UpdateAdminUserPayload {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  is_active?: boolean;
  system_prompt?: string | null;
  openai_api_key?: string | null;
}

export function getAdminUsers() {
  return apiRequest<AdminUser[]>('/admin/users');
}

export function createAdminUser(payload: CreateAdminUserPayload) {
  return apiRequest<AdminUser>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminUser(id: number, payload: UpdateAdminUserPayload) {
  return apiRequest<AdminUser>(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function changeAdminUserRole(id: number, role: Role) {
  return apiRequest<AdminUser>(`/admin/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export function changeAdminUserPassword(id: number, password: string) {
  return apiRequest<{ message: string }>(`/admin/users/${id}/password`, {
    method: 'PATCH',
    body: JSON.stringify({ new_password: password }),
  });
}

export function deleteAdminUser(id: number) {
  return apiRequest<{ message: string }>(`/admin/users/${id}`, {
    method: 'DELETE',
  });
}