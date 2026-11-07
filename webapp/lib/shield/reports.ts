// Deterministic report-draft generation. No LLM, no I/O: given the call
// evidence and the engine classification, these produce ready-to-send drafts
// for the operator's network filter, Traficom and the police, plus removal
// notices partners must act on when a report is pulled back.
// All drafts state facts only; the user's own account is marked as their statement.

import type { Decision, Language } from "../engine/types";
import type { ReportDraft, ReportKind, RemovalNotice } from "./types";

export interface ReportEvidence {
  reportId: string;
  number: string;
  eventAt: string;
  warningLabel: string | null;
  callerAccount: string;
  language: Language;
  decision: Decision | null;
}

const ACTION_LABELS: Record<string, Record<Language, string>> = {
  report_to_authority: { fi: "ilmoitus viranomaiselle", en: "report to the authority", sv: "anmälan till myndigheten" },
  contact_operator_support: { fi: "yhteydenotto operaattorin asiakaspalveluun", en: "contacting operator support", sv: "kontakt med operatörens kundtjänst" },
  do_not_interact_and_delete: { fi: "ei vuorovaikutusta, poisto", en: "do not interact, delete", sv: "ingen interaktion, radera" },
  verify_via_official_channel: { fi: "varmistus viralliselta kanavalta", en: "verify via the official channel", sv: "verifiering via officiell kanal" },
  contact_bank_and_block_cards: { fi: "pankkayhteydenotto ja korttien estäminen", en: "contact the bank and block cards", sv: "kontakt med banken och kortspärr" },
  isolate_device_and_scan: { fi: "laitteen eristäminen ja tarkistus", en: "isolate the device and scan", sv: "isolera enheten och skanna" },
  change_password_and_enable_mfa: { fi: "salasanan vaihto ja kaksivaiheinen tunnistus", en: "change password and enable MFA", sv: "byt lösenord och aktivera tvåstegsverification" },
  escalate_to_human: { fi: "siirto asiantuntijalle", en: "escalate to a human advisor", sv: "eskalering till rådgivare" },
  no_action_needed: { fi: "ei toimenpiteitä", en: "no action needed", sv: "inga åtgärder" },
  decline_out_of_scope: { fi: "ei kuulu palvelun piiriin", en: "out of scope", sv: "utanför tjänstens område" },
};

function actionLabel(action: string | undefined, language: Language): string {
  if (action && ACTION_LABELS[action]) return ACTION_LABELS[action][language];
  return action ?? "—";
}

function formatTime(iso: string, language: Language): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const locale = language === "fi" ? "fi-FI" : language === "sv" ? "sv-SE" : "en-GB";
  return d.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

interface T {
  operatorTo: string;
  operatorSubject: (n: string) => string;
  traficomTo: string;
  traficomSubject: (n: string) => string;
  policeTo: string;
  policeSubject: (n: string) => string;
  number: string;
  time: string;
  warning: string;
  account: string;
  classification: string;
  ref: string;
  operatorAsk: string;
  traficomAsk: string;
  policeAsk: string;
  signature: string;
}

