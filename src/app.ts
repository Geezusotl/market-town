import type { State } from "./engine.js";
const worker = new Worker(new URL("./worker.js", import.meta.url), {
  type: "module",
});
let request = 0;
const pending = new Map<
  number,
  { resolve: (v: any) => void; reject: (e: Error) => void }
>();
function ask(action: string, data: object = {}): Promise<any> {
  const id = ++request;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, action, ...data });
  });
}
worker.onmessage = (e) => {
  const p = pending.get(e.data.id);
  if (!p) return;
  pending.delete(e.data.id);
  e.data.ok ? p.resolve(e.data) : p.reject(new Error(e.data.error));
};
worker.onerror = () => {
  for (const p of pending.values())
    p.reject(new Error("Simulation worker failed. Reload to recover."));
  pending.clear();
  text("status", "Simulation worker failed. Reload to recover.");
};
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const text = (id: string, value: string) => {
  el(id).textContent = value;
};
let baseline: State | undefined,
  changed: State | undefined,
  shown: State | undefined,
  checkpoint: State | undefined,
  baseline365: State | undefined,
  changed365: State | undefined,
  fixedBaseline365: State | undefined,
  fixedChanged365: State | undefined;
const fmt = (n: number) => n.toLocaleString("en-US");
function draw() {
  if (!baseline || !changed) return;
  const svg = el<HTMLElement>("chart");
  svg.replaceChildren();
  const ns = "http://www.w3.org/2000/svg";
  const add = (tag: string, attrs: Record<string, string>, label?: string) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (label) n.textContent = label;
    svg.append(n);
    return n;
  };
  const x = (d: number) => 45 + ((d - 1) * 820) / 89,
    y = (v: number) => 205 - (v * 160) / baseline!.households.length;
  add("rect", {
    x: String(x(31)),
    y: "25",
    width: String(x(60) - x(31)),
    height: "180",
    fill: "#e8e7db",
  });
  for (const v of [0, 30, 60]) {
    add("line", {
      x1: "45",
      x2: "875",
      y1: String(y(v)),
      y2: String(y(v)),
      stroke: "#d6dccc",
    });
    add(
      "text",
      { x: "10", y: String(y(v) + 4), fill: "#647069", "font-size": "12" },
      String(v),
    );
  }
  for (const d of [1, 30, 60, 90])
    add(
      "text",
      { x: String(x(d)), y: "230", fill: "#647069", "font-size": "12" },
      String(d),
    );
  for (const [s, color] of [
    [baseline, "#356c84"],
    [changed, "#b45b3f"],
  ] as const)
    add("polyline", {
      points: s.history.map((m) => `${x(m.day)},${y(m.consumed)}`).join(" "),
      fill: "none",
      stroke: color,
      "stroke-width": "2.5",
    });
}
function inspect() {
  if (!shown) return;
  renderTown();
  const id = el<HTMLSelectElement>("firm").value,
    f = shown.firms.find((f) => f.id === id);
  if (!f) return;
  text(
    "firm-info",
    `Day ${shown.day} · ${f.active ? "Operating" : "Closed"} · Cash $${(f.cash / 100).toFixed(2)} · Stock ${f.stock} · Inputs ${f.inputs}`,
  );
  text("event-heading", `Day ${shown.day}: ${id} and its recent activity`);
  const list = el("events");
  list.replaceChildren();
  const rows = shown.events
    .filter((e) => e.actor === id || e.other === id)
    .slice(-35)
    .reverse();
  for (const e of rows) {
    const li = document.createElement("li");
    li.textContent = `Day ${e.day} · ${e.kind} · ${e.actor}${e.other ? " → " + e.other : ""}${e.quantity ? " · " + e.quantity + " units" : ""}${e.cents ? " · $" + (e.cents / 100).toFixed(2) : ""}`;
    if (e.detail) {
      const p = document.createElement("p");
      p.textContent = e.detail;
      li.append(p);
    }
    if (e.causes.length) {
      const details = document.createElement("details"),
        summary = document.createElement("summary");
      summary.textContent = "Recorded inputs and market conditions";
      details.append(summary);
      for (const cause of e.causes) {
        const p = document.createElement("p"),
          source = shown.events.find((row) => row.id === cause);
        p.textContent = source
          ? `Day ${source.day} · ${source.kind} · ${source.actor}: ${source.detail}`
          : "Dependency outside the retained event window; replay to inspect.";
        details.append(p);
      }
      li.append(details);
    }
    list.append(li);
  }
  if (!rows.length) {
    const li = document.createElement("li");
    li.textContent = "No retained activity for this business.";
    list.append(li);
  }
}
function renderPair() {
  if (!baseline || !changed) return;
  shown = changed365 ?? changed;
  text("baseline-count", fmt(baseline.totals.consumed));
  text("changed-count", fmt(changed.totals.consumed));
  for (const [prefix, s] of [
    ["baseline", baseline],
    ["changed", changed],
  ] as const) {
    const m = s.history.at(-1)!;
    text(
      prefix + "-detail",
      `${m.active} of ${s.firms.length} firms open · ${m.employed} workers paid on day ${s.day}`,
    );
  }
  const diff = changed.totals.consumed - baseline.totals.consumed;
  text("difference", (diff > 0 ? "+" : "") + fmt(diff));
  text(
    "outcome",
    "fewer goods consumed by day 90. This short-run difference matches the inventory-buffer control; it is not evidence of emergent market behavior.",
  );
  el<HTMLSelectElement>("firm").replaceChildren(
    ...changed.firms.map((f) => {
      const o = document.createElement("option");
      o.value = f.id;
      o.textContent = `${f.sector === "input" ? "Input supplier" : "Goods producer"} ${f.id}`;
      return o;
    }),
  );
  el<HTMLSelectElement>("firm").value = "I00";
  draw();
  inspect();
  if (baseline365 && changed365 && fixedBaseline365 && fixedChanged365) {
    text("year-baseline", fmt(baseline365.totals.consumed));
    text("year-changed", fmt(changed365.totals.consumed));
    text("year-fixed", fmt(fixedChanged365.totals.consumed));
    text("year-fixed-baseline", fmt(fixedBaseline365.totals.consumed));
    const active = changed365.history.at(-1)!.active;
    text(
      "year-warning",
      active === 0
        ? "Non-recovering under these rules: all firms have closed by day 365. No new entry is modeled."
        : "Inspect the day 365 outcome alongside the short-run result.",
    );
  }
}
async function perform() {
  stopPlayback();
  setTimelineDisabled(true);
  viewGeneration++;
  el<HTMLButtonElement>("compare").disabled = true;
  text("status", "Running both branches in a background worker…");
  try {
    const seed = el<HTMLInputElement>("seed").valueAsNumber;
    const result = await ask("compare", { seed });
    baseline = result.baseline;
    changed = result.changed;
    checkpoint = result.checkpoint;
    baseline365 = result.baseline365;
    changed365 = result.changed365;
    fixedBaseline365 = result.fixedBaseline365;
    fixedChanged365 = result.fixedChanged365;
    setTimelineDisabled(false);
    replaySeed = seed;
    el<HTMLSelectElement>("branch").value = "changed";
    renderPair();
    text(
      "status",
      `Day 365 reached · allocation seed ${seed} · aggregate seed variation is not an uncertainty estimate`,
    );
  } catch (e) {
    text("status", (e as Error).message);
  } finally {
    el<HTMLButtonElement>("compare").disabled = false;
  }
}
el("controls").addEventListener("submit", (e) => {
  e.preventDefault();
  void perform();
});
el("firm").addEventListener("change", inspect);
el("cancel").addEventListener("click", () => {
  void ask("cancel").then(() =>
    text("status", "Stopped. You can run another comparison."),
  );
});
el("latest").addEventListener("click", () => {
  void replay(365);
});
el("onset").addEventListener("click", () => {
  void replay(31);
});
el("export").addEventListener("click", async () => {
  try {
    const { text: body } = await ask("export");
    const url = URL.createObjectURL(
      new Blob([body], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "MarketTownSave.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    text("save-status", "Save downloaded.");
  } catch (e) {
    text("save-status", (e as Error).message);
  }
});
el("import").addEventListener("change", async () => {
  try {
    const file = el<HTMLInputElement>("import").files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) throw new Error("Save exceeds 2 MB");
    const response = await ask("import", { text: await file.text() });
    stopPlayback();
    viewGeneration++;
    setTimelineDisabled(true);
    replaySeed = response.state.seed;
    shown = response.state;
    el<HTMLSelectElement>("firm").replaceChildren(
      ...shown!.firms.map((f) => {
        const o = document.createElement("option");
        o.value = f.id;
        o.textContent = f.id;
        return o;
      }),
    );
    inspect();
    text(
      "save-status",
      `Restored day ${shown!.day}. The comparison above remains the last completed experiment. Timeline replay is disabled for imported saves; run a new comparison to restart the standard experiment.`,
    );
  } catch (e) {
    text("save-status", (e as Error).message);
  }
});
let replaySeed = 0,
  playing = false,
  viewGeneration = 0;
function setTimelineDisabled(disabled: boolean) {
  for (const id of ["day", "branch", "play", "advance", "onset", "latest"])
    (el(id) as HTMLInputElement).disabled = disabled;
}
function stopPlayback() {
  playing = false;
  text("play", "Play");
}
function renderTown() {
  if (!shown) return;
  text(
    "town-day",
    `Day ${shown.day} · ${shown.history.at(-1)?.consumed ?? 0} goods consumed today`,
  );
  el<HTMLInputElement>("day").value = String(shown.day);
  const focused = (document.activeElement as HTMLElement)?.dataset.firm;
  const map = el("town-map");
  map.replaceChildren();
  for (const f of [...shown.firms].sort((a, b) => a.id.localeCompare(b.id))) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "place " + f.sector + (f.active ? "" : " closed");
    button.dataset.firm = f.id;
    button.setAttribute(
      "aria-label",
      `${f.sector === "input" ? "Supplier" : "Goods producer"} ${f.id}, ${f.active ? "operating" : "closed"}`,
    );
    button.setAttribute(
      "aria-pressed",
      String(el<HTMLSelectElement>("firm").value === f.id),
    );
    const roof = document.createElement("span");
    roof.className = "building";
    roof.setAttribute("aria-hidden", "true");
    roof.textContent = f.sector === "input" ? "▥" : "▤";
    const title = document.createElement("strong");
    title.textContent =
      (f.sector === "input" ? "Supplier " : "Workshop ") + f.id;
    const detail = document.createElement("span");
    detail.textContent = f.active
      ? `${f.stock} goods · $${(f.cash / 100).toFixed(0)}`
      : "Closed · assets locked";
    button.append(roof, title, detail);
    button.addEventListener("click", () => {
      el<HTMLSelectElement>("firm").value = f.id;
      inspect();
    });
    map.append(button);
    if (focused === f.id) button.focus();
  }
  const select = el<HTMLSelectElement>("household"),
    selected = select.value;
  select.replaceChildren(
    ...shown.households.map((h) => {
      const o = document.createElement("option");
      o.value = h.id;
      o.textContent = h.id;
      return o;
    }),
  );
  if (shown.households.some((h) => h.id === selected)) select.value = selected;
  renderResident();
}
function renderResident() {
  const h = shown?.households.find(
    (h) => h.id === el<HTMLSelectElement>("household").value,
  );
  if (!h) return;
  text(
    "household-info",
    `${h.id} · Works at and owns a share of ${h.employer} · Cash $${(h.cash / 100).toFixed(2)} · ${h.consumed} goods consumed in total. Employment is fixed in this model; payroll can stop when a firm closes.`,
  );
}
async function replay(day: number) {
  stopPlayback();
  const token = ++viewGeneration;
  try {
    const r = await ask("replay", {
      day,
      seed: replaySeed,
      branch: el<HTMLSelectElement>("branch").value,
    });
    if (token !== viewGeneration) return;
    shown = r.state;
    inspect();
    text("town-error", "");
  } catch (e) {
    if (token === viewGeneration) text("town-error", (e as Error).message);
  }
}
async function play() {
  if (playing) {
    stopPlayback();
    return;
  }
  const token = ++viewGeneration;
  playing = true;
  text("play", "Pause");
  try {
    while (playing && token === viewGeneration && shown && shown.day < 365) {
      const count = Math.min(
        Number(el<HTMLSelectElement>("speed").value),
        365 - shown.day,
      );
      const r = await ask("step", { days: count });
      if (token !== viewGeneration) return;
      shown = r.state;
      inspect();
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } catch (e) {
    if (token === viewGeneration) text("town-error", (e as Error).message);
  } finally {
    if (token === viewGeneration) stopPlayback();
  }
}
el("household").addEventListener("change", renderResident);
el("day").addEventListener("input", () => {
  void replay(el<HTMLInputElement>("day").valueAsNumber);
});
el("branch").addEventListener("change", () => {
  void replay(shown?.day ?? 0);
});
el("play").addEventListener("click", async () => {
  if (!playing && shown?.day === 365) await replay(0);
  void play();
});
el("advance").addEventListener("click", () => {
  void replay(Math.min(365, (shown?.day ?? 0) + 1));
});
void perform();
