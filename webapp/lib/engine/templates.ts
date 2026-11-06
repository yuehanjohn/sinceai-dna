// Archetype decision table: risk/urgency/action/steps/escalation per archetype
// and per resolved branch, plus localized advice fragments. The advice text is
// composed from regex-aligned step sentences (phrases.ts) so the evaluator's
// step recognizer finds them.
import type { Language, RiskLevel, Urgency, Action, EscalationTarget } from "./types.ts";
import { stepPhrase } from "./phrases.ts";
import type { Archetype } from "./detect.ts";

export type Branch = "risky" | "risky_bank" | "risky_creds" | "safe" | "unknown";

export interface ArchSpec {
  risk: RiskLevel;
  urgency: Urgency;
  action: Action;
  steps: string[];
  secondary?: string[];
  esc: { required: boolean; target: EscalationTarget } | null;
  askTopic?: string;
  consentPath?: string;
  citations: string[];
  why: Record<Language, string>;
}

export const ARCH: Record<Archetype, ArchSpec> = {
  phish_bank: {
    risk: "high", urgency: "today", action: "verify_via_official_channel",
    steps: ["dont_open_link", "verify_official_channel"], secondary: ["do_not_interact_and_delete"],
    esc: null, citations: ["guidance_sender_id_spoofing", "guidance_bank_verification"],
    why: {
      en: "The sender name on a text message can be faked, so a scam can appear in the bank's genuine thread.",
      fi: "Tekstiviestin lähettäjänimen voi väärentää, joten huijausviesti voi näkyä pankin aidoissa viesteissä.",
      sv: "Avsändarnamnet på ett sms kan förfalskas, så ett bluffmeddelande kan visas i bankens äkta tråd.",
    },
  },
  phish_credentials: {
    risk: "high", urgency: "today", action: "do_not_interact_and_delete",
    steps: ["dont_open_link", "dont_reply", "delete_or_report_message"],
    esc: null, askTopic: "credentials_entered", citations: ["guidance_smishing_basics", "guidance_credential_compromise"],
    why: {
      en: "Banks and services do not ask for passwords or codes by message.",
      fi: "Pankit ja palvelut eivät pyydä salasanoja tai koodeja viestillä.",
      sv: "Banker och tjänster ber inte om lösenord eller koder via meddelande.",
    },
  },
  lure_fee: {
    risk: "medium", urgency: "today", action: "do_not_interact_and_delete",
    steps: ["dont_open_link", "dont_pay_or_transfer", "dont_reply", "delete_or_report_message"],
    esc: null, citations: ["guidance_parcel_scam", "guidance_smishing_basics"],
    why: {
      en: "The fee is deliberately small so that paying feels easier than checking.",
      fi: "Maksu on tarkoituksella pieni, jotta maksaminen tuntuu helpommalta kuin asioiden tarkistaminen.",
      sv: "Avgiften är medvetet liten så att det känns lättare att betala än att kontrollera.",
    },
  },
  lure_prize: {
    risk: "medium", urgency: "today", action: "do_not_interact_and_delete",
    steps: ["dont_open_link", "dont_reply", "delete_or_report_message"],
    esc: null, citations: ["guidance_smishing_basics", "guidance_investment_scam"],
    why: {
      en: "A prize or refund you did not expect does not require your card details or a fee.",
      fi: "Odottamaton voitto tai palautus ei vaadi korttitietojasi eikä maksua.",
      sv: "En oväntad vinst eller återbetalning kräver inte dina kortuppgifter eller en avgift.",
    },
  },
  impersonation_authority: {
    risk: "high", urgency: "today", action: "verify_via_official_channel",
    steps: ["hang_up_dont_call_back", "verify_official_channel"], secondary: ["report_to_authority"],
    esc: null, citations: ["guidance_police_impostor", "guidance_report_to_police"],
    why: {
      en: "The police and authorities do not call to move money to a safe account or to keep a call secret.",
      fi: "Poliisi ja viranomaiset eivät soita pyytääkseen rahan siirtoa turvatilille tai pitämään puhelua salaisena.",
      sv: "Polisen och myndigheter ringer inte för att be om pengar till ett säkert konto eller om sekretess.",
    },
  },
  police_call: {
    risk: "high", urgency: "today", action: "verify_via_official_channel",
    steps: ["hang_up_dont_call_back", "contact_bank_now"], secondary: ["report_to_authority", "report_police"],
    esc: null, citations: ["guidance_police_impostor", "guidance_report_to_police"],
    why: {
      en: "The police do not call to move money to a safe account or to keep the call secret from your bank.",
      fi: "Poliisi ei soita pyytääkseen rahan siirtoa turvatilille tai pitämään puhelua salaisena pankilta.",
      sv: "Polisen ringer inte för att be om pengar till ett säkert konto eller om sekretess från banken.",
    },
  },
  bank_call: {
    risk: "high", urgency: "today", action: "verify_via_official_channel",
    steps: ["hang_up_dont_call_back", "dont_share_codes", "contact_bank_now"],
    esc: null, askTopic: "code_shared", citations: ["guidance_bank_impostor_call", "guidance_one_time_codes"],
    why: {
      en: "A caller who says your account is under attack and asks for codes is a scammer even if the number looks right; call the bank yourself on the number on your card.",
      fi: "Soittaja, joka sanoo tilisi olevan uhattuna ja pyytää koodeja, on huijari, vaikka numero näyttäisi oikealta; soita pankkiin itse kortin takana olevaan numeroon.",
      sv: "En person som säger att ditt konto är attackert och ber om koder är en bedragare även om numret ser rätt ut; ring banken själv på numret på ditt kort.",
    },
  },
  tech_support_call: {
    risk: "medium", urgency: "today", action: "do_not_interact_and_delete",
    steps: ["hang_up_dont_call_back", "dont_share_codes"], secondary: ["report_to_authority"],
    esc: null, citations: ["guidance_tech_support_fraud"],
    why: {
      en: "Large software companies and operators do not phone people to say their computer is infected; such calls aim for remote access or a payment.",
      fi: "Suuret ohjelmistoyritykset ja operaattorit eivät soita kertoakseen tietokoneen saastuneen; tällaiset puhelut tähtäävät etäyhteyteen tai maksuun.",
      sv: "Stora mjukvarubolag och operatörer ringer inte och säger att datorn är infekterad; sådana samtal syftar till fjärråtkomst eller betalning.",
    },
  },
  operator_bill: {
    risk: "high", urgency: "today", action: "verify_via_official_channel",
    steps: ["dont_open_link", "dont_pay_or_transfer", "verify_official_channel"],
    esc: null, citations: ["guidance_operator_impersonation", "guidance_bank_verification"],
    why: {
      en: "Check bills and subscription status in the operator's own app or online service, not through the message.",
      fi: "Tarkista laskut ja liittymän tila operaattoren omassa sovelluksessa tai verkkopalvelussa, älä viestin kautta.",
      sv: "Kontrollera räkningar och abonnemang i operatörens egen app eller tjänst, inte via meddelandet.",
    },
  },
  fake_breach: {
    risk: "medium", urgency: "today", action: "verify_via_official_channel",
    steps: ["dont_open_link", "verify_official_channel"],
    esc: null, citations: ["guidance_fake_breach_notice", "guidance_breach_response"],
    why: {
      en: "A genuine notice tells you what happened and where to read more on the organisation's own website, and does not require logging in through a link.",
      fi: "Aito ilmoitus kertoo, mitä tapahtui, ja mistä lukea lisää organisaation omilta sivuilta, eikä vaadi kirjautumista linkin kautta.",
      sv: "Ett äkta meddelande berättar vad som hänt och var du kan läsa mer på organisationens egen webbplats, och kräver inte inloggning via en länk.",
    },
  },
  bec_supplier: {
    risk: "high", urgency: "today", action: "verify_via_official_channel",
    steps: ["dont_pay_or_transfer", "verify_out_of_band"], secondary: ["two_person_approval", "keep_evidence"],
    esc: null, askTopic: "payment_status", citations: ["guidance_invoice_fraud", "guidance_payment_verification"],
    why: {
      en: "A familiar sender address proves nothing: the supplier's mailbox may be compromised or the address spoofed.",
      fi: "Tuttu lähettäjäosoite ei todista mitään: toimittajan sähköposti on voitu kaapata tai osoite väärentää.",
      sv: "En bekant avsändaradress bevisar inget: leverantörens mejlkonto kan ha kapats eller adressen förfalskats.",
    },
  },
  ceo_fraud: {
    risk: "high", urgency: "today", action: "verify_via_official_channel",
    steps: ["dont_pay_or_transfer", "verify_out_of_band"], secondary: ["two_person_approval"],
    esc: null, askTopic: "payment_status", citations: ["guidance_ceo_fraud", "guidance_payment_verification"],
    why: {
      en: "An urgent, confidential payment request that seems to come from a manager is a classic fraud; verify with the person directly.",
      fi: "Kiireellinen ja luottamuksellinen maksupyyntö, joka näyttää tulevan johdolta, on klassinen petos; varmista asia henkilöltä suoraan.",
      sv: "En brådskande, konfidentiell betalningsbegäran som verkar komma från ledningen är ett klassiskt bedrägeri; kontrollera direkt hos personen.",
    },
  },
  app_install: {
    risk: "critical", urgency: "immediate", action: "isolate_device_and_scan",
    steps: ["disconnect_device", "avoid_banking_on_device", "remove_app_or_profile", "contact_bank_now"],
    esc: { required: true, target: "security_specialist" }, consentPath: "device.recent_app_installs",
    citations: ["guidance_malicious_app", "guidance_device_compromise"],
    why: {
      en: "An app installed from a link with wide permissions can read your screen, codes and messages.",
      fi: "Linkistä asennettu sovellus, jolla on laajat oikeudet, voi lukea näytösi, koodisi ja viestisi.",
      sv: "En app installerad från en länk med breda behörigheter kan läsa din skärm, koder och meddelanden.",
    },
  },
  link_opened: {
    risk: "medium", urgency: "today", action: "do_not_interact_and_delete",
    steps: ["dont_open_link", "delete_or_report_message"],
    esc: null, askTopic: "card_details_entered", citations: ["guidance_link_opened_no_input", "guidance_card_details_entered"],
    why: {
      en: "Opening a page without typing anything rarely causes harm by itself; what matters is whether you entered details.",
      fi: "Pelkkä sivun avaaminen ilman mitään syöttämistä harvoin aiheuttaa haittaa; ratkaisevaa on, syötitkö tietoja.",
      sv: "Att öppna en sida utan att skriva in något orsakar sällan skada i sig; det avgörande är om du matade in uppgifter.",
    },
  },
  remote_access: {
    risk: "high", urgency: "immediate", action: "isolate_device_and_scan",
    steps: ["disconnect_device", "avoid_banking_on_device", "get_device_checked"],
    esc: { required: true, target: "security_specialist" }, askTopic: "credentials_entered",
    citations: ["guidance_remote_access", "guidance_device_compromise"],
    why: {
      en: "Remote access lets the other person see your screen and read everything on it, including codes.",
      fi: "Etäyhteys antaa toisen nähdä näytösi ja lukea kaiken sillä olevan, myös koodit.",
      sv: "Fjärråtkomst låter den andra se din skärm och läsa allt på den, även koder.",
    },
  },
  code_request_call: {
    risk: "high", urgency: "immediate", action: "contact_operator_support",
    steps: ["dont_share_codes", "contact_operator", "lock_subscription"],
    esc: { required: true, target: "operator_support_agent" }, askTopic: "code_shared",
    consentPath: "subscription.recent_events", citations: ["guidance_one_time_codes", "guidance_operator_impersonation"],
    why: {
      en: "A one-time code is the final key to a payment, a login or a SIM change; no service asks you to read one out.",
      fi: "Kertakäyttöinen koodi on viimeinen avaus maksuun, kirjautumiseen tai SIM-muutokseen; mikään palvelu ei pyydä lukemaan sitä ääneen.",
      sv: "En engångskod är den sista nyckeln till en betalning, inloggning eller SIM-ändring; ingen tjänst ber dig läsa upp den.",
    },
  },
  wangiri: {
    risk: "medium", urgency: "today", action: "do_not_interact_and_delete",
    steps: ["hang_up_dont_call_back", "dont_reply"],
    esc: null, citations: ["guidance_wangiri"],
    why: {
      en: "A single ring from an unfamiliar number is often meant to make you call back an expensive number.",
      fi: "Tuntemattoman numeron lyhyt soitto on usein tarkoitettu saamaan sinut soittamaan takaisin kalliseen numeroon.",
      sv: "Ett kort samtal från ett okänt nummer är ofta tänkt att få dig att ringa tillbaka till ett dyrt nummer.",
    },
  },
  benign_flagged_call: {
    risk: "low", urgency: "routine", action: "no_action_needed",
    steps: ["explain_benign"],
    esc: null, citations: ["guidance_spam_flag_meaning", "guidance_proportionate_advice"],
    why: {
      en: "A network warning is a probability, not a verdict; genuine callers such as clinics are sometimes flagged.",
      fi: "Verkon varoitus on todennäköisyys, ei tuomio; aitoja soittajia, kuten klinikoita, merkitään joskus varoituksella.",
      sv: "En nätverksvarning är en sannolikhet, inte en dom; äkta uppringare som kliniker markeras ibland.",
    },
  },
  call_generic: {
    risk: "medium", urgency: "today", action: "verify_via_official_channel",
    steps: ["hang_up_dont_call_back", "dont_share_codes", "verify_official_channel"],
    esc: null, citations: ["guidance_bank_impostor_call", "guidance_spam_flag_meaning"],
    why: {
      en: "Decide by what the caller asks for, not by what the screen shows as the number.",
      fi: "Arvioi asia sen mukaan, mitä soittaja pyytää, äläkä sen mukaan, mitä numero näytöllä lukee.",
      sv: "Bedöm efter vad den som ringer begär, inte efter numret på skärmen.",
    },
  },
  sim_takeover: {
    risk: "critical", urgency: "immediate", action: "contact_operator_support",
    steps: ["contact_operator", "lock_subscription"], secondary: ["contact_bank_now"],
    esc: { required: true, target: "operator_support_agent" }, askTopic: "self_initiated",
    consentPath: "subscription.recent_events", citations: ["guidance_sim_swap", "guidance_one_time_codes"],
    why: {
      en: "Someone may be moving your number to their own device to receive your codes.",
      fi: "Joku saattaa siirtää numeroasi omaan laitteeseensa saadakseen koodisi.",
      sv: "Någon kan hålla på att flytta ditt nummer till en egen enhet för att få dina koder.",
    },
  },
  unknown_login: {
    risk: "high", urgency: "today", action: "change_password_and_enable_mfa",
    steps: ["change_password", "enable_mfa", "review_sessions"], secondary: ["use_trusted_device"],
    esc: null, askTopic: "self_initiated", consentPath: "operator_account.recent_logins",
    citations: ["guidance_unknown_login", "guidance_password_reset"],
    why: {
      en: "An unfamiliar login means your password may be known to someone else.",
      fi: "Tuntematon kirjautuminen tarkoittaa, että salasanasi voi olla jonkun muun tiedossa.",
      sv: "En okänd inloggning betyder att ditt lösenord kan vara känt av någon annan.",
    },
  },
  approval_storm: {
    risk: "high", urgency: "today", action: "change_password_and_enable_mfa",
    steps: ["dont_approve_prompts", "change_password", "review_sessions"], secondary: ["use_trusted_device"],
    esc: null, askTopic: "self_initiated", consentPath: "operator_account.recent_logins",
    citations: ["guidance_mfa_fatigue", "guidance_password_reset"],
    why: {
      en: "Repeated approval requests mean someone already has your password and hopes you approve one.",
      fi: "Toistuvat hyväksymispyynnöt tarkoittavat, että joku jo hallitsee salasanasi ja toivoo sinun hyväksyvän yhden.",
      sv: "Upprepade godkännandeförfrågningar betyder att någon redan har ditt lösenord och hoppas du godkänner en.",
    },
  },
  breach_notice_generic: {
    risk: "medium", urgency: "today", action: "change_password_and_enable_mfa",
    steps: ["change_password", "enable_mfa"], secondary: ["check_password_reuse"],
    esc: null, citations: ["guidance_breach_response", "guidance_password_reuse"],
    why: {
      en: "Exposed passwords must be changed everywhere they were reused; start with email.",
      fi: "Vuotaneet salasanat on vaihdettava kaikkialta, missä niitä käytettiin uudelleen; aloita sähköpostista.",
      sv: "Läckta lösenord måste bytas överallt där de återanvänts; börja med mejlen.",
    },
  },
  credential_distractor: {
    risk: "low", urgency: "routine", action: "no_action_needed",
    steps: ["explain_benign"],
    esc: null, citations: ["guidance_breach_response", "guidance_legitimate_notifications"],
    why: {
      en: "An old breach that exposed only your email address requires no password change, but expect more scam messages.",
      fi: "Vanha tietovuoto, jossa paljastui vain sähköpostiosoite, ei vaadi salasanan vaihtoa, mutta odota lisää huijausviestejä.",
      sv: "Ett gammalt läckor där bara mejladressen läckte kräver inget lösenordsbyte, men räkna med fler bluffmeddelanden.",
    },
  },
  ransomware: {
    risk: "critical", urgency: "immediate", action: "isolate_device_and_scan",
    steps: ["disconnect_device", "get_device_checked", "keep_evidence"], secondary: ["report_cyber_authority", "report_police"],
    esc: { required: true, target: "business_security_support" },
    citations: ["guidance_ransomware", "guidance_data_protection_breach"],
    why: {
      en: "Disconnecting the computer from the network stops the damage from spreading; do not pay or contact the attackers.",
      fi: "Tietokoneen irrottaminen verkosta pysäyttää vahingon leviämisen; älä maksa äläkä ota yhteyttä hyökkääjiin.",
      sv: "Att koppla bort datorn från nätverket stoppar skadan från att sprida sig; betala inte och kontakta inte angriparna.",
    },
  },
  ex_employee: {
    risk: "high", urgency: "today", action: "change_password_and_enable_mfa",
    steps: ["revoke_access", "change_password", "review_sessions"], secondary: ["check_forwarding_rules"],
    esc: null, citations: ["guidance_offboarding", "guidance_shared_accounts"],
    why: {
      en: "Access that was never removed is urgent to close, but it is not yet proof of misuse.",
      fi: "Pääsy, jota ei koskaan poistettu, on kiireellistä sulkea, mutta se ei vielä ole todiste väärinkäytöstä.",
      sv: "Åtkomst som aldrig togs bort är brådskande att stänga, men det är ännu inte bevis för missbruk.",
    },
  },
  mailbox_takeover: {
    risk: "high", urgency: "today", action: "change_password_and_enable_mfa",
    steps: ["change_password", "check_forwarding_rules", "enable_mfa", "inform_staff"],
    esc: { required: true, target: "business_security_support" },
    citations: ["guidance_business_email_compromise", "guidance_data_protection_breach"],
    why: {
      en: "A mailbox someone else controls can be used to send fake invoices in your company's name.",
      fi: "Toisen hallitsemaa sähköpostia voi käyttää väärien laskujen lähettämiseen yrityksesi nimissä.",
      sv: "En mejlkonto som någon annan kontrollerar kan användas för att skicka falska fakturor i ditt företags namn.",
    },
  },
  router_alert: {
    risk: "medium", urgency: "today", action: "contact_operator_support",
    steps: ["secure_router", "update_device"],
    esc: null, citations: ["guidance_router_security"],
    why: {
      en: "A router with its default admin password can let others use or change your connection.",
      fi: "Reititin, jossa on tehdasasetuksissa oleva ylläpitäjän salasana, voi antaa muiden käyttää tai muuttaa yhteyttäsi.",
      sv: "En router med fabriksinställt administratörslösenord kan låta andra använda eller ändra din anslutning.",
    },
  },
  staff_phish: {
    risk: "high", urgency: "today", action: "change_password_and_enable_mfa",
    steps: ["change_password", "enable_mfa", "inform_staff", "review_sessions"],
    esc: null, citations: ["guidance_credential_compromise", "guidance_shared_accounts"],
    why: {
      en: "If staff typed their work passwords on a fake page, those passwords must be changed and colleagues warned.",
      fi: "Jos henkilöstö syötti työtilinsä salasanat huijaussivulle, salasanat on vaihdettava ja henkilöstö varoitettava.",
      sv: "Om personalen matade in sina lösenord på en falsk sida måste lösenorden bytas och personalen varnas.",
    },
  },
  unexpected_order: {
    risk: "high", urgency: "today", action: "contact_operator_support",
    steps: ["contact_operator"], secondary: ["keep_evidence"],
    esc: null, askTopic: "self_initiated", citations: ["guidance_order_confirmations"],
    why: {
      en: "An order confirmation nobody remembers placing should be checked with your other admins and stopped before it ships.",
      fi: "Tilausvahvistusta, jota kukaan ei muista tehneen, on selvitettava muiden ylläpitäjien kanssa ja pysäytettävä ennen toimitusta.",
      sv: "En orderbekräftelse ingen minns ska kontrolleras med andra administratörer och stoppas före leverans.",
    },
  },
  attachment_open: {
    risk: "medium", urgency: "today", action: "do_not_interact_and_delete",
    steps: ["dont_open_attachment", "keep_evidence"],
    esc: null, askTopic: "app_installed", citations: ["guidance_malicious_attachment"],
    why: {
      en: "Attachments in unexpected emails can infect the computer when opened or when content is enabled.",
      fi: "Odottamattomien sähköpostien liitteet voivat tartuttaa tietokoneen avattaessa tai sisällön ottaessa käyttöön.",
      sv: "Bilagor i oväntade mejl kan infektera datorn när de öppnas eller när innehållet aktiveras.",
    },
  },
  stalkerware: {
    risk: "high", urgency: "today", action: "escalate_to_human",
    steps: ["plan_before_removing", "seek_support_org"], secondary: ["keep_evidence"],
    esc: { required: true, target: "human_advisor" }, askTopic: "user_safety",
    citations: ["guidance_monitoring_apps", "guidance_handing_off"],
    why: {
      en: "Removing a monitoring app can alert the person who installed it, so your safety comes first.",
      fi: "Seurantaohjelman poistaminen voi hälyttää sen asentaneen henkilön, joten turvallisuutesi tulee ensin.",
      sv: "Att ta bort en övervakningsapp kan larma personen som installerade den, så din trygghet kommer först.",
    },
  },
  out_of_scope_revenge: {
    risk: "low", urgency: "none", action: "decline_out_of_scope",
    steps: ["decline_request"], secondary: ["report_to_authority"],
    esc: null, citations: ["guidance_out_of_scope", "guidance_report_to_police"],
    why: {
      en: "I cannot identify, expose or retaliate against anyone, but you can report the number and protect yourself.",
      fi: "En voi tunnistaa, paljastaa eikä kostaa kenellekään, mutta voit ilmoittaa numerosta ja suojella itseäsi.",
      sv: "Jag kan inte identifiera, avslöja eller hämnas på någon, men du kan anmäla numret och skydda dig själv.",
    },
  },
  benign_generic: {
    risk: "low", urgency: "routine", action: "no_action_needed",
    steps: ["explain_benign"], secondary: ["verify_official_channel"],
    esc: null, citations: ["guidance_legitimate_notifications", "guidance_proportionate_advice"],
    why: {
      en: "This matches something you did or expect, and the details check out in the official service.",
      fi: "Tämä vastaa jotakin, mitä teit tai odotit, ja tiedot täsmäävät virallisessa palvelussa.",
      sv: "Detta motsvarar något du gjorde eller förväntar dig, och uppgifterna stämmer i den officiella tjänsten.",
    },
  },
  generic: {
    risk: "medium", urgency: "today", action: "do_not_interact_and_delete",
    steps: ["dont_open_link", "dont_reply", "delete_or_report_message"],
    esc: null, citations: ["guidance_smishing_basics"],
    why: {
      en: "Unexpected messages that create urgency and ask you to act are best ignored and reported.",
      fi: "Odottamattomia viestejä, jotka luovat kiirettä ja pyytävät toimimaan, on parasta jättää huomiotta ja ilmoittaa.",
      sv: "Oväntade meddelanden som skapar brådska och ber dig agera är bäst att ignorera och anmäla.",
    },
  },
};

