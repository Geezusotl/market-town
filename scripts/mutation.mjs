import { mkdir } from "node:fs/promises";
await mkdir("evidence", { recursive: true });
import { readFile, writeFile, unlink } from "node:fs/promises";
const source = await readFile("dist/engine.js", "utf8");
const mutations = [
  ["cash creation", "payee.cash = b;", "payee.cash = add(b, 1);"],
  ["stock duplicated", "f.stock = sub(f.stock, q);", "f.stock = f.stock;"],
  [
    "recipe accounting skipped",
    "s.totals.inputsUsed = add(s.totals.inputsUsed, q);",
    "s.totals.inputsUsed = s.totals.inputsUsed;",
  ],
];
const results = [];
for (const [name, from, to] of mutations) {
  if (!source.includes(from))
    throw new Error("Mutation target missing: " + name);
  const file = `dist/mutant-${results.length}.js`;
  try {
    await writeFile(file, source.replace(from, to));
    const m = await import("../" + file + "?" + results.length);
    let detected = false,
      message = "";
    try {
      m.run(m.createTown(), 2);
    } catch (e) {
      detected = true;
      message = e.message;
    }
    results.push({ name, detected, message });
  } finally {
    await unlink(file).catch(() => {});
  }
}
await writeFile(
  "evidence/MutationChecks.json",
  JSON.stringify(results, null, 2),
);
console.log(results);
if (results.some((r) => !r.detected)) process.exitCode = 1;
