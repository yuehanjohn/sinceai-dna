// Demo call events for the /shield FireBack demo flow.
// Adapted from info/data/samples/five_journeys.jsonl (suspicious_call journey, DSA-D-0160).

export interface CallWarningInfo {
  category: string; // scam_suspected | premium | spam
  label: string;
}

export interface CallEvent {
  id: string;
  number: string;
  /** ISO timestamp of the (simulated) call. */
  at: string;
  language: "fi" | "en" | "sv";
  /** "harasser" = nuisance caller worth the extra fan-out (see channels.ts):
   * also signed up where 99.99 % of harassers' counterparts are. */
  severity: "scam" | "harasser" | "benign";
  warning?: CallWarningInfo;
  notes: string;
}

/** A harasser call gets the extra channel group, a scam call the standard set. */
export function isHarasserEvent(event: CallEvent): boolean {
  return event.severity === "harasser";
}

export const DEMO_CALL_EVENTS: CallEvent[] = [
  {
    id: "call-operator-code",
    number: "+358 45 000 0295",
    at: "2026-11-06T17:14:00+02:00",
    language: "fi",
    severity: "scam",
    warning: { category: "scam_suspected", label: "Operator impersonation — caller asks for a one-time code" },
    notes:
      "Soittaja sanoi olevansa operaattorin asiakaspalvelusta ja tarjosi ilmaista SIM-päivitystä 5G:tä varten. Hän pyysi lukemaan ääneen tekstiviestillä tulleen vahvistuskoodin.",
  },
  {
    id: "call-wangiri",
    number: "+225 07 000 0112",
    at: "2026-11-06T09:02:00+02:00",
    language: "en",
    severity: "scam",
    warning: { category: "premium", label: "One-ring international call — possible Wangiri premium-rate scam" },
    notes:
      "The phone rang once and the caller hung up. No voicemail was left. Unknown international number; calling back may route to a premium-rate service.",
  },
  {
    id: "call-clinic",
    number: "+358 9 123 4567",
    at: "2026-11-06T08:20:00+02:00",
    language: "fi",
    severity: "benign",
    warning: { category: "spam", label: "Flagged as spam by the network filter" },
    notes:
      "Soitti kaksi kertaa ja jätti vastaajaviestin: terveysasema muistuttaa tulevasta ajanvarauksesta. Soittaja esiintyi klinikan nimellä ja numero on julkisessa luettelossa.",
  },
  {
    id: "call-harasser",
    number: "+358 50 000 0777",
    at: "2026-11-06T19:41:00+02:00",
    language: "fi",
    severity: "harasser",
    warning: { category: "spam", label: "Repeat unknown caller — third time today, no message" },
    notes:
      "Sama numero soitti jo kolmannen kerran tänään eikä jättänyt viestiä. Luurissa on hiljaista, välillä taustalta kuuluu baari. Ärsyttävä häirikkösoittelija — palautanko koston vai tyydynkö estämään?",
  },
];