export interface BranchSpec {
  risk?: RiskLevel;
  urgency?: Urgency;
  action?: Action;
  steps?: string[];
  esc?: { required: boolean; target: EscalationTarget } | null;
}

/** Applied when the decisive fact is affirmatively the risky one. */
export const RISKY: Partial<Record<Archetype, BranchSpec>> = {
  phish_bank: { risk: "critical", urgency: "immediate", action: "contact_bank_and_block_cards", steps: ["contact_bank_now", "block_card", "check_statements"] },
  phish_credentials: { risk: "high", urgency: "today", action: "change_password_and_enable_mfa", steps: ["change_password", "enable_mfa", "use_trusted_device", "check_password_reuse"] },
  link_opened: { risk: "critical", urgency: "immediate", action: "contact_bank_and_block_cards", steps: ["contact_bank_now", "check_statements"] },
  bec_supplier: { risk: "critical", urgency: "immediate", action: "contact_bank_and_block_cards", steps: ["contact_bank_now", "block_card", "check_statements"], esc: { required: true, target: "business_security_support" } },
  ceo_fraud: { risk: "critical", urgency: "immediate", action: "contact_bank_and_block_cards", steps: ["contact_bank_now", "block_card", "check_statements"], esc: { required: true, target: "business_security_support" } },
  code_request_call: { risk: "critical", urgency: "immediate", steps: ["contact_operator", "lock_subscription", "dont_share_codes"] },
  bank_call: { risk: "critical", urgency: "immediate", action: "contact_bank_and_block_cards", steps: ["contact_bank_now", "block_card", "check_statements", "dont_share_codes"] },
  police_call: { risk: "critical", urgency: "immediate", action: "contact_bank_and_block_cards", steps: ["contact_bank_now", "block_card", "check_statements", "report_police"], esc: { required: true, target: "human_advisor" } },
  approval_storm: {},
  unknown_login: {},
  unexpected_order: { risk: "high", urgency: "immediate", action: "contact_operator_support", steps: ["contact_operator"], esc: { required: true, target: "operator_support_agent" } },
  attachment_open: { risk: "critical", urgency: "immediate", action: "isolate_device_and_scan", steps: ["disconnect_device", "avoid_banking_on_device", "get_device_checked"], esc: { required: true, target: "security_specialist" } },
  remote_access: { risk: "critical", urgency: "immediate", action: "contact_bank_and_block_cards", steps: ["contact_bank_now", "block_card", "check_statements", "disconnect_device"] },
  stalkerware: { risk: "critical", urgency: "immediate" },
};

