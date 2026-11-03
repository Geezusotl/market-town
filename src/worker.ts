import {
  createTown,
  step,
  integer,
  SHOCK,
  validateScenario,
  type State,
  type Scenario,
} from "./engine.js";
import { parseSave, exportSave } from "./save.js";
let state: State = createTown(),
  scenario: Scenario | undefined,
  generation = 0;
const scope = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: (value: unknown) => void;
};
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
scope.onmessage = async (e) => {
  const m = e.data,
    id = m?.id,
    reply = (body: object) => scope.postMessage({ id, ...body });
  try {
    if (!m || !Number.isSafeInteger(id)) throw new Error("Invalid request");
    if (m.action === "cancel") {
      generation++;
      reply({ ok: true, cancelled: true });
      return;
    }
    // Reads and invalid requests never invalidate in-flight work. Validate writes before superseding it.
    if (m.action === "export") {
      reply({ ok: true, text: exportSave(state, scenario) });
      return;
    }
    if (m.action === "init") {
      const next = createTown(m.seed ?? 0, m.scale ?? 1);
      generation++;
      state = next;
      scenario = undefined;
      reply({ ok: true, state });
      return;
    }
    if (m.action === "import") {
      const parsed = parseSave(m.text);
      generation++;
      state = parsed.state;
      scenario = parsed.scenario;
      reply({ ok: true, state });
      return;
    }
    if (m.action === "step") {
      integer(m.days, 5);
      const nextScenario =
        m.scenario === null ? undefined : (m.scenario ?? scenario);
      validateScenario(nextScenario, state);
      let next = state;
      for (let i = 0; i < m.days; i++) next = step(next, nextScenario);
      generation++;
      state = next;
      scenario = nextScenario;
      reply({ ok: true, state });
      return;
    }
    if (m.action === "replay") {
      integer(m.day, 365);
      if (m.branch !== "baseline" && m.branch !== "changed")
        throw new Error("Invalid branch");
      let next = createTown(m.seed ?? 0);
      const input = m.branch === "changed" ? SHOCK : undefined;
      const token = ++generation;
      for (let i = 0; i < m.day; i++) {
        next = step(next, input);
        if (i % 5 === 4) {
          await pause();
          if (token !== generation) throw new Error("Cancelled");
        }
      }
      if (token !== generation) throw new Error("Cancelled");
      state = next;
      scenario = input;
      reply({ ok: true, state });
      return;
    }
    if (m.action !== "compare") throw new Error("Unknown action");
    let base = createTown(m.seed ?? 0, m.scale ?? 1);
    const shock = m.scenario ?? SHOCK;
    validateScenario(shock, base);
    const token = ++generation;
    const advance = async (initial: State, days: number, input?: Scenario) => {
      let next = initial;
      for (let i = 0; i < days; i++) {
        next = step(next, input);
        if (i % 5 === 4) {
          await pause();
          if (token !== generation) throw new Error("Cancelled");
        }
      }
      return next;
    };
    base = await advance(base, 30);
    const checkpoint = base;
    const baseline = await advance(base, 60),
      changed = await advance(base, 60, shock);
    const baseline365 = await advance(baseline, 275),
      changed365 = await advance(changed, 275, shock);
    const fixed = { ...shock, pricing: "fixed" as const };
    const fixedBaseline365 = await advance(checkpoint, 335, {
        ...fixed,
        reductionBps: 0,
      }),
      fixedChanged365 = await advance(checkpoint, 335, fixed);
    if (token !== generation) throw new Error("Cancelled");
    state = changed365;
    scenario = shock;
    reply({
      ok: true,
      baseline,
      changed,
      checkpoint,
      baseline365,
      changed365,
      fixedBaseline365,
      fixedChanged365,
    });
  } catch (error) {
    reply({
      ok: false,
      error: error instanceof Error ? error.message : "Worker failure",
    });
  }
};
