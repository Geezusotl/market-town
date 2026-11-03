import { mkdir, writeFile } from "node:fs/promises";
import {
  longComparison,
  compare,
  PERTURBATION,
  SHOCK,
} from "../dist/engine.js";
await mkdir("evidence", { recursive: true });
const results = [];
for (let seed = 0; seed < 30; seed++) {
  const r = longComparison(seed),
    small = compare(seed, 1, PERTURBATION).changed,
    noChange = compare(seed, 1, { ...SHOCK, reductionBps: 0 }).changed;
  results.push({
    seed,
    baseline90: r.baseline90.totals.consumed,
    shock90: r.changed90.totals.consumed,
    perturbation90: small.totals.consumed,
    noChange90: noChange.totals.consumed,
    baseline365: r.baseline365.totals.consumed,
    shock365: r.changed365.totals.consumed,
    fixedBaseline365: r.fixedBaseline365.totals.consumed,
    fixedShock365: r.fixedChanged365.totals.consumed,
    shockDifference90:
      r.changed90.totals.consumed - r.baseline90.totals.consumed,
    perturbationDifference90:
      small.totals.consumed - r.baseline90.totals.consumed,
    open365: r.changed365.history.at(-1).active,
    recoveryLabel:
      r.changed365.history.at(-1).active === 0
        ? "non-recovering under no-entry rules"
        : "inspect horizon",
  });
}
const spread = new Set(
  results.map((r) => JSON.stringify([r.shock90, r.shock365])),
).size;
const summary = {
  seeds: "0..29; seeds affect allocation only",
  controlStatus:
    spread === 1
      ? "aggregate invariant: cannot estimate aggregate uncertainty"
      : "aggregate sensitivity observed, not a real-world uncertainty estimate",
  results,
};
await writeFile("evidence/Comparisons.json", JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
