// Signal + text classifiers. Language-agnostic keyword heuristics over the
// user's story (opening_message, artifact body, call notes) and operator-side
// signals. Pure functions, no I/O.
import type { CaseInput, Artifact, LinkCheck, CallWarning, SubscriptionSignals, DeviceSignals } from "./types.ts";

export type Archetype =
  | "phish_bank"
  | "phish_credentials"
  | "lure_fee"
  | "lure_prize"
  | "impersonation_authority"
  | "police_call"
  | "bank_call"
  | "tech_support_call"
  | "operator_bill"
  | "fake_breach"
  | "bec_supplier"
  | "ceo_fraud"
  | "app_install"
  | "link_opened"
  | "remote_access"
  | "code_request_call"
  | "wangiri"
  | "benign_flagged_call"
  | "call_generic"
  | "sim_takeover"
  | "unknown_login"
  | "approval_storm"
  | "breach_notice_generic"
  | "credential_distractor"
  | "ransomware"
  | "ex_employee"
  | "mailbox_takeover"
  | "router_alert"
  | "staff_phish"
  | "unexpected_order"
  | "attachment_open"
  | "stalkerware"
  | "out_of_scope_revenge"
  | "benign_generic"
  | "generic";

const has = (text: string, words: string[]): boolean => {
  if (!text) return false;
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w));
};