const TEMPLATES: Record<Language, T> = {
  fi: {
    operatorTo: "DNA, verkostoseuranta (haittapuhelusuodatus)",
    operatorSubject: (n) => `Haittapuheluilmoitus — ${n}`,
    traficomTo: "Traficom, kansallinen kyberturvakeskus",
    traficomSubject: (n) => `Haitta- ja huijauspuheluilmoitus — ${n}`,
    policeTo: "Poliisi (esitutkinta / nettipoliisi)",
    policeSubject: (n) => `Todistusaineisto rikosilmoitusta varten — puheluhuijaus, ${n}`,
    number: "Puhelinnumero",
    time: "Ajankohta",
    warning: "Verkon hälytys",
    account: "Soittajan kuvaus (asiakkaan oma lausuma)",
    classification: "Avustajan luokitus",
    ref: "Raporttitunnus",
    operatorAsk: "Pyydämme numeron lisäämistä verkotason suodatuslistaan ja varmennusta muiden asiakkaiden raportteja vasten.",
    traficomAsk: "Pyydämme ilmoittamaan numeron osaksi haittaviestintäseurantaa ja tarvittaessa eteenpäin viranomaisverkostoon.",
    policeAsk: "Aineisto on koostettu asiakkaan luvalla rikosilmoituksen liitteeksi. Asiakas tekee itse varsinaisen ilmoituksen.",
    signature: "DNA Security Assistant — automaattinen luonnos asiakkaan puolesta (lähettää vasta asiakkaan vahvistama).",
  },
  en: {
    operatorTo: "DNA network filtering team",
    operatorSubject: (n) => `Nuisance call report — ${n}`,
    traficomTo: "Traficom, National Cyber Security Centre",
    traficomSubject: (n) => `Nuisance / scam call report — ${n}`,
    policeTo: "Police (pre-trial investigation / NetPolice)",
    policeSubject: (n) => `Evidence pack for a police report — phone scam, ${n}`,
    number: "Phone number",
    time: "Time of call",
    warning: "Network warning",
    account: "Caller account (customer's own statement)",
    classification: "Assistant classification",
    ref: "Report reference",
    operatorAsk: "We ask that the number be added to the network-level filter list and cross-checked against other customers' reports.",
    traficomAsk: "We ask that the number be included in nuisance-communication monitoring and forwarded to the authority network if needed.",
    policeAsk: "This pack was compiled with the customer's consent as an annex to their police report. The customer files the report themselves.",
    signature: "DNA Security Assistant — automatic draft on behalf of the customer (sent only after customer confirmation).",
  },
  sv: {
    operatorTo: "DNA, nätverksövervakning (filtrering av störande samtal)",
    operatorSubject: (n) => `Anmälan om störande samtal — ${n}`,
    traficomTo: "Traficom, nationella cybersäkerhetscentret",
    traficomSubject: (n) => `Anmälan om störande/bedrägliga samtal — ${n}`,
    policeTo: "Polisen (förundersökning / nätpolis)",
    policeSubject: (n) => `Bevismaterial för polisanmälan — telefonbedrägeri, ${n}`,
    number: "Telefonnummer",
    time: "Tidpunkt",
    warning: "Nätverksvarning",
    account: "Beskrivning av samtalet (kundens eget uttalande)",
    classification: "Assistantens klassificering",
    ref: "Rapportreferens",
    operatorAsk: "Vi begär att numret läggs till i nätverksnivåns filterlista och stäms av mot andra kunders rapporter.",
    traficomAsk: "Vi begär att numret tas med i bevakningen av störande kommunikation och vid behov vidarebefordras till myndighetsnätverket.",
    policeAsk: "Materialet har sammanställts med kundens samtycke som bilaga till polisanmälan. Kunden lämnar själv anmälan.",
    signature: "DNA Security Assistant — automatiskt utkast å kundens vägnar (skickas först efter kundens bekräftelse).",
  },
};

function classificationLine(t: T, ev: ReportEvidence): string {
  const d = ev.decision;
  if (!d) return `${t.classification}: —`;
  return `${t.classification}: risk ${d.risk_level}, ${actionLabel(d.primary_action, ev.language)}${
    d.urgency ? `, urgency ${d.urgency}` : ""
  }`;
}

function sharedFacts(t: T, ev: ReportEvidence): string[] {
  return [
    `${t.number}: ${ev.number}`,
    `${t.time}: ${formatTime(ev.eventAt, ev.language)}`,
    `${t.warning}: ${ev.warningLabel ?? "—"}`,
    `${t.account}: ${ev.callerAccount}`,
    classificationLine(t, ev),
    `${t.ref}: ${ev.reportId}`,
  ];
}

function draft(kind: ReportKind, ev: ReportEvidence, at: string): ReportDraft {
  const t = TEMPLATES[ev.language];
  const facts = sharedFacts(t, ev).map((l) => `• ${l}`).join("\n");
  const to =
    kind === "operator" ? t.operatorTo : kind === "traficom" ? t.traficomTo : t.policeTo;
  const subject =
    kind === "operator"
      ? t.operatorSubject(ev.number)
      : kind === "traficom"
        ? t.traficomSubject(ev.number)
        : t.policeSubject(ev.number);
  const ask =
    kind === "operator" ? t.operatorAsk : kind === "traficom" ? t.traficomAsk : t.policeAsk;
  const body = `${t[`${kind}To` as keyof T] as string}\n\n${facts}\n\n${ask}\n\n${t.signature}`;
  return { kind, language: ev.language, subject, body, generatedAt: at };
}

export function draftFor(ev: ReportEvidence, kind: ReportKind, at: string): ReportDraft {
  return draft(kind, ev, at);
}

