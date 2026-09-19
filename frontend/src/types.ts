export type UserRole = 'support_agent' | 'supervisor' | 'admin';

export interface UserPersona {
  username: string;
  name: string;
  role: UserRole;
  title: string;
  description: string;
  avatarColor: string;
  badgeBg: string;
  badgeText: string;
}

export interface LoginResponse {
  token: string;
  role: UserRole;
  user_id: string;
}

export interface RiskAssessment {
  risk_level: 'high' | 'low';
  refund_amount: number;
  is_high_value: boolean;
  policy_ambiguous: boolean;
  reason: string;
}

export interface InterruptPayload {
  message: string;
  draft_email: string;
  risk_assessment: RiskAssessment;
  ticket_ref?: string;
  query: string;
}

export interface QueryResponse {
  thread_id: string;
  final_status: string;
  draft_email: string;
  risk: RiskAssessment;
  interrupted: boolean;
  interrupt_payload?: InterruptPayload | null;
}

export interface ResumeRequestDecision {
  approved: boolean;
  reason?: string;
}

export interface ResumeResponse {
  thread_id: string;
  final_status: string;
  draft_email: string;
  risk: RiskAssessment;
}

export interface ThreadRecord {
  id: string;
  timestamp: string;
  query: string;
  ticket_ref?: string;
  persona: string;
  role: UserRole;
  final_status: string;
  draft_email: string;
  risk: RiskAssessment;
  interrupted: boolean;
  interrupt_payload?: InterruptPayload | null;
  resumed?: boolean;
}

export interface ScenarioPreset {
  id: string;
  title: string;
  query: string;
  ticket_ref: string;
  tag: 'auto-resolve' | 'hitl-interrupt' | 'rls-blocked';
  tagLabel: string;
  description: string;
}