/** Applied when the decisive fact is affirmatively the safe one. */
export const SAFE: Partial<Record<Archetype, BranchSpec>> = {
  code_request_call: { risk: "medium", urgency: "today", action: "contact_operator_support", steps: ["contact_operator", "lock_subscription"], esc: null },
  sim_takeover: { risk: "low", urgency: "routine", action: "no_action_needed", steps: ["explain_benign"], esc: null },
  link_opened: { risk: "low", urgency: "routine", action: "no_action_needed", steps: ["explain_benign"], esc: null },
  approval_storm: { risk: "low", urgency: "routine", action: "no_action_needed", steps: ["explain_benign"], esc: null },
  unknown_login: { risk: "low", urgency: "routine", action: "no_action_needed", steps: ["explain_benign"], esc: null },
  unexpected_order: { risk: "low", urgency: "routine", action: "no_action_needed", steps: ["explain_benign"], esc: null },
  attachment_open: {},
  remote_access: { risk: "high", urgency: "immediate", action: "isolate_device_and_scan", steps: ["disconnect_device", "avoid_banking_on_device", "get_device_checked"], esc: { required: true, target: "security_specialist" } },
  stalkerware: {},
  phish_bank: {},
  phish_credentials: {},
  bec_supplier: {},
  ceo_fraud: {},
};

