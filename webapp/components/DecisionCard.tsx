import type { Action, Decision, EscalationTarget } from "@/lib/engine/types";

const ACTION_LABELS: Record<Action, string> = {
  no_action_needed: "No action needed",
  do_not_interact_and_delete: "Do not interact and delete",
  verify_via_official_channel: "Verify via the official channel",
  contact_operator_support: "Contact operator support",
  change_password_and_enable_mfa: "Change password and enable MFA",
  isolate_device_and_scan: "Isolate device and scan",
  contact_bank_and_block_cards: "Contact bank and block cards",
  report_to_authority: "Report to the authorities",
  escalate_to_human: "Escalate to a human advisor",
  decline_out_of_scope: "Decline — out of scope",
};

const ESCALATION_LABELS: Record<EscalationTarget, string> = {
  operator_support_agent: "Operator support agent",
  security_specialist: "Security specialist",
  business_security_support: "Business security support",
  human_advisor: "Human advisor",
};

const RISK_STYLES: Record<
  string,
  { className: string; label: string }
> = {
  none: { className: "border-[var(--success)] text-[var(--success)]", label: "None" },
  low: { className: "border-[var(--success)] text-[var(--success)]", label: "Low" },
  medium: { className: "border-[var(--warning)] text-[var(--warning)]", label: "Medium" },
  high: { className: "border-[var(--error)] text-[var(--error)]", label: "High" },
  critical: { className: "border-[var(--error)] text-[var(--error)]", label: "Critical" },
};

const URGENCY_STYLES: Record<string, string> = {
  none: "text-[var(--muted)]",
  routine: "text-[var(--muted)]",
  today: "text-[var(--warning)]",
  immediate: "text-[var(--error)]",
};

/** English label for a primary/secondary action id; falls back to the raw id. */
export function actionLabel(action: string): string {
  return ACTION_LABELS[action as Action] ?? action;
}

export default function DecisionCard({ decision }: { decision: Decision }) {
  const risk = RISK_STYLES[decision.risk_level] ?? RISK_STYLES.none;
  const confidence =
    typeof decision.confidence === "number" && decision.confidence >= 0
      ? Math.min(decision.confidence, 1)
      : null;

  return (
    <section className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${risk.className}`}
        >
          Risk: {risk.label}
        </span>
        <span
          className={`rounded border border-[var(--border)] px-2 py-0.5 text-xs font-medium ${URGENCY_STYLES[decision.urgency] ?? URGENCY_STYLES.none}`}
        >
          Urgency: {decision.urgency}
        </span>
        {decision.abstained ? (
          <span className="rounded border border-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted)]">
            Abstained
          </span>
        ) : null}
        <span className="ml-auto text-xs text-[var(--muted)]">
          Case {decision.case_id}
        </span>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
          Primary action
        </p>
        <p className="text-base font-semibold">
          {ACTION_LABELS[decision.primary_action] ?? decision.primary_action}
        </p>
        {decision.secondary_actions?.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {decision.secondary_actions.map((action) => (
              <span
                key={action}
                className="rounded border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]"
              >
                {ACTION_LABELS[action] ?? action}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <p className="rounded border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
        {decision.advice_text}
      </p>

      {decision.escalation_required ? (
        <div className="rounded border border-[var(--warning)] bg-[var(--background)] p-3 text-sm">
          <p className="font-semibold text-[var(--warning)]">
            Escalation required
          </p>
          {decision.escalation_target ? (
            <p className="text-[var(--foreground)]">
              Escalate to: {ESCALATION_LABELS[decision.escalation_target] ?? decision.escalation_target}
            </p>
          ) : null}
        </div>
      ) : null}

      {decision.steps.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Steps
          </p>
          <ul className="mt-1 space-y-1">
            {decision.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden
                  className="mt-0.5 text-[var(--success)]"
                >
                  ✓
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {decision.consent_requested_for?.length ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Consent requested for
          </p>
          <div className="mt-1 flex flex-wrap gap-2">
            {decision.consent_requested_for.map((field) => (
              <span
                key={field}
                className="rounded-full border border-[var(--accent)] px-2 py-0.5 text-xs text-[var(--accent)]"
              >
                {field}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {decision.citations?.length ? (
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Citations
          </p>
          <ul className="mt-1 list-inside list-disc text-xs text-[var(--muted)]">
            {decision.citations.map((citation, i) => (
              <li key={i}>{citation}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {confidence !== null ? (
        <div>
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <span>Confidence</span>
            <span>{Math.round(confidence * 100)}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={Math.round(confidence * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-1 h-2 w-full overflow-hidden rounded-full border border-[var(--border)] bg-[var(--background)]"
          >
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${Math.round(confidence * 100)}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
