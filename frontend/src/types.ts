export interface BusinessAuditRequest {
  business_name: string;
  website: string;
  city: string;
  business_type: string;
  email: string;
  /** Optional — phone captured on the Growth Score opt-in (required in that UI). */
  phone?: string;
}

export interface RevenueLeak {
  monthly_leak: number;
  annual_leak: number;
  missed_calls_per_month: number;
  avg_job_value: number;
  recovery_potential: number;
  recovery_calls: number;
  payback_months: number;
}

export interface SignalStatus {
  weight: number;
  value: number;
  available: boolean;
}

export type Impact = 'critical' | 'high' | 'medium' | 'low';
export type Effort = 'low' | 'medium' | 'high';

export interface Recommendation {
  title: string;
  detail: string;
  impact: Impact;
  effort: Effort;
  category: string;
}

export interface SchemaSuggestion {
  type: string;
  label: string;
  html_block: string;
}

export interface ApiHealthEntry {
  last_ok_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
}

export interface HealthResponse {
  status: string;
  has_keys: Record<string, boolean>;
  api_status: Record<string, ApiHealthEntry>;
  audit_api_budget: number;
}

export interface PricingTier {
  monthly?: number;
  monthly_original?: number;
  one_time?: number;
}

export interface PricingResponse {
  founding_active: boolean;
  founding_slots_remaining: number;
  founding_cap: number;
  tiers: {
    diy: PricingTier;
    standard: PricingTier;
    pro: PricingTier;
  };
}

export interface AuditResult {
  audit_id: string;
  business_name: string;
  website: string;
  city: string;
  business_type: string;
  email: string;
  total_score: number;
  grade: string;
  grade_label: string;
  percentile: number;
  segment: string;
  lola_message: string;
  revenue_leak: RevenueLeak;
  page_speed: {
    performance: number;
    accessibility: number;
    seo: number;
    ok?: boolean;
  };
  safety: { is_safe: boolean; ok?: boolean };
  business_info: Record<string, unknown>;
  competitors: Array<Record<string, unknown>>;
  categories: Record<string, { score: number }>;
  signals: Record<string, SignalStatus>;
  recommendations: Recommendation[];
  page_seo?: {
    suggested_schemas?: SchemaSuggestion[];
    [key: string]: unknown;
  };
  agent_readiness?: AgentReadiness;
}

export interface AgentReadinessCategory {
  name: string;
  score: number;
  weight: number;
  value: number;
  available: boolean;
}

export interface AgentReadiness {
  score: number;
  grade: string;
  grade_label: string;
  categories: AgentReadinessCategory[];
}