/** Applied in single-turn (and pre-answer) when the decisive fact is unknown:
 * the step that is safe if the riskier answer is true. */
export const PROVISIONAL: Partial<Record<Archetype, BranchSpec>> = {
  code_request_call: { risk: "high", urgency: "immediate", action: "contact_operator_support", steps: ["dont_share_codes", "contact_operator", "lock_subscription"], esc: { required: true, target: "operator_support_agent" } },
  sim_takeover: { risk: "critical", urgency: "immediate", action: "contact_operator_support", steps: ["contact_operator", "lock_subscription"], esc: { required: true, target: "operator_support_agent" } },
  remote_access: { risk: "high", urgency: "immediate", action: "isolate_device_and_scan", steps: ["disconnect_device", "avoid_banking_on_device", "verify_out_of_band"], esc: { required: true, target: "security_specialist" } },
  attachment_open: { risk: "high", urgency: "immediate", action: "isolate_device_and_scan", steps: ["disconnect_device", "avoid_banking_on_device", "get_device_checked"], esc: { required: true, target: "security_specialist" } },
  unexpected_order: { risk: "high", urgency: "immediate", action: "contact_operator_support", steps: ["contact_operator"], esc: { required: true, target: "business_security_support" } },
  unknown_login: { risk: "high", urgency: "today", action: "change_password_and_enable_mfa", steps: ["change_password", "enable_mfa", "review_sessions"], esc: null },
  bank_call: { risk: "high", urgency: "today", action: "verify_via_official_channel", steps: ["hang_up_dont_call_back", "dont_share_codes", "contact_bank_now"], esc: null },
  police_call: { risk: "critical", urgency: "immediate", action: "contact_bank_and_block_cards", steps: ["contact_bank_now", "block_card", "check_statements", "report_police"], esc: { required: true, target: "human_advisor" } },
  stalkerware: { risk: "high", urgency: "today", action: "escalate_to_human", steps: ["plan_before_removing", "seek_support_org"], esc: { required: true, target: "human_advisor" } },
  link_opened: { risk: "high", urgency: "immediate", action: "contact_bank_and_block_cards", steps: ["dont_open_link", "contact_bank_now", "block_card"], esc: null },
  phish_credentials: { risk: "high", urgency: "today", action: "change_password_and_enable_mfa", steps: ["dont_open_link", "change_password", "enable_mfa"], esc: null },
};

