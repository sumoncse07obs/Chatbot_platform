import { apiRequest } from '@/api/context/apiClient';

export interface AgentProfile {
  id: number;
  api_key_id: number;
  business_summary: string | null;
  supported_topics: string[];
  services: string[];
  suggested_questions: string[];
  missing_information: string[];
  handoff_message: string | null;
  is_ready: boolean;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateAgentProfilePayload {
  api_key_id: number;
  force?: boolean;
}

export function getAgentProfile(apiKeyId: number) {
  return apiRequest<AgentProfile>(`/agent-profiles/${apiKeyId}`);
}

export function generateAgentProfile(payload: GenerateAgentProfilePayload) {
  return apiRequest<AgentProfile>('/agent-profiles/generate', {
    method: 'POST',
    body: JSON.stringify({
      api_key_id: payload.api_key_id,
      force: Boolean(payload.force),
    }),
  });
}