# Market Town

[![Prototype checks](https://github.com/Geezusotl/market-town/actions/workflows/checks.yml/badge.svg)](https://github.com/Geezusotl/market-town/actions/workflows/checks.yml)

A small closed economy you can inspect. Clone the same town, interrupt one supplier, and compare what households consume. The prototype runs a real deterministic TypeScript engine in a browser worker; it does not call a language model.

**Status: interactive prototype.** Source is hosted on GitHub; public Pages deployment is configured separately. An unattended public service is future work. The detailed town map, dynamic hiring, new businesses and public world persistence are future work.

## Run locally

Install Node 24 or later, then from this directory:

```sh
npm ci
npm run build
npm run serve
```

Open http://127.0.0.1:4173. The `site` folder is a complete static build. It needs HTTP serving for ES modules and workers; opening index.html with file:// is not supported.

The interface adds a schematic six-business map, individual household finances, branch selection, play/pause, one/five-day playback, and deterministic timeline replay through day 365. Selecting a business opens its books. Export follows the current worker state; timeline replay is explicitly disabled after importing arbitrary saves until a new comparison is run.

The viewer shows the first 90 days as a chart and compares full-year totals through day 365, including fixed-price controls. Business inspection offers the onset at day 31 or the ending day 365. Pooled trade matching is bookkeeping, not physical lot tracing. Export or restore the disrupted state. Restore updates the inspector and export state; the completed comparison chart remains explicitly labeled as the last experiment.

## Verify

```sh
npm test
node scripts/mutation.mjs
npm run compare
npm run bench
node scripts/mutation-suite.mjs
node scripts/clean-check.mjs
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

The browser installation command may need administrator privileges on Linux. Automated workflows are supplied but have not run remotely. GitHub Actions verified all 12 browser checks across Chromium, Firefox and WebKit on November 3, 2026. The earlier local WebKit library limitation is resolved by that clean runner. The Playwright version is pinned to the browser build successfully downloaded here, not claimed as the newest version.

See docs/Rules.md for the model, docs/ReviewStatus.md for findings and limitations, and evidence/ for actual outputs. `scripts/compare.mjs` always uses allocation seeds 0..29 and reports day 90 and day 365, fixed-price controls, and the small perturbation. Invariant aggregates are explicitly not an aggregate uncertainty estimate. `scripts/mutation.mjs` injects three explicit accounting defects into temporary compiled modules and checks that reconciliation fails; it is targeted fault injection, not an exhaustive mutation score.

## Reading the results

At seed 0, by day 90 the unchanged town consumes 5,400 goods and the disrupted town 5,190. By day 365 the baseline consumes 21,900 and the adaptive-price shock branch only 6,445, with every business closed. The viewer explicitly labels this non-recovering under the no-entry rules. Holding the shared day 30 prices fixed yields 21,690 under the shock versus 21,900 without it. Each of the 30 predetermined allocation seeds has the same aggregate trajectory in this deliberately homogeneous model; this cannot estimate aggregate uncertainty. Allocations across individual households vary. The small perturbation has no aggregate effect in that window. These are model outcomes, not predictions or calibrated economic findings.

The initial price floor was corrected during implementation because it put baseline sales below full output unit cost. No seeds were selected to obtain preferred results. Both fixed rules and their amendment are recorded.

## Boundaries

Workers also own their firm. Workers do not change employers. Insolvent firms close after seven consecutive missed payrolls; assets are locked, with no liquidation or new entry. Capacity is firm based; staffing is fixed. Prices are uniform within a sector. No taxes, banks, loans or external money flows. These assumptions strongly affect the outcome.

All economic state is safe integer cents or units, with checked intermediate arithmetic. Keyed tie ranking is deterministic FNV-1a, not cryptographic randomness. Saves are capped at 2 MB, use an exact rules version, and are untrusted sandbox inputs, not authenticated evidence of a historical world. Version 0.1 saves are explicitly rejected because these rules use format 0.2. Day 100000 is a valid terminal save but cannot advance further. They are validated structurally and against accounting invariants; we do not prove that every imported state could be reached from its claimed seed. Oversized stress scale saves can be rejected by the same 2 MB limit.

Recent history retains 180 metrics and seven days of events. Direct links outside that window are shown as unavailable, not fabricated. Reproduction uses the fixed engine version, seed and scenario; the standard experiment supports deterministic timeline replay through day 365. Charts and numbers are calculated from the engine; visual styling is a minimal experiment notebook, not the final town.

No service accounts or API keys are required. No user files are uploaded by the application.

## Account setup

Only the existing GitHub account is needed for the browser release. See [the setup guide](docs/MarketTownSetup.md). Enable Pages with GitHub Actions after the deployment workflow is uploaded. Hosting, database and model API accounts are not needed for this browser stage. Broad independent review remains optional at major milestones, not a prerequisite for each development step.