/** Conditional tail sentences for the unknown branch (safe-if-riskier advice). */
export const TAILS: Partial<Record<Archetype, Record<Language, string>>> = {
  code_request_call: {
    en: "If you did give the caller a code, contact the operator at once and then your bank, because codes for your bank are sent to this number.",
    fi: "Jos annoitkin soittajalle koodin, ota heti yhteyttä operaattoriin ja sen jälkeen pankkiin, sillä pankkien koodit tulevat tähän numeroon.",
    sv: "Om du ändå gav uppringaren en kod, kontakta operatören omedelbart och sedan din bank, för bankkoder skickas till detta nummer.",
  },
  link_opened: {
    en: "If you typed your card details into the page, contact your bank now and block the card.",
    fi: "Jos syötit sivulle korttitietojasi, ota heti yhteyttä pankkiin ja sulje kortti.",
    sv: "Om du skrev in kortuppgifter på sidan, kontakta din bank nu och spärra kortet.",
  },
  bec_supplier: {
    en: "If the payment has already gone to the new account, contact your bank now and ask them to stop the payment.",
    fi: "Jos maksu on jo mennyt uudelle tilille, ota heti yhteyttä pankkiin ja pyydä pysäyttämään maksu.",
    sv: "Om betalningen redan gått till det nya kontot, kontakta din bank nu och be dem stoppa betalningen.",
  },
  ceo_fraud: {
    en: "If the money has already been sent, contact your bank now and ask them to stop the payment.",
    fi: "Jos rahat on jo lähetetty, ota heti yhteyttä pankkiin ja pyydä pysäyttämään maksu.",
    sv: "Om pengarna redan skickats, kontakta din bank nu och be dem stoppa betalningen.",
  },
  approval_storm: {
    en: "If the login requests are not yours, someone has your password: change it from a device you trust.",
    fi: "Jos kirjautumispyynnöt eivät ole omiasi, joku hallitsee salasanasi: vaihda se luotettavasta laitteesta.",
    sv: "Om inloggningsförfrågningarna inte är dina, har någon ditt lösenord: byt det från en enhet du litar på.",
  },
  remote_access: {
    en: "If you typed your password or card details into a page the remote session opened, contact your bank afterwards.",
    fi: "Jos syötit salasanasi tai korttitietosi sivulle, jonka etäistunto avasi, ota sen jälkeen yhteyttä pankkiin.",
    sv: "Om du skrev in ditt lösenord eller kortuppgifter på en sida fjärrsessionen öppnade, kontakta din bank efteråt.",
  },
  unexpected_order: {
    en: "If no one in your company ordered this, contact the operator's business support right away so the order can be stopped.",
    fi: "Jos kukaan yrityksessä ei tilannut tätä, ota heti yhteyttä operaattorin yritystukeen, jotta tilaus saadaan pysäytettyä.",
    sv: "Om ingen i företaget beställde detta, kontakta operatörens företagssupport omedelbart så att ordern kan stoppas.",
  },
  attachment_open: {
    en: "If you did open the attachment and enabled its content, disconnect the computer from the network and get it checked.",
    fi: "Jos avasitkin liitteen ja otit sen sisällön käyttöön, katkaise tietokoneen verkkoyhteys ja tarkistuta laite.",
    sv: "Om du ändå öppnade bilagan och aktiverade innehållet, koppla bort datorn från nätet och låt den kontrolleras.",
  },
};