const BANK = ["pankki", "bank", "verkkopankki", "kortti", "card", "kort"];
const CREDS = ["salasana", "password", "tunnus", "käyttäjä", "login", "log in", "kirjaudu"];
const CODE_ASK = ["koodi", "code", "tunnusluku", "pin", "vahvistusnumero", "verification"];
const FEE = ["maksaa", "maksa", "fee", "maksu", "euro", "€", "toimituskulut", "customs", "tulli", "toimitusmaksu"];
const BENIGN_VERIFIED = ["soitin", "varmistin", "varmistanut", "verified with", "vahvistin", "kuittasin", "bekräftade", "confirmed with", "spoke to", "puhelimitse", "sopimuksessa", "talouspäällikölle", "finance manager", "henkilöltä, jonka numero"];
const PRIZE = ["voitto", "prize", "won", "refund", "palautus", "veronpalautus", "tax", "arvonta", "lottery", "palkinto"];
const AUTHORITY = ["poliisi", "police", "viranomainen", "authority", "verohallinto", "kela", "rajavartio"];
const OPERATOR = ["operaattori", "operator", "asiakaspalvelu", "customer service", "sim-päivitys", "sim upgrade", "5g", "liittymä", "subscription"];
const APK = [".apk", "asenna", "asensin", "download", "latasin", "sovelluksen linkistä", "app from"];
const REMOTE = ["etäyhtey", "etäkäyttö", "etäohjaus", "etätuen", "etäsupport", "etänä", "ohjata tietokonetta", "ohjata tietokonettani", "ohjata konetta", "control my computer", "kontrollera min dator", "remote", "anydesk", "teamviewer", "ruudunjako", "ruudun jak", "skärmdelning", "kontroll av", "fjärr"];
const TECH_SUPPORT = ["tietokoneeni on saastunut", "tietokone on saastunut", "computer is infected", "your computer has a virus", "tietokoneessa on virus", "datorn har en virus", "tekninen tuki", "technical support", "virus", "malware", "haittaohjelma"];
const ESIM = ["esim", "sim-kortti", "sim kort", "kenttä", "signal", "porttau", "siirretty", "aktivoitu uuteen", "uuteen laitteeseen", "new device"];
const LOGIN_PROMPT = ["kirjautumispyyntö", "approval", "hyväksyä", "approve", "login request", "kirjautune", "logged in", "istunto", "session", "godkännandeförfrågning"];
const UNKNOWN_LOGIN = ["tuntematon laite", "unknown device", "vieras laite", "kirjautune", "logged in from", "istunto", "login from", "inloggning från", "främmande enhet", "joku kirjautui", "someone logged", "kirjautuminen", "kirjautui", "kirjauduttiin", "login alert", "murtautu"];
const BREACH = ["tietovuoto", "breach", "leak", "vuoti", "vuodettu", "leaked", "exposed", "paljastui", "läckt"];
const CEO = ["toimitusjohtaja", "ceo", "pomo", "boss", "johtaja", "kiireellinen", "urgent", "luottamuksellinen", "confidential", "välittömästi"];
const BANKCHANGE = ["tilinumero", "bank account", "uudelle tilille", "new account", "uusi tilinumero", "pankki on vaihtunut", "banken har bytt", "iban", "bank-detail", "maksunsaajaan"];
const RANSOM = ["kiristyshaitta", "ransomware", "salattu", "encrypted", "lukitut tiedostot", "locked files", "krypterade", "krypterad"];
const EXEMP = ["entinen työntekijä", "ex-työntekijä", "former employee", "ex-employee", "lähti yrityksestä", "left the company", "lämnat företaget", "poistui yrityksestä", "ei enää työskentele", "no longer works", "ei ole enää yrityksessä"];
const ATTACH_OPENED = ["avasin liitteen", "opened the attachment", "liite avattu", "avasin tiedoston", "opened the file", "otin sisällön käyttöön", "enabled content", "enable content", "aktiverade innehållet", "opened an attachment", "opened a complaint", "opened a cv"];
const STAFF_WORDS = ["henkilöstö", "staff", "työntekijä", "työntekijät", "employee", "employees", "kollega", "colleague", "colleagues", "kirjanpitäjä", "bookkeeper", "accountant", "taloushenkilö"];
const PHISH_IND = ["huijaus", "phishing", "tietojenkalastelu", "salasana", "password", "kirjautui", "logged in", "kirjautu", "fake", "vilpillinen", "m365", "microsoft 365", "office 365", "microsoftin", "scam", "sign in", "työsähköposti", "work email"];
const RESET_WORDS = ["salasanan vaihto", "password reset", "salasanan palautus", "reset your password", "vaihda salasanasi", "change your password now", "lösenordsåterställning"];
const MAILBOX = ["postilaatikko", "mailbox", "edelleenlähety", "forwarding", "saapuneet", "inbox", "mejl"];
const ROUTER = ["reititin", "router", "modeemi", "modem", "wifi", "wlan"];
const STALK = ["seurantaohjelma", "seurantasovellus", "stalkerware", "monitoring app", "monitoroi", "vainoaminen", "stalking", "aikaisempi kumppani", "ex-partner", "ex kumppani", "pelkää", "afraid", "tietää viestejäni", "knows my messages", "knows where i", "tietää missä", "tietää liikkeen", "lukee viestejä", "reads my", "tracking my", "seuraa sijaintiani", "seuraa puhelinta", "seuraa minua", "tietää, missä olen", "övervakar", "vet var jag", "seurustele", "entinen puoliso", "entinen aviomies", "entinen vaimo", "aikaisempi seurustelu", "my ex", "ex-boyfriend", "ex-girlfriend", "tarkkailee", "tarkkailu", "vakoilee", "vakoilu", "tietää viesteistä", "näkee viestini", "lukee viestini", "katsoo puhelintani", "seuraa viestejäni", "tietää olin", "checks my", "seuraa sijaintia"];
const REVENGE = ["palautan", "kosto", "revenge", "häirin", "harass", "spammata", "spam him", "spam her", "soittakaa hänelle", "call him back", "tuhoamaan", "destroy", "paljastakaa", "identify the caller", "selvitä", "selvittää", "trace", "track down", "who is behind", "kenen numero", "whose number", "who owns", "kenelle numero kuuluu", "paljastaa kuka", "tutki kuka", "find out who", "kostaa heille", "get back at", "lähetä heille", "vastaa samalla", "teach them a lesson"];
const CLINIC = ["klinikka", "klinik", "lääkäri", "doctor", "terveysasema", "health centre", "health center", "ajanvaraus", "appointment", "hammaslääkäri", "dentist", "hälsocentral", "vårdcentral", "tandläkare", "läkare", "courier", "budbärare"];
const ONERING = ["yksi soitto", "soitti kerran", "ei ehtinyt vastata", "missed call", "one ring", "rang once", "ei vastannut", "no answer", "ei luettelossa", "unknown number called", "missat samtal", "en enda ringning"];
const ATTACH = ["liite", "liitteen", "attachment", "avasin liitteen", "opened the attachment", "valitus", "complaint", "ansioluettelo", "cv", "hakemus", "enable content", "sisällön käyttöön", "aktivera innehåll"];
const ORDER_UNEXPECTED = ["tilausvahvistus", "tilausvahvistuksen", "order confirmation", "sim-korttien tilaus", "uusia liittymiä", "order for new subscriptions", "ordrebekräftelse"];
const POLICE = ["poliisi", "police", "turvatili", "safe account", "rikostutkinta", "criminal investigation", "hand over the cash", "anna käteis", "käteisellä"];
const BANK_CALL = ["pankin", "pankista", "from the bank", "bankens", "banken", "bank security", "pankin turvayksikkö", "kortin sulku"];
const BENIGN_PARCEL = ["tilasin kyllä", "tilasin jotain", "i did order", "i ordered", "har beställt", "beställt något", "tilasin", "paketin noudettavissa", "parcel can be collected", "paketti on noudettavissa", "paketet kan hämtas", "pakettiviesti"];
const BENIGN_TRACKING = ["tilausvahvistuksen", "tilausvahvistus", "order confirmation", "seurantalinkki", "tracking link", "vahvistusviestistä", "ordrebekräftelse"];
const BENIGN_BANK_NOTICE = ["uusi viesti verkkopankissa", "new message in my online bank", "new message in your online bank", "nytt meddelande i internetbanken", "nytt meddelande i din internetbank", "ei ole linkkiä", "no link", "ingen länk", "siinä ei ole linkkiä", "det finns ingen länk", "uuden viestin verkkopankissa"];
const BENIGN_BILL = ["laskuilmoitus", "laskusta", "sähköpostin laskusta", "my bill", "min faktura", "om min faktura", "fakturan"];
const BENIGN_OFFER = ["5g-tarjous", "5g offer", "5g-tarjouksesta", "tarjousviesti", "tarjouksesta", "5g-uppgradering", "tarjouksen", "tarjousta", "5g speed", "faster 5g", "nopeampi 5g", "5g-nopeus"];
const BENIGN_LOGIN_SELF = ["kirjaudun juuri", "logging in", "kirjautuessa", "ottamassa käyttöön", "uudella läppärillä", "new laptop", "uutta tietokonetta", "new computer", "ny dator", "ny laptop", "yksi hyväksyntäpyyntö", "one approval request", "en godkännandeförfrågan"];
const WASNT_YOU_VETO = ["jos et", "if this wasn't", "if you did not", "wasn't you", "jos et ollut", " jos et sinä"];
const BENIGN_LEAK_ONLY = ["vain sähköposti", "vain nimi", "only my email", "only name and email", "only my name and email", "endast e-post", "bara namn", "vain sähköpostiosoite", "sähköpostiosoite vuoti", "sähköposti vuosi", "nimi ja sähköposti", "email address was exposed", "only the email"];
const BENIGN_IT_PARTNER = ["it-kumppani", "it partner", "tiketin tein", "teimme tiketin", "tilasimme itse", "varasimme itse", "teki meille etätuen", "tekee meille etätuen", "booked remote support", "we booked", "usual it partner", "tiketin itse", "etätuen tulostinongelmaan", "för vår printer"];
const BENIGN_PAYEE = ["lisäsin uuden", "i added a new", "lade till en ny", "ny betalningsmottagare", "new payee", "uuden toimittajan", "new supplier", "added a new supplier", "added the new supplier", "uudesta maksunsaajasta", "uusi maksunsaaja", "uuden maksunsaajan", "maksunsaaja", "added the payee"];
const BENIGN_WARNING_OK = ["ihan asiallinen", "asiallinen", "was fine", "var fint", "legitimate call", "asiallinen puhelu", "asiallinen."]
const BENIGN_TRUSTWORTHY_Q = ["onko tämä luotettava", "is this trustworthy", "onko tämä turvallinen", "är det säkert", "is this safe", "onko tämä oikea", "is it real", "is this real"];
const SCAM_VETO = ["safe account", "turvatili", "turvatilille", "lue koodi", "read out a code", "anna koodisi", "kerro koodisi", "tunnistautu", "syötä kortin", "enter your card", "asenna tämä", "install this app", ".apk"];
const BILL_PRESSURE = ["maksa heti", "pay now", "pay immediately", "erääntynyt", "overdue", "katkaisemme", "we will cut", "uhkaus", "threaten", "välittömästi heti", "service will be cut"];
const BENIGN_SENDER_PARCEL = ["paketti", "kuriiri", "lähetys", "parcel", "courier", "bud", "paketti-"];
const BENIGN_SENDER_BILL = ["laskutus@", "laskut@", "billing@", "ask@", "invoice@", "faktura@"];
const BENIGN_SENDER_ORDER = ["yritystilaukset@", "tilaukset@", "orders@", "order@", "tilaus@"];
const BENIGN_SENDER_IT = ["tuki@it-", "support@it-", "it-kumppani", "it-partner", "helpdesk@"];
const GENERIC_ASK_VETO = ["kirjaudu", "log in", "login", "tunnistaudu", "syötä", "enter your", "lue koodi", "read out", "anna koodi", "safe account", "turvatili", "asenna", "install this", ".apk", "etäyhteyden antaminen"];
const NEG_BENIGN = /(en tilannut|ei tilannut|ei ole tilannut|kukaan ei|kukaan meistä|kukaan yrityksestä|nobody ordered|nobody remembers|nobody in the company|no one in the company|did not order|didn't order|don't remember|not remember|en muista|ei muista|ei muistanut|no one ordered|not ordered|we did not order|ei kukaan|ei kukaan muistanut|kenenkään|en minä|not me|ei minun|ingen beställde|eivät tilanneet|inget minns)/i;
const MAILBOX_MSG = ["edelleenlähety", "forwarding", "välityssäännöt", "inbox rules", "säännöt", "joita en lähettänyt", "joita en ole lähettänyt", "replies i did not send", "replies you did not send", "vastauksia, joita en", "asiakkaat saivat", "customers received", "väärän laskun", "fake invoices from my"];

