# Review status, prototype 0.2

An independent LLM code review was supplied for version 0.1 and identified implementation defects and model presentation problems. The revised 0.2 implementation has not yet received independent re-review. See ReviewResponse.md for each finding, reproduction and disposition.

Current evidence: 41 real Node/fast-check tests pass; all three accounting injections are detected; twelve targeted economic-rule mutants are detected by the full test suite; six Chromium/Firefox browser tests pass, including concurrent worker requests. Fresh local npm ci, build, tests, accounting mutations, comparison report and benchmarks pass with no initial generated or evidence folders. This is not a remotely run CI result or an exhaustive mutation score.

WebKit remains unverified on this host. Windows containment is tested through Node win32 path semantics, not a native Windows browser run. Browser measurements are from a shared Linux container, not real phone hardware. No public repository, deployment or service activation occurred.

The default adaptive-price shock branch collapses by day 365 under the specified no-entry rules. The viewer explicitly displays that outcome beside day 90 and a fixed-price control. The pricing rule is not calibrated economics. Allocation seeds cannot estimate aggregate uncertainty in this homogeneous model. Trade counterparties represent pooled accounting, not physical lot provenance.

Implementation regressions cover parser exact fields, perturbation rounding, dividends, scenario endpoints, seven-day retention, pricing direction and bounds, pooled-event labels, save size and roundtrip, terminal saves, worker cancellation and Windows path semantics. Save format is now 0.2; old-format files fail clearly.

Next: return the revised review packet to the independent reviewer for targeted verification of F1..F7 before expanding the interface or publishing the project.


November 3 interface update: schematic business map, household inspection, deterministic worker replay, timeline branch controls and play/pause added. Browser regression checks now cover those controls and that exported state matches the viewed branch/day. An initial Firefox run hit the default five-second readiness wait under load; the final readiness wait is 15 seconds, separate from the unchanged 100 ms worker roundtrip target. WebKit and remote CI remain unverified. No additional external review handoff is required from the user now.