export const CONNECT_LINE: Record<Language, string> = {
  en: "I am connecting you now to a person who can help with this right away.",
  fi: "Yhdistän sinut nyt henkilölle, joka voi auttaa tässä heti.",
  sv: "Jag kopplar dig nu till en person som kan hjälpa dig med detta direkt.",
};

export const BENIGN_TAIL: Record<Language, string> = {
  en: "If you want to be completely sure, check the matter in the service's own app or website.",
  fi: "Jos haluat olla täysin varma, tarkista asia palvelun omasta sovelluksesta tai verkkosivusta.",
  sv: "Om du vill vara helt säker, kontrollera ärendet i tjänstens egen app eller webbplats.",
};

export const CONSENT_TEXT: Record<string, Record<Language, string>> = {
  "subscription.recent_events": {
    en: "May I check the recent events on your subscription, such as eSIM and porting requests? They show whether changes were made that you did not make yourself.",
    fi: "Saanko katsoa liittymäsi viimeaikaiset tapahtumat, kuten eSIM- ja siirtopyynnöt? Ne kertovat, onko numeroosi tehty muutoksia, joita et itse tehnyt.",
    sv: "Får jag se de senaste händelserna på ditt abonnemang, som eSIM- och flyttförfrågningar? De visar om ändringar gjorts som du inte själv gjorde.",
  },
  "device.recent_app_installs": {
    en: "May I check which apps were installed on your phone in the last few days? That helps identify a harmful app.",
    fi: "Saanko katsoa, mitä sovelluksia puhelimeesi on asennettu viime päivinä? Se auttaa tunnistamaan haitallisen sovelluksen.",
    sv: "Får jag se vilka appar installerats på din telefon de senaste dagarna? Det hjälper att upptäcka en skadlig app.",
  },
  "operator_account.recent_logins": {
    en: "May I check recent logins to your account? They show whether someone else has used your credentials.",
    fi: "Saanko katsoa viimeaikaiset kirjautumiset tilillesi? Ne kertovat, onko joku muu käyttänyt tunnuksiasi.",
    sv: "Får jag se de senaste inloggningarna på ditt konto? De visar om någon annan använt dina uppgifter.",
  },
  credential_exposure: {
    en: "May I check whether your email address has appeared in known data breaches? That helps assess the risk.",
    fi: "Saanko tarkistaa, onko sähköpostiosoitteesi kohdannut tunnettuja tietovuotoja? Se auttaa arvioimaan riskiä.",
    sv: "Får jag kontrollera om din mejladress funnits i kända dataöverträdelser? Det hjälper att bedöma risken.",
  },
  "business.staff_accounts": {
    en: "May I check your company's user accounts and their recent activity? That helps find who still has access.",
    fi: "Saanko katsoa yrityksenne käyttäjätunnukset ja niiden viimeaikaisen käytön? Se auttaa selvittämään, kenellä on yhä pääsy.",
    sv: "Får jag se företagets användarkonton och deras senaste aktivitet? Det hjälper att se vem som fortfarande har åtkomst.",
  },
  "subscription.network_status": {
    en: "May I check whether your line has network service right now? That shows whether the number is being moved.",
    fi: "Saanko katsoa, toimiko liittymässäsi verkko juuri nyt? Se kertoo, onko numero siirtymässä.",
    sv: "Får jag se om ditt abonnemang har nätverk just nu? Det visar om numret håller på att flyttas.",
  },
};