export interface Classification {
  archetype: Archetype;
  evidence: string[];
}

function benignArchetype(journey: CaseInput["journey"]): Archetype {
  return journey === "suspicious_call" ? "benign_flagged_call" : "benign_generic";
}

function benignCue(input: CaseInput, story: string): boolean {
  if (has(story, SCAM_VETO)) return false;
  if (storyAffirms(story, "entered") === true || storyAffirms(story, "paid") === true || storyAffirms(story, "code") === true || storyAffirms(story, "remote") === true || storyAffirms(story, "installed") === true) return false;
  if (NEG_BENIGN.test(story)) return false;
  const links = (input.signals?.artifact?.links ?? []) as string[];
  const hasLink = links.length > 0;
  if (has(story, WASNT_YOU_VETO)) return false;
  if (input.journey === "clicked_link" && has(story, ["huijaus", "scam", "epäilen", "huijaukse"])) return false;
  if (has(story, BENIGN_PARCEL) && !has(story, FEE)) return true;
  if (has(story, BENIGN_TRACKING) || has(story, BENIGN_IT_PARTNER) || has(story, BENIGN_PAYEE) || has(story, BENIGN_VERIFIED)) return true;
  if ((has(story, BENIGN_LOGIN_SELF) || has(story, BENIGN_LEAK_ONLY)) && !hasLink) return true;
  if (has(story, BENIGN_OFFER) && !has(story, ["sijoitus", "investment", "bitcoin", "krypto", "crypto"])) return true;
  if (!hasLink && (has(story, BENIGN_BANK_NOTICE) || has(story, BENIGN_BILL)) && !has(story, BILL_PRESSURE)) return true;
  if (!hasLink && input.journey === "suspicious_message" && has(story, BENIGN_TRUSTWORTHY_Q) && !has(story, [...BANK, ...FEE, ...PRIZE, ...CREDS, ...CODE_ASK, ...AUTHORITY])) return true;
  const sender = String((input.signals?.artifact?.sender ?? "")).toLowerCase();
  const senderBenign =
    (has(sender, BENIGN_SENDER_PARCEL) && !has(story, FEE)) ||
    (has(sender, BENIGN_SENDER_BILL) && !has(story, BILL_PRESSURE) && !has(story, GENERIC_ASK_VETO) && !has(story, BANKCHANGE) && !hasLink) ||
    (has(sender, BENIGN_SENDER_ORDER) && !has(story, GENERIC_ASK_VETO) && !hasLink) ||
    has(sender, BENIGN_SENDER_IT);
  if (senderBenign) return true;
  return false;
}

