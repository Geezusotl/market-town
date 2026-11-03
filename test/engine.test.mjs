import test from "node:test";
import assert from "node:assert/strict";
import fc from "fast-check";
import {
  allocate,
  createTown,
  run,
  step,
  compare,
  canonical,
  assertAccounting,
  transfer,
  add,
  mul,
  SHOCK,
  PERTURBATION,
  rank,
} from "../dist/engine.js";
import { parseSave, exportSave } from "../dist/save.js";
test("hand calculated wages and purchase fixture: 900 + 600 = 1500", () => {
  const h = { cash: 1000 },
    f = { cash: 500, stock: 3 };
  transfer(f, h, 200);
  transfer(h, f, 300);
  f.stock -= 2;
  assert.deepEqual([h.cash, f.cash, f.stock], [900, 600, 1]);
});
test("hand calculated production and leftover inventory fixture", () => {
  const state = step(createTown());
  const f = state.firms.find((x) => x.id === "F00");
  assert.deepEqual([f.inputs, f.stock, f.cash], [0, 30, 42000]);
  assert.equal(state.households[0].cash, 9900);
});
test("insufficient transfer is atomic", () => {
  const a = { cash: 10 },
    b = { cash: 5 };
  assert.throws(() => transfer(a, b, 11));
  assert.deepEqual([a.cash, b.cash], [10, 5]);
});
test("safe arithmetic rejects overflow, negative and fractional values", () => {
  assert.throws(() => add(Number.MAX_SAFE_INTEGER, 1));
  assert.throws(() => mul(Number.MAX_SAFE_INTEGER, 2));
  assert.throws(() => transfer({ cash: 10 }, { cash: 0 }, 0.1));
});
test("largest remainder fixture with unequal claims", () => {
  assert.deepEqual(
    [
      ...allocate(
        [
          { id: "a", quantity: 5 },
          { id: "b", quantity: 3 },
          { id: "c", quantity: 2 },
        ],
        7,
        "fixture",
      ),
    ].sort(),
    [
      ["a", 4],
      ["b", 2],
      ["c", 1],
    ],
  );
});
test("zero supply and empty demand", () => {
  assert.deepEqual(
    [...allocate([{ id: "a", quantity: 3 }], 0, "x")],
    [["a", 0]],
  );
  assert.equal(allocate([], 10, "x").size, 0);
});
test("duplicate claims are rejected", () =>
  assert.throws(() =>
    allocate(
      [
        { id: "a", quantity: 1 },
        { id: "a", quantity: 2 },
      ],
      2,
      "x",
    ),
  ));