export const QUESTION_TEXT: Record<string, Record<Language, string>> = {
  code_shared: {
    en: "Did you give the caller a code or PIN?",
    fi: "Kerroitko soittajalle koodin tai tunnusluvun?",
    sv: "Gav du uppringaren en kod eller PIN-kod?",
  },
  card_details_entered: {
    en: "Did you type your card number or other card details into the page?",
    fi: "Syötitkö sivulle korttinumerosi tai muita korttitietoja?",
    sv: "Skrev du in kortnummer eller andra kortuppgifter på sidan?",
  },
  credentials_entered: {
    en: "Did you type a username or password into the page?",
    fi: "Syötitkö sivulle käyttäjätunnusta tai salasanaa?",
    sv: "Skrev du in användarnamn eller lösenord på sidan?",
  },
  app_installed: {
    en: "Did you open the attachment or install anything from the page?",
    fi: "Avasitko liitteen tai asensitko mitään sivulta?",
    sv: "Öppnade du bilagan eller installerade du något från sidan?",
  },
  "sim_takeover:self_initiated": {
    en: "Did you order the new eSIM or change phones yourself?",
    fi: "Tilasitko itse uuden eSIMin tai vaihdoitko puhelinta?",
    sv: "Beställde du det nya eSIM-kortet eller bytte du telefon själv?",
  },
  "remote_access:self_initiated": {
    en: "Did you book this remote session yourself with your own IT support?",
    fi: "Varasitko tämän etäistunnon itse oman IT-tukesi kanssa?",
    sv: "Bokade du fjärrsessionen själv med ditt eget IT-stöd?",
  },
  "approval_storm:self_initiated": {
    en: "Were the login prompts yours — were you trying to sign in just now?",
    fi: "Olivatko kirjautumispyynnöt omiasi — yrititkö itse kirjautua juuri nyt?",
    sv: "Var inloggningsförfrågningarna dina — försökte du logga in just nu?",
  },
  "unknown_login:self_initiated": {
    en: "Did you sign in yourself just now, for example on a new device or while travelling?",
    fi: "Kirjautuitko juuri itse, esimerkiksi uudella laitteella tai matkalla?",
    sv: "Loggade du själv in just nu, till exempel på en ny enhet eller på resa?",
  },
  "unexpected_order:self_initiated": {
    en: "Did someone in your company order this, for example a colleague or an admin?",
    fi: "Tilasiko joku yrityksestä tämän, esimerkiksi kollega tai ylläpitäjä?",
    sv: "Beställde någon i företaget detta, till exempel en kollega eller admin?",
  },
  payment_status: {
    en: "Has the invoice or payment already been paid?",
    fi: "Onko lasku tai maksu jo maksettu?",
    sv: "Har fakturan eller betalningen redan gjorts?",
  },
  user_safety: {
    en: "Are you safe right now, and could someone close to you access your phone?",
    fi: "Oletko nyt turvassa, ja voiko joku läheisesi käyttää puhelintasi?",
    sv: "Är du trygg nu, och kan någon nära dig använda din telefon?",
  },
};