export function classify(input: CaseInput): Classification {
  const story = [input.opening_message ?? "", (input.signals.artifact as Artifact | null | undefined)?.body ?? "", input.signals.user_call_notes ?? ""].join("\n");
  const art = (input.signals.artifact ?? null) as Artifact | null;
  const lc = (input.signals.link_check ?? null) as LinkCheck | null;
  const cw = (input.signals.call_warning ?? null) as CallWarning | null;
  const sub = (input.signals.subscription ?? null) as SubscriptionSignals | null;
  const ev: string[] = [];

  // Hard overrides: misuse and safety --------------------------------------
  if (has(story, REVENGE)) {
    ev.push("retaliatory / identify-request wording");
    return { archetype: "out_of_scope_revenge", evidence: ev };
  }
  if (has(story, STALK)) {
    ev.push("possible monitoring by a known person / safety-sensitive");
    return { archetype: "stalkerware", evidence: ev };
  }
  // Benign controls ----------------------------------------------------------
  if (benignCue(input, story)) {
    ev.push("benign cue in story");
    return { archetype: benignArchetype(input.journey), evidence: ev };
  }

  switch (input.journey) {
    case "suspicious_call": {
      if (has(story, CLINIC) || has(story, BENIGN_WARNING_OK)) {
        ev.push("benign caller (clinic/courier or story says fine)");
        return { archetype: "benign_flagged_call", evidence: ev };
      }
      if (cw?.warning && cw.warning !== "none" && (has(story, CLINIC) || has(story, BENIGN_WARNING_OK))) {
        ev.push("call warning but benign story");
        return { archetype: "benign_flagged_call", evidence: ev };
      }
      if (has(story, TECH_SUPPORT) || (has(story, REMOTE) && storyAffirms(story, "remote") !== true)) {
        ev.push("unsolicited technical support / remote-access offer");
        return { archetype: "tech_support_call", evidence: ev };
      }
      if (has(story, REMOTE)) {
        ev.push("remote access given or offered");
        return { archetype: "remote_access", evidence: ev };
      }
      if (has(story, POLICE)) {
        ev.push("police / safe-account wording");
        return { archetype: "police_call", evidence: ev };
      }
      if (has(story, BANK_CALL) || has(story, BANK)) {
        ev.push("caller claims the bank");
        return { archetype: "bank_call", evidence: ev };
      }
      if (has(story, CODE_ASK) || has(story, OPERATOR) || cw?.caller_id_possibly_spoofed === true) {
        ev.push("caller claims operator/service identity or asks for a code");
        return { archetype: "code_request_call", evidence: ev };
      }
      if (has(story, ONERING) && !has(story, [...CODE_ASK, ...CREDS])) {
        ev.push("one-ring / missed call pattern");
        return { archetype: "wangiri", evidence: ev };
      }
      if (cw?.warning && cw.warning !== "none") {
        ev.push(`network call warning: ${String(cw.warning)}`);
        return { archetype: "call_generic", evidence: ev };
      }
      ev.push("generic suspicious call");
      return { archetype: "call_generic", evidence: ev };
    }
    case "clicked_link": {
      const apkStory = has(story, APK) || (lc?.categories ?? []).some((c) => String(c).includes("malware"));
      if (apkStory) {
        ev.push("app installed from link / malware category");
        return { archetype: "app_install", evidence: ev };
      }
      if (has(story, REMOTE)) {
        ev.push("remote access involved after a link");
        return { archetype: "remote_access", evidence: ev };
      }
      ev.push("link opened, entry actions unknown");
      return { archetype: "link_opened", evidence: ev };
    }
    case "breach_notice": {
      const hasLink = ((input.signals?.artifact?.links ?? []) as string[]).length > 0;
      if (hasLink && (has(story, BREACH) || has(story, RESET_WORDS)) && !has(story, BENIGN_LEAK_ONLY)) {
        ev.push("breach/reset notice with a link: fake notice phishing");
        return { archetype: "fake_breach", evidence: ev };
      }
      const subEvents = Array.isArray(sub?.recent_events) ? sub.recent_events : [];
      const esimEvent = subEvents.some((e) => String(e?.type ?? "").includes("esim")) || has(story, ESIM);
      if (esimEvent) {
        ev.push("eSIM/porting event in signals or story");
        return { archetype: "sim_takeover", evidence: ev };
      }
      if (has(story, LOGIN_PROMPT)) {
        ev.push("approval prompt wording");
        return { archetype: "approval_storm", evidence: ev };
      }
      if (has(story, UNKNOWN_LOGIN)) {
        ev.push("unknown login wording");
        return { archetype: "unknown_login", evidence: ev };
      }
      if (has(story, BREACH)) {
        const exp = input.signals.credential_exposure;
        const onlyOldEmail = !!exp?.found && (exp.sources ?? []).every((s) => (s.exposed ?? []).every((x) => x === "email") && (s.days_ago ?? 0) > 30);
        ev.push(onlyOldEmail ? "old breach, email only (distractor)" : "breach notice wording");
        return { archetype: onlyOldEmail ? "credential_distractor" : "breach_notice_generic", evidence: ev };
      }
      ev.push("generic breach notice");
      return { archetype: "breach_notice_generic", evidence: ev };
    }
    case "smb_incident": {
      if (has(story, RANSOM)) {
        ev.push("ransomware wording");
        return { archetype: "ransomware", evidence: ev };
      }
      if (has(story, MAILBOX)) {
        ev.push("mailbox rule / forwarding wording");
        return { archetype: "mailbox_takeover", evidence: ev };
      }
      if ((has(story, STAFF_WORDS) && has(story, PHISH_IND)) || has(story, ["shared a document", "sign in with your work", "työsähköposti", "work email", "docs-share", "document sharing", "jakopalvelu"])) {
        ev.push("staff received phishing wording");
        return { archetype: "staff_phish", evidence: ev };
      }
      if (has(story, CEO)) {
        ev.push("urgent/confidential executive request wording");
        return { archetype: "ceo_fraud", evidence: ev };
      }
      if (has(story, BANKCHANGE)) {
        ev.push("bank-detail change request");
        return { archetype: "bec_supplier", evidence: ev };
      }
      if (has(story, ATTACH) || has(story, ATTACH_OPENED)) {
        ev.push("attachment opened or received");
        return { archetype: "attachment_open", evidence: ev };
      }
      if (has(story, ORDER_UNEXPECTED)) {
        ev.push("unexpected order confirmation on the company account");
        return { archetype: "unexpected_order", evidence: ev };
      }
      if (has(story, EXEMP)) {
        ev.push("former employee / ex-partner access wording");
        return { archetype: "ex_employee", evidence: ev };
      }
      if (has(story, ROUTER)) {
        ev.push("router/modem wording");
        return { archetype: "router_alert", evidence: ev };
      }
      ev.push("generic business incident");
      return { archetype: "bec_supplier", evidence: ev };
    }
    case "suspicious_message":
    default: {
      const bankish = has(story, BANK) || has(String(art?.sender ?? ""), ["pankki", "bank"]);
      const credish = has(story, CREDS) || has(story, CODE_ASK);
      if (has(story, MAILBOX_MSG)) {
        ev.push("mailbox compromise wording in message");
        return { archetype: "mailbox_takeover", evidence: ev };
      }
      if (bankish) {
        ev.push("bank/card impersonation wording");
        return { archetype: "phish_bank", evidence: ev };
      }
      if (has(story, BANKCHANGE)) {
        ev.push("bank-detail change in message");
        return { archetype: "bec_supplier", evidence: ev };
      }
      if (has(story, CEO)) {
        ev.push("executive request wording");
        return { archetype: "ceo_fraud", evidence: ev };
      }
      if (has(story, AUTHORITY)) {
        ev.push("authority impersonation wording");
        return { archetype: "impersonation_authority", evidence: ev };
      }
      if (has(story, OPERATOR) && has(story, ["lasku", "bill", "faktura", "maksu"])) {
        ev.push("operator bill message");
        return { archetype: "operator_bill", evidence: ev };
      }
      if (has(story, OPERATOR)) {
        ev.push("operator impersonation wording");
        return { archetype: "phish_credentials", evidence: ev };
      }
      if (has(story, FEE)) {
        ev.push("small-fee lure wording");
        return { archetype: "lure_fee", evidence: ev };
      }
      if (has(story, PRIZE)) {
        ev.push("prize/refund lure wording");
        return { archetype: "lure_prize", evidence: ev };
      }
      if (credish) {
        ev.push("credential/code request wording");
        return { archetype: "phish_credentials", evidence: ev };
      }
      ev.push("generic suspicious message");
      return { archetype: "generic", evidence: ev };
    }
  }
}

