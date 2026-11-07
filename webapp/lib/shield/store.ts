// Server-only persistent store for the shield pipeline.
// File-backed JSON (webapp/.data/shield-state.json) with serialized writes:
// survives dev-server restarts, no dependencies. A production deployment would
// swap this module for a real database behind the same read/modify functions —
// all API routes go through here, nothing else touches state directly.

import { promises as fs } from "fs";
import path from "path";
import type {
  AccountStanding,
  ShieldStoreState,
  StrikeEntry,
  RemovalNotice,
} from "./types";

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "shield-state.json");

function emptyState(): ShieldStoreState {
  return {
    actions: [],
    saved: [],
    reports: [],
    submissions: [],
    outcomes: [],
    credits: [],
    strikes: [],
    notices: [],
    consents: [],
    leadGrants: [],
    partnerKeys: {},
    suspendedAt: {},
  };
}

let state: ShieldStoreState | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function load(): Promise<ShieldStoreState> {
  if (state) return state;
  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    state = { ...emptyState(), ...(JSON.parse(raw) as ShieldStoreState) };
  } catch {
    state = emptyState();
  }
  return state;
}

/** Serialized read-modify-write; every mutation persists before resolving. */
export async function mutate<T>(fn: (s: ShieldStoreState) => T): Promise<T> {
  const s = await load();
  const result = fn(s);
  writeChain = writeChain.then(async () => {
    try {
      await fs.mkdir(STORE_DIR, { recursive: true });
      const tmp = `${STORE_FILE}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(s, null, 2), "utf8");
      await fs.rename(tmp, STORE_FILE);
    } catch (e) {
      console.error("[shield-store] persist failed:", e);
    }
  });
  await writeChain;
  return result;
}

export async function readState(): Promise<ShieldStoreState> {
  return load();
}

/** Demo reset: wipe everything back to a fresh store. */
export async function resetStore(): Promise<void> {
  state = emptyState();
  await mutate(() => undefined);
}

export function standingOf(state: ShieldStoreState, actorId: string): AccountStanding {
  return {
    actorId,
    strikes: state.strikes.filter((k: StrikeEntry) => k.actorId === actorId),
    strikeLimit: 3,
    suspendedAt: state.suspendedAt[actorId] ?? null,
  };
}

export function noticesForPartner(state: ShieldStoreState, partnerId: string): RemovalNotice[] {
  return state.notices.filter((n) => n.partnerIds.includes(partnerId));
}
