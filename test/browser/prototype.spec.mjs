import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { compare, canonical } from "../../dist/engine.js";
await mkdir("evidence", { recursive: true });
test("Node/browser engine and worker agree; inspection, export and rejection work", async ({
  page,
  browserName,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#status")).toContainText("Day 365 reached");
  await expect(page.locator("#baseline-count")).toHaveText("5,400");
  await expect(page.locator("#year-warning")).toContainText("Non-recovering");
  await expect(page.locator("#year-changed")).toHaveText("6,445");
  await expect(page.locator("#year-fixed")).toHaveText("21,690");
  const hash = await page.evaluate(async () => {
    const { compare, canonical } = await import("/js/engine.js");
    const bytes = new TextEncoder().encode(canonical(compare(0).changed));
    return Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    )
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
  });
  expect(hash).toBe(
    createHash("sha256")
      .update(canonical(compare(0).changed))
      .digest("hex"),
  );
  await page.locator("#onset").click();
  await expect(page.locator("#firm-info")).toContainText("Day 31");
  await expect(page.locator("#events")).toContainText("capacity");
  await page.locator("#firm").selectOption("F00");
  await expect(page.locator("#events")).toContainText(
    "Recorded inputs and market conditions",
  );
  const dl = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await dl;
  const path = await download.path();
  await page.locator("#import").setInputFiles(path);
  await expect(page.locator("#save-status")).toContainText("Restored day 31");
  await page.locator("#import").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"format":"bad"}'),
  });
  await expect(page.locator("#save-status")).not.toContainText("Restored");
  await expect(page.locator("#save-status")).not.toBeEmpty();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `evidence/${browserName}-mobile.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("worker reports invalid input, stays responsive and cancels bounded work", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  await expect(page.locator("#status")).toContainText("Day 365 reached");
  const result = await page.evaluate(async () => {
    const w = new Worker("/js/worker.js", { type: "module" });
    let id = 0;
    const waiting = new Map();
    w.onmessage = (e) => {
      waiting.get(e.data.id)?.(e.data);
      waiting.delete(e.data.id);
    };
    const ask = (action, data = {}) =>
      new Promise((resolve) => {
        const key = ++id;
        waiting.set(key, resolve);
        w.postMessage({ id: key, action, ...data });
      });
    const start = performance.now();
    await ask("init", { seed: 0 });
    const startup = performance.now() - start;
    const bad = await ask("step", { days: 99 });
    const rounds = [];
    for (let i = 0; i < 30; i++) {
      const t = performance.now();
      await ask("step", { days: 1 });
      rounds.push(performance.now() - t);
    }
    const zero = performance.now();
    const comparing = ask("compare", { seed: 0, scale: 10 });
    const cancel = await ask("cancel");
    const cancelled = await comparing;
    const cancelMs = performance.now() - zero;
    w.terminate();
    rounds.sort((a, b) => a - b);
    return {
      startup,
      bad,
      cancel,
      cancelled,
      cancelMs,
      roundTripMs: rounds,
      p95: rounds[Math.ceil(rounds.length * 0.95) - 1],
      browser: navigator.userAgent,
    };
  });
  expect(result.bad.ok).toBe(false);
  expect(result.cancel.cancelled).toBe(true);
  expect(result.cancelled.error).toBe("Cancelled");
  expect(result.p95).toBeLessThan(100);
  await writeFile(
    `evidence/Worker-${browserName}.json`,
    JSON.stringify(result, null, 2),
  );
});
test("read and invalid requests do not cancel comparison; validated new writes do", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#status")).toContainText("Day 365 reached");
  const results = await page.evaluate(async () => {
    const w = new Worker("/js/worker.js", { type: "module" });
    let id = 0;
    const waiting = new Map();
    w.onmessage = (e) => {
      waiting.get(e.data.id)?.(e.data);
      waiting.delete(e.data.id);
    };
    const ask = (action, data = {}) =>
      new Promise((resolve) => {
        const key = ++id;
        waiting.set(key, resolve);
        w.postMessage({ id: key, action, ...data });
      });
    await ask("init");
    const first = ask("compare");
    const exported = await ask("export");
    const invalid = await ask("import", { text: "{" });
    const unknown = await ask("nonsense");
    const invalidCompare = await ask("compare", { seed: -1 });
    const completed = await first;
    const old = ask("compare");
    const replacement = ask("compare", { seed: 3 });
    const cancelled = await old;
    const newer = await replacement;
    w.terminate();
    return {
      exported: exported.ok,
      invalid: invalid.ok,
      unknown: unknown.ok,
      invalidCompare: invalidCompare.ok,
      completed: completed.ok,
      day: completed.changed365?.day,
      cancelled: cancelled.error,
      newer: newer.ok,
    };
  });
  expect(results).toEqual({
    exported: true,
    invalid: false,
    unknown: false,
    invalidCompare: false,
    completed: true,
    day: 365,
    cancelled: "Cancelled",
    newer: true,
  });
});
test("interactive town replays branches, inspects households and exports the viewed day", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#status")).toContainText("Day 365 reached");
  await expect(page.locator("#town-map button")).toHaveCount(6);
  await page.locator("#onset").click();
  await expect(page.locator("#town-day")).toContainText("Day 31");
  await page.locator('[data-firm="F01"]').click();
  await expect(page.locator("#firm-info"))
    .toContainText("F01")
    .catch(async () => {
      await expect(page.locator("#event-heading")).toContainText("F01");
    });
  await page.locator("#household").selectOption("H030");
  await expect(page.locator("#household-info")).toContainText("H030");
  await page.locator("#day").fill("0");
  await page.locator("#day").dispatchEvent("input");
  await expect(page.locator("#town-day")).toContainText("Day 0 ·");
  await page.locator("#advance").click();
  await expect(page.locator("#town-day")).toContainText("Day 1 ·");
  await page.locator("#play").click();
  await expect(page.locator("#town-day")).not.toContainText("Day 1 ·");
  await page.locator("#play").click();
  await expect(page.locator("#play")).toHaveText("Play");
  await page.locator("#day").fill("365");
  await page.locator("#day").dispatchEvent("input");
  await expect(page.locator("#town-day")).toContainText("Day 365");
  await page.locator("#branch").selectOption("baseline");
  await expect(page.locator("#town-map .closed")).toHaveCount(0);
  await expect(page.locator("#town-day")).toContainText("60 goods");
  const downloadEvent = page.waitForEvent("download");
  await page.locator("#export").click();
  const dl = await downloadEvent;
  const { readFile } = await import("node:fs/promises");
  const saved = JSON.parse(await readFile(await dl.path(), "utf8"));
  expect(saved.state.day).toBe(365);
  expect(saved.state.totals.consumed).toBe(21900);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