/** Does the story/fact state the user already entered credentials / paid / installed / gave remote access / read a code? */
export function storyAffirms(story: string, kind: "entered" | "paid" | "installed" | "remote" | "code" | "opened"): boolean | null {
  const t = (story || "").toLowerCase();
  const yesSets: Record<string, string[]> = {
    entered: ["syötit", "annoit", "kirjoitin", "syötin", "annoin tiedot", "entered", "typed", "gave my", "filled", "annoin salasanani", "gave my password"],
    paid: ["maksoin", "maksettu", "siirsin", "lähetin rahaa", "paid", "transferred", "sent the money", "maksettu jo", "already paid"],
    installed: ["asensin", "latasin", "installed", "downloaded", "asennettu", "on puhelimessa", "avasin liitteen", "opened the attachment", "otin sisällön", "enabled content"],
    remote: ["annoin etäyhteyden", "annoin pääsyn", "sain etäyhteyden", "gave remote", "let them", " remote access", "annoin etäyhteyden hänelle"],
    code: ["luin koodin", "annoin koodin", "kerroin koodin", "read the code", "gave the code", "shared the code", "annoin tunnusluvun", "läsin upp koden", "gav koden"],
    opened: ["avasin liitteen", "opened the attachment", "avasin tiedoston", "opened the file", "otin sisällön käyttöön", "enabled content", "aktiverade innehållet"],
  };
  const noSets: Record<string, string[]> = {
    entered: ["en syöttänyt", "en kirjoittanut", "en antanut", "did not enter", "didn't enter", "not entered", "en avannut"],
    paid: ["en maksanut", "ei maksettu", "not paid", "haven't paid", "ei siirretty", "maksamatta", "ei vielä maksettu"],
    installed: ["en asentanut", "not installed", "didn't install", "en avannut liitettä", "did not open"],
    remote: ["en antanut", "no remote", "didn't give", "en antanut etäyhteyttä"],
    code: ["en lukenut", "en antanut koodia", "did not give", "didn't give", "no code", "ei lukenut", "en delat"],
    opened: ["en avannut liitettä", "did not open the attachment", "en öppnat bilagan", "not opened"],
  };
  const yes = yesSets[kind].some((w) => t.includes(w));
  const no = noSets[kind].some((w) => t.includes(w));
  if (yes && !no) return true;
  if (no && !yes) return false;
  if (yes && no) {
    const yi = Math.max(...yesSets[kind].map((w) => t.indexOf(w)));
    const ni = Math.max(...noSets[kind].map((w) => t.indexOf(w)));
    return ni > yi ? false : true;
  }
  return null;
}
