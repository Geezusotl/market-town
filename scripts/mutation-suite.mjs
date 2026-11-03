import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
await mkdir("evidence", { recursive: true });
const source = await readFile("dist/engine.js", "utf8"),
  suite = await readFile("test/engine.test.mjs", "utf8");
const mutants = [
  ["shortage lowers price", "m.demand > m.sold ? 5", "m.demand > m.sold ? -5"],
  ["prices never move", "s.prices[sector] + delta", "s.prices[sector]"],
  ["surplus threshold 50 percent", "div(m.sold, 10)", "div(m.sold, 2)"],
  ["shock ends one day early", "s.day <= scenario.end", "s.day < scenario.end"],
  ["dividends never paid", "if (s.day % 7 === 0)", "if (false)"],
  ["dividend remainder omitted", "add(base, remainders.get(id) ?? 0)", "base"],
  [
    "capacity condition loses record",
    'emit("capacity", f.id, "", capacity, 0, [], `Capacity ${f.capacity} → ${capacity}`)',
    '"missing-capacity"',
  ],
  [
    "event retention two days",
    "safelySubtract(previous.day, 6)",
    "safelySubtract(previous.day, 1)",
  ],
  [
    "closed firms sell stock",
    "f.active && f.sector === sector && f.stock > 0",
    "f.sector === sector && f.stock > 0",
  ],
  ["closure delayed", "f.dryDays >= 7", "f.dryDays >= 8"],
  ["history shortened", "s.history.slice(-180)", "s.history.slice(-90)"],
  [
    "price floor below unit cost",
    'min = sector === "input" ? 40 : 120',
    'min = sector === "input" ? 40 : 100',
  ],
];
const results = [];
for (const [name, from, to] of mutants) {
  if (!source.includes(from))
    throw new Error("Mutation target missing: " + name);
  const file = "dist/review-mutant.js",
    testFile = "test/review-mutant-suite.mjs";
  try {
    await writeFile(file, source.replace(from, to));
    await writeFile(
      testFile,
      suite.replaceAll("../dist/engine.js", "../dist/review-mutant.js"),
    );
    const run = spawnSync(process.execPath, ["--test", testFile], {
      encoding: "utf8",
      timeout: 30000,
    });
    const detected = run.status !== 0 && !run.error;
    results.push({
      name,
      detected,
      status: run.status,
      timeout: !!run.error,
      failureSummary: run.stdout
        .split("\n")
        .filter((l) => l.includes("✖") || /fail \d/.test(l))
        .slice(0, 8),
    });
  } finally {
    await unlink(file).catch(() => {});
    await unlink(testFile).catch(() => {});
  }
}
await writeFile(
  "evidence/RuleMutationChecks.json",
  JSON.stringify(results, null, 2),
);
console.log(results.map((r) => ({ name: r.name, detected: r.detected })));
if (results.some((r) => !r.detected)) process.exitCode = 1;
