/** Integer state, pure step function, versioned deterministic allocation. See docs/Rules.md. */
export const VERSION = "market-town/0.2";
export type Sector = "input" | "final";
export interface Household {
  id: string;
  cash: number;
  employer: string;
  consumed: number;
}
export interface Firm {
  id: string;
  sector: Sector;
  cash: number;
  stock: number;
  inputs: number;
  capacity: number;
  workers: string[];
  active: boolean;
  dryDays: number;
}
export interface Event {
  id: string;
  day: number;
  kind: string;
  actor: string;
  other: string;
  quantity: number;
  cents: number;
  causes: string[];
  detail: string;
}
export interface Metric {
  day: number;
  consumed: number;
  unmet: number;
  unaffordable: number;
  employed: number;
  inputPrice: number;
  finalPrice: number;
  inputOutput: number;
  finalOutput: number;
  active: number;
}
export interface State {
  version: string;
  seed: number;
  day: number;
  scale: number;
  totalCash: number;
  households: Household[];
  firms: Firm[];
  prices: { input: number; final: number };
  opening: { input: number; final: number };
  totals: {
    inputProduced: number;
    finalProduced: number;
    inputsUsed: number;
    consumed: number;
  };
  history: Metric[];
  events: Event[];
}
export interface Scenario {
  target: string;
  start: number;
  end: number;
  reductionBps: number;
  pricing?: "adaptive" | "fixed";
}
export const SHOCK: Scenario = {
  target: "I00",
  start: 31,
  end: 60,
  reductionBps: 5000,
};
export const PERTURBATION: Scenario = {
  target: "I00",
  start: 31,
  end: 31,
  reductionBps: 333,
};
export function integer(n: number, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(n) || n < 0 || n > max)
    throw new Error("Unsafe or out of range integer");
  return n;
}
export function add(a: number, b: number): number {
  return integer(integer(a) + integer(b));
}
export function sub(a: number, b: number): number {
  return integer(integer(a) - integer(b));
}
export function mul(a: number, b: number): number {
  return integer(integer(a) * integer(b));
}
export function div(a: number, b: number): number {
  integer(a);
  integer(b);
  if (!b) throw new Error("Division by zero");
  return integer(Math.floor(a / b));
}
const sum = (xs: number[]) => xs.reduce(add, 0);
export const order = (a: string, b: string): number =>
  a < b ? -1 : a > b ? 1 : 0;