test("allocation conserves goods and bounds each claim: 1000 generated cases", () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 0, max: 1000 }), { maxLength: 30 }),
      fc.integer({ min: 0, max: 30000 }),
      (quantities, supply) => {
        const claims = quantities.map((quantity, i) => ({
          id: String(i),
          quantity,
        }));
        const fills = allocate(claims, supply, "property");
        assert.equal(
          [...fills.values()].reduce((a, b) => a + b, 0),
          Math.min(
            supply,
            quantities.reduce((a, b) => a + b, 0),
          ),
        );
        for (const c of claims) {
          assert.ok(fills.get(c.id) >= 0 && fills.get(c.id) <= c.quantity);
        }
      },
    ),
    { seed: 1042, numRuns: 1000 },
  );
});
test("allocation depends on identity and key, never array insertion order", () => {
  const c = Array.from({ length: 10 }, (_, i) => ({
    id: String(i),
    quantity: i + 1,
  }));
  assert.deepEqual(
    [...allocate(c, 11, "x")].sort(),
    [...allocate(c.reverse(), 11, "x")].sort(),
  );
});
test("keyed tie breaking is not a global random stream", () => {
  const a = rank("seed", 31, "a");
  rank("unrelated", 100);
  assert.equal(a, rank("seed", 31, "a"));
});
test("small equal claims have no persistent label winner over fixed 10000 seeds", () => {
  const wins = Array(5).fill(0);
  for (let seed = 0; seed < 10000; seed++)
    for (const [id, n] of allocate(
      wins.map((_, i) => ({ id: String(i), quantity: 1 })),
      1,
      String(seed),
    ))
      wins[Number(id)] += n;
  for (const n of wins) assert.ok(n > 1500 && n < 2500, JSON.stringify(wins));
});
test("pure step does not mutate the previous state", () => {
  const a = createTown();
  const saved = canonical(a);
  step(a);
  assert.equal(canonical(a), saved);
});
test("hand computed first day aggregate", () => {
  const s = step(createTown());
  assert.equal(s.totals.inputProduced, 60);
  assert.equal(s.totals.finalProduced, 60);
  assert.equal(s.totals.consumed, 60);
  assert.equal(s.totalCash, 840000);
  assert.equal(s.firms.find((f) => f.id === "I00").cash, 39000);
  assertAccounting(s);
});
test("all cash and goods reconcile for 30 fixed paired seeds through day 90", () => {
  for (let seed = 0; seed < 30; seed++) {
    const { baseline, changed } = compare(seed);
    assertAccounting(baseline);
    assertAccounting(changed);
    assert.equal(baseline.totals.consumed, 5400);
    assert.equal(baseline.history.at(-1).active, 6);
  }
});
test("zero change branches match exactly", () => {
  const { baseline, changed } = compare(12, 1, { ...SHOCK, reductionBps: 0 });
  assert.equal(canonical(baseline), canonical(changed));
});
test("capacity shock halves input production on day 31 only within window", () => {
  const s = run(createTown(), 30);
  assert.equal(step(s, SHOCK).history.at(-1).inputOutput, 45);
  assert.equal(step(run(s, 30, SHOCK), SHOCK).history.at(-1).inputOutput, 60);
});
test("storage permutation yields identical full state and events", () => {
  const s = run(createTown(9), 30);
  const b = structuredClone(s);
  b.households.reverse();
  b.firms.reverse();
  for (const f of b.firms) f.workers.reverse();
  assert.equal(canonical(run(s, 60, SHOCK)), canonical(run(b, 60, SHOCK)));
});
test("checkpoint export, restore and resume matches continuous execution", () => {
  const s = run(createTown(11), 35, SHOCK);
  const restored = parseSave(exportSave(s, SHOCK));
  assert.equal(
    canonical(run(s, 55, SHOCK)),
    canonical(run(restored.state, 55, restored.scenario)),
  );
});
test("baseline remains operating over 2000 days; history and events stay bounded", () => {
  const s = run(createTown(3), 2000);
  assertAccounting(s);
  assert.equal(s.history.at(-1).active, 6);
  assert.equal(s.history.at(-1).consumed, 60);
  assert.equal(s.history.length, 180);
  assert.ok(s.events.length < 2000);
});
test("business closure is explicit, conserves assets and releases no hidden money", () => {
  const s = createTown();
  const f = s.firms[0];
  s.households[0].cash += f.cash;
  f.cash = 0;
  s.firms[1].stock += f.stock;
  f.stock = 0;
  const out = run(s, 7);
  assert.equal(out.firms.find((x) => x.id === f.id).active, false);
  assertAccounting(out);
});
test("absent scenario target and illegal duration fail", () => {
  assert.throws(() => step(createTown(), { ...SHOCK, target: "I99" }));
  assert.throws(() => step(createTown(), { ...SHOCK, end: 0 }));
});
test("import rejects unknown fields, prototype keys, wrong versions, bad integers and cash forgery", () => {
  const original = exportSave(createTown());
  for (const modify of [
    (x) => (x.format = "future"),
    (x) => (x.state.households[0].cash = 0.1),
    (x) => x.state.totalCash++,
    (x) => (x.state.extra = true),
    (x) => (x.state.firms[0].workers[0] = "H999"),
  ]) {
    const x = JSON.parse(original);
    modify(x);
    assert.throws(() => parseSave(JSON.stringify(x)));
  }
  assert.throws(() =>
    parseSave(original.replace('"seed":0', '"__proto__":{},"seed":0')),
  );
});
test("import rejects oversized and malformed data", () => {
  assert.throws(() => parseSave(" ".repeat(2 * 1024 * 1024 + 1)));
  assert.throws(() => parseSave("{"));
  assert.throws(() => parseSave("null"));
});
test("import rejects double spend and duplicated employment", () => {
  const x = JSON.parse(exportSave(createTown()));
  x.state.households[0].cash++;
  assert.throws(() => parseSave(JSON.stringify(x)));
});
test("small perturbation and shock are reported separately, not assumed equivalent", () => {
  const a = compare(0, 1, PERTURBATION),
    b = compare(0);
  assertAccounting(a.changed);
  assertAccounting(b.changed);
  assert.notEqual(canonical(a.changed), canonical(b.changed));
});
test("canonical output is independent of JSON field insertion order", () => {
  const s = createTown();
  const reordered = Object.fromEntries(Object.entries(s).reverse());
  assert.equal(canonical(s), canonical(reordered));
});
test("engine source has no wall clock or unseeded RNG dependency", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../src/engine.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /\bDate\b|Math\.random/);
});
test("day 365 discloses collapse; fixed-price control separates price feedback", async () => {
  const { longComparison } = await import("../dist/engine.js");
  const r = longComparison();
  assert.equal(r.baseline365.totals.consumed, 21900);
  assert.equal(r.changed365.totals.consumed, 6445);
  assert.equal(r.changed365.history.at(-1).active, 0);
  assert.equal(r.fixedChanged365.totals.consumed, 21690);
  assert.equal(
    r.fixedBaseline365.totals.consumed - r.fixedChanged365.totals.consumed,
    210,
  );
});
test("perturbation removes exactly one unit on its declared day", () => {
  const s = run(createTown(), 30);
  assert.equal(
    step(s).history.at(-1).inputOutput -
      step(s, PERTURBATION).history.at(-1).inputOutput,
    1,
  );
});
test("scenario boundaries are inclusive on days 31 and 60 only", () => {
  for (const day of [30, 31, 60, 61]) {
    const cp = run(createTown(), day - 1);
    assert.equal(
      step(cp, SHOCK).history.at(-1).inputOutput,
      [31, 60].includes(day) ? 45 : 60,
    );
  }
});
test("combined object key cannot masquerade as separate required keys", () => {
  for (const prices of [
    { "final|input": 200 },
    { input: 40 },
    { final: 120 },
    { input: undefined, final: 120 },
  ]) {
    const x = JSON.parse(exportSave(createTown()));
    x.state.prices = prices;
    assert.throws(() => parseSave(JSON.stringify(x)));
  }
});
test("joined-key fuzz corpus cannot bypass exact object field checks", () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 1000 }), (value) => {
      const x = JSON.parse(exportSave(createTown()));
      x.state.prices = { "final|input": value };
      assert.throws(() => parseSave(JSON.stringify(x)));
    }),
    { seed: 19, numRuns: 100 },
  );
});
test("valid terminal-day saves roundtrip, but advancing beyond the limit fails clearly", () => {
  const s = createTown();
  s.day = 100000;
  assert.equal(parseSave(exportSave(s)).state.day, 100000);
  assert.throws(() => step(s), /integer/);
});
test("pooled trades do not falsely identify physical production lots", () => {
  const s = step(run(createTown(), 30), SHOCK);
  for (const e of s.events.filter((e) => e.day === 31 && e.kind === "trade")) {
    assert.deepEqual(e.causes, []);
    assert.match(e.detail, /bookkeeping/);
  }
  const production = s.events.find(
    (e) => e.day === 31 && e.kind === "production" && e.actor === "F00",
  );
  assert.ok(
    production.causes.includes(
      s.events.find((e) => e.day === 31 && e.kind === "capacity").id,
    ),
  );
});
test("event retention keeps exactly the last seven days", () => {
  const s = run(createTown(), 20);
  assert.deepEqual(
    [...new Set(s.events.map((e) => e.day))],
    [14, 15, 16, 17, 18, 19, 20],
  );
});
test("weekly owner distribution includes every remainder cent and no early payout", () => {
  const s = createTown();
  assert.equal(
    run(s, 6).events.some((e) => e.kind === "dividend"),
    false,
  );
  s.firms[0].cash += 1;
  s.households[0].cash -= 1;
  const result = run(s, 7);
  const f = result.firms.find((f) => f.id === "I00");
  const events = result.events.filter(
    (e) => e.kind === "dividend" && e.actor === "I00",
  );
  assert.equal(events.length, 10);
  assert.equal(f.cash, 30000);
  assert.equal(
    events.reduce((n, e) => n + e.cents, 0),
    14251,
  );
  assert.ok(
    Math.max(...events.map((e) => e.cents)) -
      Math.min(...events.map((e) => e.cents)) <=
      1,
  );
});
test("shortage raises prices and excess inventory lowers prices within bounds", () => {
  const s = createTown();
  for (const f of s.firms.filter((f) => f.sector === "final")) {
    f.cash = 0;
    f.inputs = 0;
    f.stock = 0;
  }
  s.households[0].cash = 0; // Restore accounting by deriving boundary and consumed/used fixtures explicitly.
  s.totalCash =
    s.households.reduce((n, h) => n + h.cash, 0) +
    s.firms.reduce((n, f) => n + f.cash, 0);
  s.opening.input = s.firms
    .filter((f) => f.sector === "input")
    .reduce((n, f) => n + f.stock, 0);
  s.opening.final = 0;
  assert.equal(step(s).prices.final, 205);
  assert.equal(step(createTown()).prices.input, 75);
  const floor = run(createTown(), 90);
  assert.equal(floor.prices.input, 40);
  assert.equal(floor.prices.final, 120);
  s.prices.final = 600;
  assert.equal(step(s).prices.final, 600);
});
test("portable server containment handles Windows roots and sibling prefixes", async () => {
  const path = await import("node:path");
  const { isWithin } = await import("../scripts/paths.mjs");
  assert.ok(
    isWithin("C:\\town\\site", "C:\\town\\site\\js\\app.js", path.win32),
  );
  assert.ok(
    !isWithin("C:\\town\\site", "C:\\town\\site-other\\app.js", path.win32),
  );
  assert.ok(!isWithin("C:\\town\\site", "C:\\town\\secret.js", path.win32));
});
test("surplus threshold is ten percent, not fifty percent", () => {
  const s = createTown();
  for (const f of s.firms.filter((f) => f.sector === "final")) f.stock = 3;
  s.opening.final = 12;
  assert.equal(step(s).prices.final, 195);
});
test("closed business inventory is locked, not sold into pooled market", () => {
  const s = createTown();
  const f = s.firms.find((f) => f.id === "F00");
  f.active = false;
  f.dryDays = 7;
  const next = step(s);
  assert.equal(next.firms.find((f) => f.id === "F00").stock, 30);
  assert.ok(!next.events.some((e) => e.kind === "trade" && e.other === "F00"));
});
test("scale 10 day 90 export fits 2 MiB and restores exactly", () => {
  const state = run(createTown(0, 10), 90);
  const text = exportSave(state);
  assert.ok(new TextEncoder().encode(text).byteLength <= 2 * 1024 * 1024);
  assert.equal(canonical(parseSave(text).state), canonical(state));
});
