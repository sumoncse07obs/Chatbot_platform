import { apiRequest } from '@/api/context/apiClient';

export type HistoryVisitor = {
  id: number;
  external_user_id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export type HistoryMessage = {
  id: number;
  conversation_id: number;
  api_key_id: number;
  created_by_id: number | null;
  role: 'user' | 'assistant' | string;
  content: string;
  created_at: string;
};

export type HistoryConversation = {
  id: number;
  api_key_id: number;
  created_by_id: number | null;
  visitor_id?: number | null;
  external_user_id: string | null;
  title: string | null;
  last_message_at: string | null;
  needs_human: boolean;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string | null;
  api_key_name?: string | null;
  display_name?: string | null;
  visitor?: HistoryVisitor | null;
};

export type HistoryConversationDetail = HistoryConversation & {
  messages: HistoryMessage[];
};

export type HistoryListResponse = {
  data: HistoryConversation[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
};

export type Lead = {
  id: number;
  external_user_id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  api_key_id: number;
  api_key_name?: string | null;
  display_name?: string | null;
  conversation_count: number;
  last_message_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadListResponse = {
  data: Lead[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
};

export type HistoryListParams = {
  search?: string;
  status?: 'needs_human' | 'resolved' | '';
  page?: number;
  per_page?: number;
};

export function listHistory(params: HistoryListParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.per_page) {
    searchParams.set('per_page', String(params.per_page));
  }

  const query = searchParams.toString();

  return apiRequest<HistoryListResponse>(`/chat-history${query ? `?${query}` : ''}`);
}

export function listLeads(params: HistoryListParams = {}) {
  const searchParams = new URLSearchParams();

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.per_page) {
    searchParams.set('per_page', String(params.per_page));
  }

  const query = searchParams.toString();

  return apiRequest<LeadListResponse>(`/chat-history/leads${query ? `?${query}` : ''}`);
}

export function getHistoryConversation(conversationId: number) {
  return apiRequest<HistoryConversationDetail>(`/chat-history/${conversationId}`);
}


export function deleteHistoryConversation(conversationId: number) {
  return apiRequest<{ message: string }>(`/chat-history/${conversationId}`, {
    method: 'DELETE',
  });
}

export function updateHandoffStatus(conversationId: number, needsHuman: boolean) {
  return apiRequest<{ message: string }>(`/chat-history/${conversationId}/handoff`, {
    method: 'PATCH',
    body: JSON.stringify({ needs_human: needsHuman }),
  });
}