export type Role = 'admin' | 'customer' | 'user';

export interface AuthUser {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  phone?: string | null;
  role: Role;
  is_active: boolean;
  created_at?: string;

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

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface RegisterPayload {
  first_name?: string;
  last_name?: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}