export function rank(...parts: (string | number)[]): number {
  let h = 2166136261;
  const s = JSON.stringify(parts);
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}
export interface Claim {
  id: string;
  quantity: number;
}
/** Largest remainder; no sequential claimant gets first access. */
export function allocate(
  claims: Claim[],
  available: number,
  key: string,
): Map<string, number> {
  integer(available);
  const seen = new Set<string>();
  for (const c of claims) {
    integer(c.quantity);
    if (seen.has(c.id)) throw new Error("Duplicate claim");
    seen.add(c.id);
  }
  const total = sum(claims.map((c) => c.quantity));
  const supply = Math.min(available, total);
  if (!total) return new Map(claims.map((c) => [c.id, 0]));
  const rows = claims.map((c) => {
    const product = mul(c.quantity, supply);
    return { ...c, fill: div(product, total), remainder: product % total };
  });
  const left = sub(supply, sum(rows.map((r) => r.fill)));
  rows.sort(
    (a, b) =>
      b.remainder - a.remainder ||
      rank(key, a.id) - rank(key, b.id) ||
      order(a.id, b.id),
  );
  for (let i = 0; i < left; i++) rows[i].fill = add(rows[i].fill, 1);
  return new Map(rows.map((r) => [r.id, r.fill]));
}
export function transfer(
  payer: { cash: number },
  payee: { cash: number },
  cents: number,
): void {
  integer(cents);
  const a = sub(payer.cash, cents),
    b = add(payee.cash, cents);
  payer.cash = a;
  payee.cash = b;
}
export function createTown(seed = 0, scale = 1): State {
  integer(seed, 0xffffffff);
  integer(scale, 10);
  if (scale < 1) throw new Error("Scale must be 1..10");
  const households: Household[] = [],
    firms: Firm[] = [];
  for (let i = 0; i < 6 * scale; i++) {
    const sector: Sector = i < 2 * scale ? "input" : "final";
    const id =
      (sector === "input" ? "I" : "F") +
      String(sector === "input" ? i : i - 2 * scale).padStart(2, "0");
    const workers = Array.from(
      { length: 10 },
      (_, j) => "H" + String(i * 10 + j).padStart(3, "0"),
    );
    firms.push({
      id,
      sector,
      cash: 40000,
      stock: 30,
      inputs: sector === "final" ? 15 : 0,
      capacity: sector === "input" ? 30 : 15,
      workers,
      active: true,
      dryDays: 0,
    });
    households.push(
      ...workers.map((id) => ({
        id,
        cash: 10000,
        employer: firms[firms.length - 1].id,
        consumed: 0,
      })),
    );
  }
  return {
    version: VERSION,
    seed,
    scale,
    day: 0,
    totalCash: 840000 * scale,
    households,
    firms,
    prices: { input: 80, final: 200 },
    opening: { input: 120 * scale, final: 120 * scale },
    totals: { inputProduced: 0, finalProduced: 0, inputsUsed: 0, consumed: 0 },
    history: [],
    events: [],
  };
}
export function validateScenario(s: Scenario | undefined, state?: State): void {
  if (!s) return;
  integer(s.start, 100000);
  integer(s.end, 100000);
  integer(s.reductionBps, 10000);
  if (
    s.pricing !== undefined &&
    s.pricing !== "adaptive" &&
    s.pricing !== "fixed"
  )
    throw new Error("Invalid pricing mode");
  if (
    s.start < 1 ||
    s.end < s.start ||
    !/^I\d{2}$/.test(s.target) ||
    (state &&
      !state.firms.some((f) => f.id === s.target && f.sector === "input"))
  )
    throw new Error("Invalid scenario");
}
export function assertAccounting(s: State): void {
  const cash = sum([...s.households, ...s.firms].map((x) => integer(x.cash)));
  if (cash !== s.totalCash) throw new Error("Cash conservation failed");
  for (const f of s.firms) {
    integer(f.stock);
    integer(f.inputs);
    if (f.sector === "input" && f.inputs !== 0)
      throw new Error("Unexpected input inventory");
  }
  const inputStock = sum(
    s.firms.map((f) => (f.sector === "input" ? f.stock : f.inputs)),
  );
  const finalStock = sum(
    s.firms.filter((f) => f.sector === "final").map((f) => f.stock),
  );
  if (
    add(inputStock, s.totals.inputsUsed) !==
    add(s.opening.input, s.totals.inputProduced)
  )
    throw new Error("Input conservation failed");
  if (
    add(finalStock, s.totals.consumed) !==
    add(s.opening.final, s.totals.finalProduced)
  )
    throw new Error("Final conservation failed");
  if (
    sum(s.households.map((h) => h.consumed)) !== s.totals.consumed ||
    s.totals.inputsUsed !== s.totals.finalProduced
  )
    throw new Error("Consumption/recipe mismatch");
}
export function step(previous: State, scenario?: Scenario): State {
  validateScenario(scenario, previous);
  const s: State = {
    ...previous,
    day: add(previous.day, 1),
    households: previous.households
      .map((h) => ({ ...h }))
      .sort((a, b) => order(a.id, b.id)),
    firms: previous.firms
      .map((f) => ({ ...f, workers: [...f.workers].sort(order) }))
      .sort((a, b) => order(a.id, b.id)),
    prices: { ...previous.prices },
    totals: { ...previous.totals },
    history: [...previous.history],
    events: previous.events.filter(
      (e) => e.day > safelySubtract(previous.day, 6),
    ),
  };
  integer(s.day, 100000);
  const hs = new Map(s.households.map((h) => [h.id, h]));
  const emit = (
    kind: string,
    actor: string,
    other = "",
    quantity = 0,
    cents = 0,
    causes: string[] = [],
    detail = "",
  ) => {
    const id = JSON.stringify([s.day, kind, actor, other]);
    s.events.push({
      id,
      day: s.day,
      kind,
      actor,
      other,
      quantity,
      cents,
      causes,
      detail,
    });
    return id;
  };
  const production = new Map<string, string>(),
    paid = new Set<string>(),
    capacities = new Map<string, number>();
  for (const f of s.firms) {
    let capacity = f.capacity;
    let causes: string[] = [];
    if (
      scenario &&
      s.day >= scenario.start &&
      s.day <= scenario.end &&
      f.id === scenario.target &&
      scenario.reductionBps > 0
    ) {
      capacity = div(mul(capacity, sub(10000, scenario.reductionBps)), 10000);
      causes = [
        emit(
          "capacity",
          f.id,
          "",
          capacity,
          0,
          [],
          `Capacity ${f.capacity} → ${capacity}`,
        ),
      ];
    }
    capacities.set(f.id, capacity);
    if (!f.active) continue;
    const payroll = mul(100, f.workers.length);
    if (f.cash < payroll) {
      f.dryDays = add(f.dryDays, 1);
      emit(
        "payroll-shortfall",
        f.id,
        "",
        0,
        0,
        [],
        `Cash ${f.cash}; required ${payroll}`,
      );
      if (f.dryDays >= 7) {
        f.active = false;
        emit("closure", f.id);
      }
      continue;
    }
    f.dryDays = 0;
    paid.add(f.id);
    for (const id of f.workers) {
      const h = hs.get(id);
      if (!h) throw new Error("Unknown worker");
      transfer(f, h, 100);
      emit("wage", f.id, h.id, 0, 100);
    }
    if (f.sector === "input") {
      f.stock = add(f.stock, capacity);
      s.totals.inputProduced = add(s.totals.inputProduced, capacity);
      production.set(
        f.id,
        emit(
          "production",
          f.id,
          "",
          capacity,
          0,
          causes,
          "Input goods produced",
        ),
      );
    }
  }
  // Purchases are pooled at a common sector price; buyer and seller fills are computed before matching.
  const market = (
    sector: Sector,
    buyers: { account: Household | Firm; wanted: number }[],
  ): { sold: number; demand: number; available: number } => {
    const price = s.prices[sector];
    const sellers = s.firms.filter(
      (f) => f.active && f.sector === sector && f.stock > 0,
    );
    const demand = sum(buyers.map((b) => b.wanted)),
      available = sum(sellers.map((f) => f.stock));
    const key = JSON.stringify([s.seed, s.day, "market", sector]);
    const buyerFills = allocate(
      buyers.map((b) => ({ id: b.account.id, quantity: b.wanted })),
      available,
      key + "buyers",
    );
    const sellerFills = allocate(
      sellers.map((f) => ({ id: f.id, quantity: f.stock })),
      Math.min(demand, available),
      key + "sellers",
    );
    const sortedBuyers = [...buyers].sort((a, b) =>
      order(a.account.id, b.account.id),
    );
    let j = 0;
    for (const b of sortedBuyers) {
      let left = buyerFills.get(b.account.id) ?? 0;
      while (left > 0) {
        const f = sellers[j];
        if (!f) throw new Error("Matching failed");
        const remaining = sellerFills.get(f.id) ?? 0;
        if (!remaining) {
          j++;
          continue;
        }
        const q = Math.min(left, remaining),
          cents = mul(q, price);
        transfer(b.account, f, cents);
        f.stock = sub(f.stock, q);
        if (sector === "input") {
          const target = b.account as Firm;
          target.inputs = add(target.inputs, q);
        } else {
          const h = b.account as Household;
          h.consumed = add(h.consumed, q);
          s.totals.consumed = add(s.totals.consumed, q);
        }
        emit(
          "trade",
          b.account.id,
          f.id,
          q,
          cents,
          [],
          `Pooled ${sector} market at ${price} cents/unit; seller assignment is bookkeeping, not physical lot tracing`,
        );
        sellerFills.set(f.id, sub(remaining, q));
        left = sub(left, q);
      }
    }
    return { sold: Math.min(demand, available), demand, available };
  };
  const inputs = market(
    "input",
    s.firms
      .filter((f) => f.sector === "final" && paid.has(f.id))
      .map((f) => ({
        account: f,
        wanted: Math.min(
          Math.max(0, (capacities.get(f.id) ?? 0) - f.inputs),
          div(f.cash, s.prices.input),
        ),
      })),
  );
  for (const f of s.firms.filter(
    (f) => f.sector === "final" && paid.has(f.id),
  )) {
    const q = Math.min(capacities.get(f.id) ?? 0, f.inputs);
    f.inputs = sub(f.inputs, q);
    f.stock = add(f.stock, q);
    s.totals.inputsUsed = add(s.totals.inputsUsed, q);
    s.totals.finalProduced = add(s.totals.finalProduced, q);
    const causes = s.events
      .filter(
        (e) =>
          e.day === s.day &&
          ((e.kind === "trade" && e.actor === f.id) || e.kind === "capacity"),
      )
      .map((e) => e.id);
    production.set(
      f.id,
      emit(
        "production",
        f.id,
        "",
        q,
        0,
        causes,
        `Final goods produced; input stock before production ${f.inputs + q}`,
      ),
    );
  }
  const before = s.totals.consumed;
  const goods = market(
    "final",
    s.households.map((h) => ({
      account: h,
      wanted: Math.min(1, div(h.cash, s.prices.final)),
    })),
  );
  const consumed = sub(s.totals.consumed, before),
    unaffordable = sub(s.households.length, goods.demand);
  if (s.day % 7 === 0) {
    for (const f of s.firms.filter((f) => f.active)) {
      const surplus = Math.max(0, f.cash - mul(3000, f.workers.length));
      // Equal quotient plus a fair keyed remainder; allocate only the remainder because demand is one per owner.
      const base = div(surplus, f.workers.length);
      const remainders = allocate(
        f.workers.map((id) => ({ id, quantity: 1 })),
        surplus % f.workers.length,
        JSON.stringify([s.seed, s.day, "dividend-remainder", f.id]),
      );
      for (const id of f.workers) {
        const cents = add(base, remainders.get(id) ?? 0);
        if (cents) {
          transfer(f, hs.get(id)!, cents);
          emit("dividend", f.id, id, 0, cents);
        }
      }
    }
  }
  const update = (
    sector: Sector,
    m: { sold: number; demand: number; available: number },
  ) => {
    const delta =
      m.demand > m.sold ? 5 : m.available > m.sold + div(m.sold, 10) ? -5 : 0;
    const min = sector === "input" ? 40 : 120,
      max = sector === "input" ? 300 : 600;
    s.prices[sector] = Math.min(max, Math.max(min, s.prices[sector] + delta));
  };
  const inputPrice = s.prices.input,
    finalPrice = s.prices.final;
  if (scenario?.pricing !== "fixed") {
    update("input", inputs);
    update("final", goods);
  }
  const metric: Metric = {
    day: s.day,
    consumed,
    unmet: sub(s.households.length, consumed),
    unaffordable,
    employed: sum(
      s.firms.filter((f) => paid.has(f.id)).map((f) => f.workers.length),
    ),
    inputPrice,
    finalPrice,
    inputOutput: sub(s.totals.inputProduced, previous.totals.inputProduced),
    finalOutput: sub(s.totals.finalProduced, previous.totals.finalProduced),
    active: s.firms.filter((f) => f.active).length,
  };
  s.history.push(metric);
  s.history = s.history.slice(-180);
  assertAccounting(s);
  return s;
}
function safelySubtract(a: number, b: number): number {
  return Math.max(0, a - b);
}
export function run(state: State, days: number, scenario?: Scenario): State {
  integer(days, 100000);
  if (state.day + days > 100000) throw new Error("Day limit");
  let s = state;
  for (let i = 0; i < days; i++) s = step(s, scenario);
  return s;
}
export function compare(seed = 0, scale = 1, scenario: Scenario = SHOCK) {
  const checkpoint = run(createTown(seed, scale), 30),
    baseline = run(checkpoint, 60),
    changed = run(checkpoint, 60, scenario);
  return { baseline, changed };
}
export function longComparison(
  seed = 0,
  scale = 1,
  scenario: Scenario = SHOCK,
) {
  const checkpoint = run(createTown(seed, scale), 30);
  const baseline90 = run(checkpoint, 60),
    changed90 = run(checkpoint, 60, scenario);
  const frozen = { ...scenario, pricing: "fixed" as const };
  return {
    baseline90,
    changed90,
    baseline365: run(baseline90, 275),
    changed365: run(changed90, 275, scenario),
    fixedBaseline365: run(checkpoint, 335, { ...frozen, reductionBps: 0 }),
    fixedChanged365: run(checkpoint, 335, frozen),
  };
}
export function canonical(state: State): string {
  const normalized = {
    ...state,
    households: [...state.households].sort((a, b) => order(a.id, b.id)),
    firms: [...state.firms]
      .sort((a, b) => order(a.id, b.id))
      .map((f) => ({ ...f, workers: [...f.workers].sort(order) })),
  };
  const sortKeys = (value: unknown): unknown =>
    Array.isArray(value)
      ? value.map(sortKeys)
      : value !== null && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value)
              .sort(([a], [b]) => order(a, b))
              .map(([key, v]) => [key, sortKeys(v)]),
          )
        : value;
  return JSON.stringify(sortKeys(normalized));
}
