import {
  VERSION,
  assertAccounting,
  integer,
  validateScenario,
  type State,
  type Scenario,
} from "./engine.js";
export const MAX_SAVE_BYTES = 2 * 1024 * 1024;
function object(
  v: unknown,
  keys: string[],
  optional: string[] = [],
): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("Expected object");
  const x = v as Record<string, unknown>;
  const actual = Object.keys(x);
  if (
    actual.some((k) => !keys.includes(k) && !optional.includes(k)) ||
    keys.some((k) => !Object.hasOwn(x, k))
  )
    throw new Error("Unexpected or missing fields");
  return x;
}
function list(v: unknown, max: number): unknown[] {
  if (!Array.isArray(v) || v.length > max) throw new Error("Invalid list");
  return v;
}
function str(v: unknown, max = 300): string {
  if (typeof v !== "string" || v.length > max)
    throw new Error("Invalid string");
  return v;
}
function num(v: unknown, max = 1_000_000_000): number {
  if (typeof v !== "number") throw new Error("Expected number");
  return integer(v, max);
}
function bool(v: unknown): boolean {
  if (typeof v !== "boolean") throw new Error("Expected boolean");
  return v;
}
export function parseSave(text: string): { state: State; scenario?: Scenario } {
  if (new TextEncoder().encode(text).byteLength > MAX_SAVE_BYTES)
    throw new Error("Save exceeds 2 MB");
  const envelope = object(JSON.parse(text), ["format", "state", "scenario"]);
  if (envelope.format !== VERSION) throw new Error("Unsupported save version");
  const s = object(envelope.state, [
    "version",
    "seed",
    "day",
    "scale",
    "totalCash",
    "households",
    "firms",
    "prices",
    "opening",
    "totals",
    "history",
    "events",
  ]);
  if (s.version !== VERSION) throw new Error("Unsupported rules version");
  num(s.seed, 0xffffffff);
  num(s.day, 100000);
  const scale = num(s.scale, 10);
  if (scale < 1) throw new Error("Invalid scale");
  if (num(s.totalCash) !== 840000 * scale)
    throw new Error("Invalid total cash");
  const hh = list(s.households, 600),
    ff = list(s.firms, 60);
  if (hh.length !== 60 * scale || ff.length !== 6 * scale)
    throw new Error("Invalid population");
  const ids = new Set<string>(),
    households = new Map<string, Record<string, unknown>>();
  for (const v of hh) {
    const h = object(v, ["id", "cash", "employer", "consumed"]);
    const id = str(h.id, 4);
    if (!/^H\d{3}$/.test(id) || ids.has(id))
      throw new Error("Invalid household ID");
    ids.add(id);
    households.set(id, h);
    str(h.employer, 3);
    num(h.cash);
    num(h.consumed);
  }
  const workers = new Set<string>();
  let inputFirms = 0;
  for (const v of ff) {
    const f = object(v, [
      "id",
      "sector",
      "cash",
      "stock",
      "inputs",
      "capacity",
      "workers",
      "active",
      "dryDays",
    ]);
    const id = str(f.id, 3);
    if (!/^[IF]\d{2}$/.test(id) || ids.has(id))
      throw new Error("Invalid firm ID");
    ids.add(id);
    if (
      (f.sector !== "input" && f.sector !== "final") ||
      (f.sector === "input") !== id.startsWith("I")
    )
      throw new Error("Invalid sector");
    if (f.sector === "input") inputFirms++;
    num(f.cash);
    num(f.stock);
    num(f.inputs);
    if (num(f.capacity, 30) !== (f.sector === "input" ? 30 : 15))
      throw new Error("Invalid capacity");
    bool(f.active);
    num(f.dryDays, 7);
    if ((f.active === false) !== (f.dryDays === 7))
      throw new Error("Invalid closure");
    const ws = list(f.workers, 10);
    if (ws.length !== 10) throw new Error("Invalid workforce");
    for (const w of ws) {
      const idw = str(w, 4);
      if (workers.has(idw) || households.get(idw)?.employer !== id)
        throw new Error("Invalid employment");
      workers.add(idw);
    }
  }
  if (inputFirms !== 2 * scale || workers.size !== hh.length)
    throw new Error("Invalid sector workforce");
  for (const [key, keys] of [
    ["prices", ["input", "final"]],
    ["opening", ["input", "final"]],
    ["totals", ["inputProduced", "finalProduced", "inputsUsed", "consumed"]],
  ] as const) {
    const obj = object(s[key], [...keys]);
    for (const v of Object.values(obj)) num(v);
  }
  const p = s.prices as { input: number; final: number };
  num(p.input, 300);
  num(p.final, 600);
  if (p.input < 40 || p.input > 300 || p.final < 120 || p.final > 600)
    throw new Error("Invalid price");
  const opening = s.opening as { input: number; final: number };
  if (opening.input !== 120 * scale || opening.final !== 120 * scale)
    throw new Error("Invalid opening inventory");
  const events = list(s.events, 20000),
    eventIds = new Set<string>();
  for (const v of events) {
    const e = object(v, [
      "id",
      "day",
      "kind",
      "actor",
      "other",
      "quantity",
      "cents",
      "causes",
      "detail",
    ]);
    const id = str(e.id, 200);
    if (eventIds.has(id)) throw new Error("Duplicate event");
    eventIds.add(id);
    num(e.day, s.day as number);
    str(e.kind, 30);
    str(e.actor, 10);
    str(e.other, 10);
    num(e.quantity);
    num(e.cents);
    str(e.detail);
    for (const c of list(e.causes, 100)) str(c, 200);
  }
  let previousDay = Math.max(0, (s.day as number) - 180);
  for (const v of list(s.history, 180)) {
    const m = object(v, [
      "day",
      "consumed",
      "unmet",
      "unaffordable",
      "employed",
      "inputPrice",
      "finalPrice",
      "inputOutput",
      "finalOutput",
      "active",
    ]);
    for (const val of Object.values(m)) num(val);
    if (
      (m.day as number) <= previousDay ||
      (m.day as number) > (s.day as number)
    )
      throw new Error("Invalid history order");
    previousDay = m.day as number;
  }
  let scenario: Scenario | undefined;
  if (envelope.scenario !== null) {
    object(
      envelope.scenario,
      ["target", "start", "end", "reductionBps"],
      ["pricing"],
    );
    scenario = envelope.scenario as unknown as Scenario;
    validateScenario(scenario, s as unknown as State);
  }
  const state = s as unknown as State;
  assertAccounting(state);
  return { state, scenario };
}
export function exportSave(state: State, scenario?: Scenario): string {
  const text = JSON.stringify({
    format: VERSION,
    state,
    scenario: scenario ?? null,
  });
  parseSave(text);
  return text;
}
