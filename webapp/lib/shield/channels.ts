// The fire-back channel registry: who receives a scammer's number when the
// user taps once. This is the product's spine — the caller who wasted your time
// becomes a *weak lead* in the Finnish sales economy.
//
// A weak lead is an unconsented contact: nobody asked the caller whether estate
// agents or sales companies may call them. Unconsented therefore cheap, and the
// partner is paid to work it out of the subscription profit share (see the
// economics block below and /partners) — never by the user.
//
// Registry is a representative demo subset, not a complete Finnish company
// register: every id, form field and scene note here is invented for the demo.

import type { Language } from "../engine/types";
import type { ChannelKind } from "./types";

export interface FanoutChannel {
  id: string;
  name: string;
  /** Partner role line, shown in consoles and notices. */
  role: string;
  kind: ChannelKind;
  /** Why this channel is on the list — the honest one-liner. */
  why: string;
  /** true = only sent for calls tagged as harassment. */
  harasserOnly: boolean;
  /** Form fields exactly as the target's own web form names them. */
  formFields: string[];
  /** Seed API key for the partner sync feed (rotatable, store-backed). */
  apiKey: string;
}

/** The one public listing: anyone can see it, anyone can ring it. */
const MARKETPLACE: FanoutChannel = {
  id: "fan-fb-marketplace",
  name: "Facebook Marketplace",
  role: "Public listing — anyone can call the number",
  kind: "marketplace_listing",
  why: "A listing titled after the caller is indexable and shareable; the number becomes reachable by strangers, not only by our forms.",
  harasserOnly: false,
  formFields: ["Otsikko", "Kategoria", "Kunto", "Hinta", "Kuvaus", "Yhteystieto"],
  apiKey: "pfk-demo-fan-fb-marketplace-1a4c",
};

/** Finnish estate-agency contact forms. */
const REAL_ESTATE: FanoutChannel[] = [
  ["fan-kiinteistomaailma", "Kiinteistömaailma", "Kiinteistönvälitys — valtakunnallinen ketju"],
  ["fan-op-koti", "OP Koti", "Kiinteistönvälitys — pankkiketju"],
  ["fan-sp-koti", "Sp-Koti", "Kiinteistönvälitys — valtakunnallinen ketju"],
  ["fan-habita", "Habita", "Kiinteistönvälitys — valtakunnallinen ketju"],
  ["fan-huoneistokeskus", "Huoneistokeskus", "Kiinteistönvälitys — valtakunnallinen ketju"],
  ["fan-remax-suomi", "RE/MAX Suomi", "Kiinteistönvälitys — franchise-ketju"],
  ["fan-aktia-kv", "Aktia Kiinteistönvälitys", "Kiinteistönvälitys — pankkiketju"],
  ["fan-nordea-kodit", "Nordea Kodit", "Kiinteistönvälitys — pankkiketju"],
].map(([id, name, role]) => ({
  id,
  name,
  role,
  kind: "real_estate" as const,
  why: "Agents ring numbers in their lead queue hunting listings and buyers; an unknown number is a cheap prospect.",
  harasserOnly: false,
  formFields: ["Nimi", "Puhelin", "Kohde", "Yhteydenotto"],
  apiKey: `pfk-demo-${id}-7b21`,
}));

/** Finnish outbound sales companies. */
const SALES: FanoutChannel[] = [
  ["fan-adea", "Adea", "Outbound asiakaskokemus ja myynti"],
  ["fan-teleperformance", "Teleperformance Suomi", "Contact center — outbound kampanjat"],
  ["fan-fonecta-sales", "Fonecta Sales", "B2B-numerot ja digitaalinen myynti"],
  ["fan-nordic-sales", "Nordic Sales Group", "Energian ja teleliittymien puhelinmyynti"],
  ["fan-saleshub", "SalesHub Suomi", "Pk-yritysten outbound-kumppani"],
  ["fan-kotikauppa", "Kotikauppa Direct", "Kodin palveluiden ja remonttien myynti"],
].map(([id, name, role]) => ({
  id,
  name,
  role,
  kind: "sales" as const,
  why: "Outbound teams buy lead lists; a number with no owner attached is a warm dial that costs them nothing.",
  harasserOnly: false,
  formFields: ["Puhelin", "Nimi", "Kiinnostuksen kohde", "Soittoaika"],
  apiKey: `pfk-demo-${id}-5d38`,
}));

/** The harasser extra: dating / adult sites, because 99.99 % of harassers are
 * men, and a number on those sites does not stop ringing. */
const HARASSER_SITES: FanoutChannel[] = [
  ["fan-manhunt", "Manhunt", "Dating — miesten välinen"],
  ["fan-planetromeo", "PlanetRomeo", "Dating — miesten välinen"],
  ["fan-gaydar", "Gaydar", "Dating — miesten välinen"],
  ["fan-squirt", "Squirt.org", "Dating / hookup-sivusto"],
  ["fan-recon", "Recon", "Dating — fetissiprofiilit"],
].map(([id, name, role]) => ({
  id,
  name,
  role,
  kind: "harasser_site" as const,
  why: "Harassers are overwhelmingly men, so the number is also signed up where men are looking.",
  harasserOnly: true,
  formFields: ["Nick", "Puhelin", "Ikä", "Kaupunki", "Rooli"],
  apiKey: `pfk-demo-${id}-9f05`,
}));

