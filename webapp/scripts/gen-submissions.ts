// Generates submission JSONL files from the engine for dev + test splits.
//   node --experimental-strip-types scripts/gen-submissions.ts
// Writes: <repo>/dev-submissions.jsonl and <repo>/test_predictions.jsonl
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { decideSingleTurn } from "../lib/engine/decide.ts";
import type { CaseInput } from "../lib/engine/types.ts";

const args = process.argv.slice(2);
const arg = (name: string, def: string): string => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const devPath = arg("--dev", path.join(root, "info", "data", "dev", "cases.jsonl"));
const testPath = arg("--test", path.join(root, "info", "data", "test", "inputs.jsonl"));

// Only test-input-shaped fields are passed: no ground truth, no labels.
const pick = (c: Record<string, unknown>): CaseInput => ({
  case_id: c.case_id as string,
  split: c.split as string,
  version: c.version as string,
  journey: c.journey as CaseInput["journey"],
  audience: c.audience as CaseInput["audience"],
  locale: c.locale as string,
  language: c.language as CaseInput["language"],
  persona: c.persona as Record<string, unknown>,
  entry_point: c.entry_point as string,
  user_identified: c.user_identified as boolean,
  opening_message: c.opening_message as string,
  signals: c.signals as CaseInput["signals"],
  signal_availability: c.signal_availability as Record<string, string>,
  consent: c.consent as CaseInput["consent"],
});

function run(file: string, out: string): void {
  const lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  const outLines = lines.map((l) => JSON.stringify(decideSingleTurn(pick(JSON.parse(l)))));
  writeFileSync(out, outLines.join("\n") + "\n", "utf8");
  console.log(`${outLines.length} answers -> ${out}`);
}

run(devPath, path.join(root, "dev-submissions.jsonl"));
run(testPath, path.join(root, "test_predictions.jsonl"));
