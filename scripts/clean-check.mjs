import { mkdtemp, cp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const temp = await mkdtemp(join(tmpdir(), "market-town-clean-"));
await mkdir(join(temp, "test"), { recursive: true });
for (const file of [
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "src",
  "scripts",
  "public",
])
  await cp(file, join(temp, file), { recursive: true });
await cp("test/engine.test.mjs", join(temp, "test/engine.test.mjs"));
const runs = [];
for (const [cmd, args] of [
  ["npm", ["ci", "--no-audit", "--no-fund"]],
  ["npm", ["test"]],
  ["node", ["scripts/mutation.mjs"]],
  ["node", ["scripts/compare.mjs"]],
  ["node", ["scripts/benchmark.mjs"]],
]) {
  const r = spawnSync(cmd, args, {
    cwd: temp,
    encoding: "utf8",
    timeout: 60000,
    shell: process.platform === "win32",
  });
  runs.push({
    command: [cmd, ...args].join(" "),
    status: r.status,
    error: r.error?.message ?? null,
    output: r.stdout + r.stderr,
  });
  if (r.status !== 0) break;
}
await mkdir("evidence", { recursive: true });
await writeFile(
  "evidence/CleanCheckout.json",
  JSON.stringify(
    {
      startedWithoutEvidenceFolder: true,
      platform: process.platform,
      temporaryDirectory: temp,
      runs,
    },
    null,
    2,
  ),
);
console.log(
  runs.map(({ command, status, error }) => ({ command, status, error })),
);
if (runs.some((r) => r.status !== 0)) process.exitCode = 1;