const NOTICE_TEMPLATES: Record<Language, { subject: (n: string) => string; body: (n: string, ref: string, reason: string) => string }> = {
  fi: {
    subject: (n) => `Poistopyyntö — numero ${n}`,
    body: (n, ref, reason) =>
      `Raportti numeroon ${n} (viite ${ref}) on vedetty takaisin: ${reason}.\n\n` +
      `Pyydämme poistamaan numeron ${n} estolistoiltanne ja poistamaan kaikki siihen liittyvät raporttitiedot.\n\n` +
      `Peruste: EU 2016/679 (GDPR) art. 17(1)(b)–(c) — tietojen käsittely on perusteetonta — sekä art. 19 viestintä käsittelyn korjaamisesta. Väärä raportti ei saa jäädä pysyväksi tietueeksi.`,
  },
  en: {
    subject: (n) => `Removal request — number ${n}`,
    body: (n, ref, reason) =>
      `The report on ${n} (reference ${ref}) has been withdrawn: ${reason}.\n\n` +
      `Please remove ${n} from your blocklists and delete all related report data.\n\n` +
      `Legal basis: GDPR (EU) 2016/679 Art. 17(1)(b)–(c) — the processing has no lawful basis — and Art. 19 on notifying recipients of a rectification. A false report must not become a permanent record.`,
  },
  sv: {
    subject: (n) => `Begäran om radering — nummer ${n}`,
    body: (n, ref, reason) =>
      `Rapporten om ${n} (referens ${ref}) har återtagits: ${reason}.\n\n` +
      `Vi begär att ${n} tas bort från era blocklistor och att alla relaterade rapportuppgifter raderas.\n\n` +
      `Rättslig grund: GDPR (EU) 2016/679 art. 17(1)(b)–(c) — behandlingen saknar rättslig grund — och art. 19 om underrättelse av mottagare om rättelse. En felaktig rapport får inte bli en permanent post.`,
  },
};

// Consent-withdrawal notices for the lead marketplace: the user pulled their
// consent, so the partner must purge the number from marketing systems.
const LEAD_NOTICE_TEMPLATES: Record<Language, { subject: (n: string) => string; body: (n: string, ref: string) => string }> = {
  fi: {
    subject: (n) => `Suostumuksen peruutus — numero ${n}`,
    body: (n, ref) =>
      `Käyttäjä on peruuttanut suostumuksensa tarjousten vastaanottamiseen (liidi ${ref}, numero ${n}).\n\n` +
      `Pyydämme poistamaan numeron ${n} markkinointijärjestelmistäne ja lopettamaan yhteydenotot siihen. Kaikki liidiin liittyvät tiedot on poistettava.\n\n` +
      `Peruste: EU 2016/679 (GDPR) art. 7(3) — suostumuksen peruuttaminen — sekä art. 17(1)(b) ja art. 19.`,
  },
  en: {
    subject: (n) => `Consent withdrawal — number ${n}`,
    body: (n, ref) =>
      `The user has withdrawn their consent to receive offers (lead ${ref}, number ${n}).\n\n` +
      `Please delete ${n} from your marketing systems and stop contacting this number. All related lead data must be removed.\n\n` +
      `Legal basis: GDPR (EU) 2016/679 Art. 7(3) — withdrawal of consent — and Art. 17(1)(b) and Art. 19.`,
  },
  sv: {
    subject: (n) => `Återkallat samtycke — nummer ${n}`,
    body: (n, ref) =>
      `Användaren har återkallat sitt samtycke att ta emot erbjudanden (liid ${ref}, nummer ${n}).\n\n` +
      `Vi begär att ${n} tas bort från era marknadsföringssystem och att kontakten upphör. All relaterad liid-data ska raderas.\n\n` +
      `Rättslig grund: GDPR (EU) 2016/679 art. 7(3) — återkallande av samtycke — samt art. 17(1)(b) och art. 19.`,
  },
};

export function removalNotice(input: {
  number: string;
  reportId: string;
  reporterId: string;
  partnerIds: string[];
  language: Language;
  reason: RemovalNotice["reason"];
  at: string;
}): RemovalNotice {
  if (input.reason === "consent_withdrawn") {
    const lt = LEAD_NOTICE_TEMPLATES[input.language];
    return {
      id: `notice-lead-${input.reportId}-${Date.now()}`,
      at: input.at,
      number: input.number,
      reporterId: input.reporterId,
      partnerIds: input.partnerIds,
      language: input.language,
      subject: lt.subject(input.number),
      body: lt.body(input.number, input.reportId),
      reason: input.reason,
    };
  }
  const tpl = NOTICE_TEMPLATES[input.language];
  const reasonText =
    input.reason === "account_suspended_for_misuse"
      ? { fi: "raportoija on poistettu palvelusta väärinkäytön vuoksi", en: "the reporter's account was suspended for misuse", sv: "rapportören har stängts av för missbruk" }[input.language]
      : { fi: "numero on todettu lailliseksi kumppaniverifioinnissa", en: "the number was verified as legitimate by a partner", sv: "numret har konstaterats legitimt av en partner" }[input.language];
  return {
    id: `notice-${input.reportId}-${Date.now()}`,
    at: input.at,
    number: input.number,
    reporterId: input.reporterId,
    partnerIds: input.partnerIds,
    language: input.language,
    subject: tpl.subject(input.number),
    body: tpl.body(input.number, input.reportId, reasonText),
    reason: input.reason,
  };
}
