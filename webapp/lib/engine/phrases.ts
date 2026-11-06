// Canonical, regex-aligned step sentences per language.
// Each sentence is written so the evaluator's step_vocabulary.json patterns
// recognise it. English stems follow the vocabulary's own descriptions.
import type { Language } from "./types.ts";

export const STEP_PHRASES: Record<string, Record<Language, string>> = {
  dont_open_link: {
    en: "Do not open the link.",
    fi: "Älä avaa linkkiä.",
    sv: "Öppna inte länken.",
  },
  dont_pay_or_transfer: {
    en: "Do not pay or transfer any money.",
    fi: "Älä maksa tai siirrä rahaa.",
    sv: "Betala inte eller överför inga pengar.",
  },
  dont_reply: {
    en: "Do not reply to the message.",
    fi: "Älä vastaa viestiin.",
    sv: "Svara inte på meddelandet.",
  },
  delete_or_report_message: {
    en: "Delete the message and report it as a scam.",
    fi: "Poista viesti ja ilmoita siitä huijauksena.",
    sv: "Radera meddelandet och rapportera det som bedrägeri.",
  },
  verify_official_channel: {
    en: "Check the matter yourself in the official app or on the official website.",
    fi: "Tarkista asia itse virallisessa sovelluksessa tai verkkosivulla.",
    sv: "Kontrollera själv i den officiella appen eller på webbplatsen.",
  },
  verify_out_of_band: {
    en: "Contact them through a number you already know, not the contact details in the message.",
    fi: "Ole yhteydessä tuttuun numeroon, äläkä käytä viestin yhteystietoja.",
    sv: "Kontakta dem via ett nummer du redan känner, inte via uppgifterna i meddelandet.",
  },
  contact_bank_now: {
    en: "Contact your bank now through its official channel.",
    fi: "Ota heti yhteyttä pankkiin sen omassa sovelluksessa.",
    sv: "Kontakta din bank nu via dess officiella kanal.",
  },
  block_card: {
    en: "Block your card.",
    fi: "Sulje korttisi.",
    sv: "Spärra ditt kort.",
  },
  change_password: {
    en: "Change the password.",
    fi: "Vaihda salasana.",
    sv: "Byt lösenordet.",
  },
  enable_mfa: {
    en: "Turn on multi-factor authentication.",
    fi: "Ota käyttöön vahva tunnistautuminen.",
    sv: "Aktivera tvåfaktorsautentisering.",
  },
  use_trusted_device: {
    en: "Use another device you trust.",
    fi: "Käytä toista luotettavaa laitetta.",
    sv: "Använd en annan enhet du litar på.",
  },
  check_password_reuse: {
    en: "Change the same password anywhere else you use it.",
    fi: "Vaihda sama salasana myös muista palveluista, joissa käytit sitä.",
    sv: "Byt samma lösenord också i andra tjänster.",
  },
  review_sessions: {
    en: "Check recent logins and sign out devices you do not know.",
    fi: "Tarkista viimeisimmät kirjautumiset ja kirjaa ulos tuntemattomat laitteet.",
    sv: "Kontrollera senaste inloggningarna och logga ut okända enheter.",
  },
  dont_approve_prompts: {
    en: "Do not approve login requests you did not start yourself.",
    fi: "Älä hyväksy kirjautumispyyntöjä, joita et itse käynnistänyt.",
    sv: "Godkänn inte inloggningsförfrågningar du inte själv startat.",
  },
  dont_share_codes: {
    en: "Never share codes or PINs with anyone who contacts you.",
    fi: "Älä kerro koodia tai tunnuslukua soittajalle.",
    sv: "Dela aldrig koder eller pinkoder med någon som kontaktar dig.",
  },
  disconnect_device: {
    en: "Put the device in flight mode or disconnect it from the network.",
    fi: "Laita laite lentotilaan tai katkaise sen verkkoyhteys.",
    sv: "Sätt enheten i flygläge eller koppla bort den från nätet.",
  },
  remove_app_or_profile: {
    en: "Remove the app or profile.",
    fi: "Poista sovellus tai profiili.",
    sv: "Ta bort appen eller profilen.",
  },
  get_device_checked: {
    en: "Run a security check or get technical help for the device.",
    fi: "Tarkistuta laite asiantuntijalla.",
    sv: "Låt en expert kontrollera enheten.",
  },
  avoid_banking_on_device: {
    en: "Do not use banking or important logins on the device until it has been checked.",
    fi: "Äläkä käytä pankkiasiointia laitteella ennen kuin se on tarkistettu.",
    sv: "Använd inte banktjänster på enheten förrän den har kontrollerats.",
  },
  contact_operator: {
    en: "Contact the operator's customer service.",
    fi: "Ota yhteyttä operaattorin asiakaspalveluun.",
    sv: "Kontakta operatörens kundtjänst.",
  },
  lock_subscription: {
    en: "Ask the operator to lock the SIM or eSIM.",
    fi: "Pyydä operaattoria lukitsemaan SIM-kortti tai numero.",
    sv: "Be operatören låsa SIM-kortet eller numret.",
  },
  report_police: {
    en: "Report the crime to the police.",
    fi: "Tee asiasta ilmoitus poliisille.",
    sv: "Gör en anmälan till polisen.",
  },
  report_cyber_authority: {
    en: "Report it to the National Cyber Security Centre.",
    fi: "Ilmoita asiasta kyberturvallisuuskeskukselle.",
    sv: "Rapportera till nationella cybersäkerhetscentret.",
  },
  keep_evidence: {
    en: "Keep the message and any screenshots as evidence.",
    fi: "Säilytä viesti ja kuvakaappaukset todisteina.",
    sv: "Spara meddelandet och skärmdumpar som bevis.",
  },
  hang_up_dont_call_back: {
    en: "Hang up and do not call back.",
    fi: "Katkaise puhelu ja älä soita takaisin.",
    sv: "Lägg på och ring inte tillbaka.",
  },
  two_person_approval: {
    en: "Use two-person approval for payments and bank-detail changes.",
    fi: "Ottakaa maksuihin kahden henkilön hyväksyntä käyttöön.",
    sv: "Använd två personer för att godkänna betalningar och ändringar av bankuppgifter.",
  },
  revoke_access: {
    en: "Remove access from people who should no longer have it.",
    fi: "Poista käyttöoikeus ihmisiltä, joilla ei enää pitäisi olla sitä.",
    sv: "Ta bort åtkomst från personer som inte längre ska ha den.",
  },
  check_forwarding_rules: {
    en: "Check the mailbox forwarding rules.",
    fi: "Tarkista sähköpostin edelleenlähetyssäännöt.",
    sv: "Kontrollera vidarebefordringsreglerna för mejlen.",
  },
  inform_staff: {
    en: "Warn your colleagues or staff.",
    fi: "Varoita kollegojasi tai henkilöstöä.",
    sv: "Varna dina kollegor eller personalen.",
  },
  dont_open_attachment: {
    en: "Do not open the attachment.",
    fi: "Älä avaa liitettä.",
    sv: "Öppna inte bilagan.",
  },
  secure_router: {
    en: "Change the router's admin password and update it.",
    fi: "Vaihda reitittimen ylläpitäjän salasana ja päivitä reititin.",
    sv: "Byt routerns administratörslösenord och uppdatera den.",
  },
  explain_benign: {
    en: "This looks legitimate, and it is safe to continue.",
    fi: "Tämä näyttää aidolta, ja voit jatkaa rauhassa.",
    sv: "Detta ser äkta ut, och du kan fortsätta.",
  },
  seek_support_org: {
    en: "You can talk this through with a victim support service or someone you trust.",
    fi: "Voit käydä asian läpi luotettavan ihmisen tai uhriapupalvelun kanssa.",
    sv: "Du kan prata med någon du litar på eller en brottsofferjour.",
  },
  plan_before_removing: {
    en: "Plan this safely with support before removing anything, so the other person is not alerted.",
    fi: "Suunnittele poisto turvallisesti tuen kanssa ennen kuin poistat mitään, jotta toinen henkilö ei huomaa.",
    sv: "Planera borttagningen tryggt med stöd innan du tar bort något, så att den andra personen inte upptäcker det.",
  },
  notify_data_protection: {
    en: "Report the personal data breach to the Data Protection Ombudsman within 72 hours.",
    fi: "Ilmoita tietovuodosta tietosuojavaltuutetulle 72 tunnin kuluessa.",
    sv: "Anmäl personuppläckan till datainspektionen inom 72 timmar.",
  },
  decline_request: {
    en: "I cannot help with that, but here is a safe route instead.",
    fi: "En voi auttaa siinä, mutta tässä on turvallinen vaihtoehto.",
    sv: "Jag kan inte hjälpa till med det, men här är en säker väg.",
  },
  check_statements: {
    en: "Check your bank statements and invoices for unknown charges.",
    fi: "Tarkista tiliotteet ja laskut tuntemattomien veloitusten varalta.",
    sv: "Kontrollera kontoutdrag och fakturor för okända avgifter.",
  },
  update_device: {
    en: "Update the device's software.",
    fi: "Päivitä laitteen ohjelmisto.",
    sv: "Uppdatera enhetens programvara.",
  },
};

export function stepPhrase(stepId: string, lang: Language): string {
  const p = STEP_PHRASES[stepId];
  if (!p) return stepId;
  return p[lang];
}