export const FANOUT_CHANNELS: FanoutChannel[] = [
  MARKETPLACE,
  ...REAL_ESTATE,
  ...SALES,
  ...HARASSER_SITES,
];

export function channelById(id: string): FanoutChannel | undefined {
  return FANOUT_CHANNELS.find((c) => c.id === id);
}

/** Channels a fired-back call goes to: everything, plus the harasser extra. */
export function fanoutPlan(harasser: boolean): FanoutChannel[] {
  return FANOUT_CHANNELS.filter((c) => !c.harasserOnly || harasser);
}

export function channelsOfKind(kind: ChannelKind): FanoutChannel[] {
  return FANOUT_CHANNELS.filter((c) => c.kind === kind);
}

// ---------------------------------------------------------------------------
// Economics. The partner fund is a share of *subscription profit* — the user
// never pays a partner directly, and the caller (who never consented) pays
// nothing at all. Unit keys below are distribution keys of that fund.
// ---------------------------------------------------------------------------

/** Monthly list price the demo prices page charges for the tier that fires back. */
export const PLUS_PRICE_EUR = 4.99;
/** Share of subscription profit paid out across the partner network. */
export const PARTNER_FUND_SHARE = 0.3;
/** Fund key per delivered weak lead. Calibrated so that one fired-back number
 * (20 targets) is roughly the monthly partner fund of one Plus subscriber. */
export const WEAK_LEAD_SHARE_EUR = 0.05;

export function partnerFundPerSubscriberEur(): number {
  return Math.round(PLUS_PRICE_EUR * PARTNER_FUND_SHARE * 100) / 100;
}

// ---------------------------------------------------------------------------
// Form filling. Deterministic: same call in, same payload out — an integration
// may review the payload before a real POST, but nothing here needs a model.
// ---------------------------------------------------------------------------

function lastDigits(number: string, n: number): string {
  return number.replace(/\D/g, "").slice(-n);
}

/** Values shared across targets, phrased in the call's language. */
function sharedValues(args: { number: string; language: Language; harasser: boolean }) {
  const t = {
    fi: {
      unknown: "Tuntematon soittaja (FireBack)",
      seller: "Asunnon kartoitus ja arvio",
      contact: "Puhelinsoitto, arkisin klo 17–19",
      interest: "Kaikki — soittakaa ja katsokaa",
      best: "arkisin klo 17–19, viikonloppuisin milloin vain",
      body: (n: string) => `Numero ${n} soitti ja esiintyi luotettavasti. Numero on nyt vapaasti soitettavissa: soittakaa ja katsokaa, tarttuuko kauppa.`,
      city: "Turku",
    },
    en: {
      unknown: "Unknown caller (FireBack)",
      seller: "Home valuation and viewing",
      contact: "Phone call, weekdays 17–19",
      interest: "Anything — call and find out",
      best: "weekdays 17–19, any time at weekends",
      body: (n: string) => `The number ${n} called us and pretended to be someone. It is now fair game: call it and see whether anything sticks.`,
      city: "Turku",
    },
    sv: {
      unknown: "Okänd uppringare (FireBack)",
      seller: "Värdering och visning av bostad",
      contact: "Telefonsamtal, vardagar 17–19",
      interest: "Allt — ring och se",
      best: "vardagar 17–19, när som helst på helgen",
      body: (n: string) => `Numret ${n} ringde oss och låtsades vara någon. Numret är nu fritt fram: ring och se om något nappar.`,
      city: "Åbo",
    },
  }[args.language];

  const nick = args.harasser ? `harasser-${lastDigits(args.number, 4)}` : `caller-${lastDigits(args.number, 4)}`;
  return { ...t, nick };
}

/** Build the exact form payload submitted for one channel. */
export function fillForm(
  channel: FanoutChannel,
  args: { number: string; language: Language; harasser: boolean },
): Record<string, string> {
  const v = sharedValues(args);
  const n = args.number;
  switch (channel.kind) {
    case "marketplace_listing":
      return {
        Otsikko: `Soita tälle numerolle — ${n}`,
        Kategoria: "Muu",
        Kunto: "Käytetty",
        Hinta: "0 €",
        Kuvaus: v.body(n),
        Yhteystieto: n,
      };
    case "real_estate":
      return {
        Nimi: v.unknown,
        Puhelin: n,
        Kohde: v.seller,
        Yhteydenotto: v.contact,
      };
    case "sales":
      return {
        Puhelin: n,
        Nimi: v.unknown,
        "Kiinnostuksen kohde": v.interest,
        Soittoaika: v.best,
      };
    case "harasser_site":
      return {
        Nick: v.nick,
        Puhelin: n,
        Ikä: "30–49",
        Kaupunki: v.city,
        Rooli: "Yleis",
      };
  }
}

/** Short group label used by the UI board. */
export const KIND_LABELS: Record<ChannelKind, string> = {
  marketplace_listing: "Public listing",
  real_estate: "Estate agents",
  sales: "Sales companies",
  harasser_site: "Harasser extra",
};

export function isChannelKind(v: string): v is ChannelKind {
  return v === "marketplace_listing" || v === "real_estate" || v === "sales" || v === "harasser_site";
}
