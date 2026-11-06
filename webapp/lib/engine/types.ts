// Shared engine contract for the DNA Digital Security Assistant.
// Pure data shapes only — no runtime logic here.

export type Language = "fi" | "en" | "sv";

export type RiskLevel = "none" | "low" | "medium" | "high" | "critical";
export type Urgency = "none" | "routine" | "today" | "immediate";

export const ACTIONS = [
  "no_action_needed",
  "do_not_interact_and_delete",
  "verify_via_official_channel",
  "contact_operator_support",
  "change_password_and_enable_mfa",
  "isolate_device_and_scan",
  "contact_bank_and_block_cards",
  "report_to_authority",
  "escalate_to_human",
  "decline_out_of_scope",
] as const;
export type Action = (typeof ACTIONS)[number];

export type EscalationTarget =
  | "operator_support_agent"
  | "security_specialist"
  | "business_security_support"
  | "human_advisor";

export interface Artifact {
  type?: string; // sms | email | call | letter | chat | notification | app | ad
  sender?: string;
  body?: string;
  links?: string[];
  received_at?: string;
  channel_language?: string;
  thread_contains_genuine_messages_from_same_sender?: boolean;
  [k: string]: unknown;
}

export interface LinkCheck {
  url?: string;
  verdict?: string; // malicious | suspicious | clean | unknown
  confidence?: number;
  categories?: string[];
  domain_age_days?: number;
  checked_at?: string;
  [k: string]: unknown;
}

export interface CallWarning {
  category?: string; // e.g. spam | scam_suspected | spoofed | premium
  verdict?: string;
  label?: string;
  [k: string]: unknown;
}

export interface SubscriptionSignals {
  products?: Array<Record<string, unknown>>;
  recent_events?: Array<{
    type?: string; // esim_activation | porting | order | billing_change ...
    minutes_ago?: number;
    days_ago?: number;
    initiated_by_verified_user?: string; // yes | no | unknown
    channel?: string;
    [k: string]: unknown;
  }>;
  network_status?: { service?: string; since_minutes?: number; [k: string]: unknown };
  [k: string]: unknown;
}

export interface DeviceSignals {
  summary?: { platform?: string; os_version?: string; patch_status?: string; security_app?: string; [k: string]: unknown };
  recent_app_installs?: Array<Record<string, unknown>> | null;
  security_findings?: Array<Record<string, unknown>> | null;
  [k: string]: unknown;
}

export interface OperatorAccountSignals {
  recent_logins?: Array<{ days_ago?: number; hours_ago?: number; country?: string; device_known?: boolean; result?: string; [k: string]: unknown }> | null;
  [k: string]: unknown;
}

export interface BusinessSignals {
  profile?: { company?: string; employees?: number; admins?: number; it_support?: string; payment_approval?: string; [k: string]: unknown };
  staff_accounts?: Array<Record<string, unknown>> | null;
  [k: string]: unknown;
}

export interface CaseSignals {
  artifact?: Artifact | null;
  link_check?: LinkCheck | null;
  call_warning?: CallWarning | null;
  user_call_notes?: string | null;
  subscription?: SubscriptionSignals | null;
  device?: DeviceSignals | null;
  operator_account?: OperatorAccountSignals | null;
  credential_exposure?: { found?: boolean; sources?: Array<{ service_category?: string; exposed?: string[]; days_ago?: number; [k: string]: unknown }>; [k: string]: unknown } | null;
  business?: BusinessSignals | null;
  [k: string]: unknown;
}

export interface CaseConsent {
  requires_consent?: string[];
  pre_granted?: string[];
}

export interface CaseInput {
  case_id: string;
  split?: string;
  version?: string;
  journey: "suspicious_message" | "clicked_link" | "suspicious_call" | "breach_notice" | "smb_incident";
  audience: "consumer" | "small_business";
  locale?: string;
  language: Language;
  persona?: Record<string, unknown>;
  entry_point?: string;
  user_identified?: boolean;
  opening_message?: string;
  signals: CaseSignals;
  signal_availability?: Record<string, string>;
  consent?: CaseConsent;
  [k: string]: unknown;
}

export interface Decision {
  case_id: string;
  mode?: "single_turn" | "multi_turn";
  risk_level: RiskLevel;
  urgency: Urgency;
  primary_action: Action;
  secondary_actions?: Action[];
  advice_text: string;
  steps: string[];
  questions_asked?: string[];
  question_topics?: string[];
  escalation_required: boolean;
  escalation_target?: EscalationTarget | null;
  signals_used?: string[];
  consent_requested_for?: string[];
  citations?: string[];
  confidence?: number;
  abstained?: boolean;
}

export interface ConversationState {
  facts: Record<string, string>; // topic -> user's verbatim answer
  granted: string[]; // consent paths granted
  refused: string[]; // consent paths refused
  askedTopics: string[]; // topics already asked about
  consentAsked: string[]; // consent paths already requested
}

export type AssistantTurn =
  | { type: "question"; text: string; topics: string[] }
  | { type: "consent_request"; fields: string[]; text: string };

export interface MultiTurnResult {
  decision: Decision | null; // null while the engine still wants a turn
  turn?: AssistantTurn;
}
