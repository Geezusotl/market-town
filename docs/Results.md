# Validation results for prototype 0.2

Measured locally November 2, 2026 after the independent review. This revision has not yet received independent re-review.

* 41 Node tests pass with the real pinned fast-check dependency under Node v24.22.1.
* 3 accounting fault injections and 12 economic-rule mutations are detected. This is a selected mutation set, not a comprehensive score.
* Chromium and Firefox pass 3 tests each, including engine equality, save restore, narrow viewport layout, cancellation, read/invalid-message interleavings, and validated replacement comparisons.
* WebKit is not verified. Its earlier host-library blocker remains open; it was not counted as passing in this revision. Native Windows and real phone hardware are unverified.
* A fresh local directory without node_modules, dist, site or evidence passed npm ci, npm test, accounting mutations, comparison generation and benchmarks. Remote CI has not run.
* 60-household headless throughput across five 90-day repeats: 3113..3972 days/second; 600 households: 145..170. Shared Linux container on AMD EPYC 9V74 80-Core Processor; not a public-service or real-phone benchmark.
* 600-household day-90 save: 1,903,363 UTF-8 bytes, below 2 MiB, with exact roundtrip verified. The cap still applies to every export/import; this does not guarantee every possible state fits.

| Pricing after shared day 30 | Baseline day 90 | Shock day 90 | Baseline day 365 | Shock day 365 | Firms open in shock at day 365 |
| --- | --- | --- | --- | --- | --- |
| Adaptive rule | 5,400 | 5,190 | 21,900 | 6,445 | 0 |
| Fixed-price control | Not used as a separate headline | Not used as a separate headline | 21,900 | 21,690 | 6 |

All 30 allocation seeds give the same aggregate trajectories. The report explicitly states this cannot estimate aggregate uncertainty. The one-unit perturbation is now correctly sized but is absorbed by buffers, so no aggregate effect is forced. The day-90 difference is an inventory-buffer result; the much larger later loss exposes sensitivity to the price/closure rules, not validated economic behavior.

No service activation, GitHub write, public deployment or claim of a production-ready economy.


## Interactive interface, November 3

The map, household finances, branch selection, deterministic replay, play/pause, one/five-day playback, and viewed-state export are implemented. Current checks: 41 Node tests pass; 8 Chromium/Firefox tests pass. The first browser run had a five-second Firefox initial-readiness timeout; the rerun uses a separate 15-second readiness wait. The 100 ms worker response target is unchanged. Initial and final logs are retained. WebKit remains unverified. Earlier headless benchmarks and economic mutation results describe the unchanged 0.2 economic rules; they were not rerun as interface benchmarks. No repository or public deployment exists yet. Further external review is an optional broad milestone check, not a required relay step now.
