import { mkdir } from "node:fs/promises";
await mkdir("evidence", { recursive: true });
import { performance } from "node:perf_hooks";
import os from "node:os";
import { writeFile } from "node:fs/promises";
import { createTown, run } from "../dist/engine.js";
run(createTown(), 90);
const measurements = [];
for (const scale of [1, 10])
  for (let repeat = 0; repeat < 5; repeat++) {
    const start = performance.now();
    const s = run(createTown(repeat, scale), 90);
    const ms = performance.now() - start;
    measurements.push({
      scale,
      households: s.households.length,
      repeat,
      days: 90,
      ms,
      daysPerSecond: 90000 / ms,
      stateBytes: Buffer.byteLength(JSON.stringify(s)),
      retainedEvents: s.events.length,
    });
  }
const report = {
  date: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  cpu: os.cpus()[0]?.model,
  logicalCpus: os.cpus().length,
  memoryNote:
    "State JSON size is not heap usage. Environment is a shared container, not a user laptop.",
  heapUsedAfterRuns: process.memoryUsage().heapUsed,
  measurements,
};
await writeFile("evidence/Benchmark.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
