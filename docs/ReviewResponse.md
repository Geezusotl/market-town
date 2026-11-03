# Response to independent code review, prototype 0.2

The supplied review examined snapshot f7063039ca755bc77bfd768ac7f83df414b2c30efd7024976b05fa22dbb22a2f. Its reviewer reported executed probes but used a replacement for fast-check and Node 22. Here, regressions run against the actual pinned fast-check dependency under Node 24. Reviewer findings are evidence to investigate, not automatically accepted facts.

## F1: hidden long-horizon collapse

Confirmed independently: baseline consumes 21,900 goods by day 365; adaptive-price shock consumes 6,445 and all firms close. We have not silently changed the economics to make that outcome disappear. The worker and viewer now execute and display both day 90 and day 365. The default scenario is visibly labeled non-recovering under its no-entry rules. A fixed-price control freezes both branches at the shared day 30 prices: its baseline consumes 21,900, disrupted branch 21,690, with six firms still open. The experiment exposes sensitivity to price feedback and closure assumptions; it does not establish those assumptions as realistic. Long-horizon regression results and control columns are mandatory in the command-line report.

Status: misleading short-horizon presentation fixed; pricing dynamics remain an explicit unvalidated model assumption. This is not a validated autonomous market model or a production release.

## F2: seeds and perturbation

The bps rounding defect is confirmed: 334 bps reduces 30 units to 28, not 29. Changed to 333 bps and added an exact one-unit regression. The small perturbation still has no aggregate consumption effect because buffers absorb it. We reject requiring a placebo to produce nonzero aggregate effects by construction: that would manufacture sensitivity rather than measure it. Seeds currently alter allocation ties only. The report detects aggregate invariance and states it cannot estimate aggregate uncertainty; the viewer uses the term allocation seed. No zero spread is presented as statistical significance. Meaningful heterogeneous behavior can be designed in a later model version, with its own specification, rather than added simply to satisfy a variance test.

Status: perturbation fixed and statistical framing corrected. No claim of an aggregate noise estimate.

## F3: buffer arithmetic

Confirmed: the day 90 difference is accounted for by lost input supply and initial stock buffers. The viewer labels this as a short-run inventory result, rather than emergent market behavior. The fixed-price day 365 control pins the 210 unit loss. The adaptive-price result is displayed beside it, making later amplification visible.

Status: framing and control added; the simple model is intentionally not more sophisticated than its rules.

## F4: malformed saves

Confirmed joined-key collision: prices with a single field named final|input were accepted. Replaced delimiter-based field checking with exact required/allowed key membership checks and explicit safe-integer price validation. Added direct missing-field negatives and generated joined-key cases. Unsupported rules versions are rejected; this change increments rules/save format to market-town/0.2.

Qualification: a missing ordinary price field was already rejected unless the combined-key collision was used. Day 100000 is the documented inclusive simulation limit, not a malformed state. A terminal-day save remains valid; advancing it fails clearly. We test both behaviors rather than reject valid terminal checkpoints. Saves are validated sandbox state, not authenticated proof of reachability from a seed.

Status: validator defect fixed; terminal behavior explicitly tested.

## F5: provenance and pooled markets

Confirmed that buyer-to-seller matching is deterministic bookkeeping. Buyers and sellers receive batch allocations; matching does not trace physical lots. Trade records now say pooled market and carry no false production-lot cause pointers. Production records retain relevant purchases and capacity conditions; the inspector labels these as recorded inputs and market conditions. Tests verify that pooled trades do not claim physical production attribution and that capacity conditions remain recorded.

Status: pooled semantics explicit. Exact physical lot tracking remains outside scope.

## F6: worker over-cancellation

Confirmed. Export no longer changes the generation; malformed or unsupported requests do not supersede work. Each write is validated before it invalidates in-flight comparisons. A valid replacement compare, import, init, step, or explicit cancel supersedes prior work. Added real browser interleavings for export, invalid import, unsupported action, invalid compare and replacement compare. The older valid compare is cancelled only when a newer validated write or explicit cancel supersedes it.

Status: fixed with browser regression coverage.

## F7: packaging, Windows paths and evidence

Scripts now create their own evidence directory. A clean-install check starts without node_modules, dist, site or evidence, runs npm ci, then tests, targeted mutations, comparisons and benchmarks. The validation result is recorded separately; this is local, not remotely run CI. Server containment uses path.relative, with Windows drive and sibling-prefix tests. These tests use win32 path semantics on Linux; native Windows execution remains unverified. The revised snapshot manifest covers source, compiled viewer, and evidence; it does not assert that historical line numbers are stable. CI is supplied for a clean Ubuntu runner but has not run remotely.

Status: defects fixed and evidence scope made explicit.

## Test gaps closed

Pricing direction, bounds and surplus threshold; weekly distributions and remainder cents; inclusive shock endpoints; exact event retention; pooled market labels and recorded capacity conditions; joined-key imports; terminal saves; 600 household save size/roundtrip; worker interleavings; Windows containment semantics; and a clean local install are now covered. A targeted rule-mutation suite exercises twelve changes in addition to three accounting injections. This is selected fault injection, not an exhaustive mutation score and not a direct score comparison with the reviewer's fifteen mutants. The old trade-production pointer mutant is obsolete because those false lot links were intentionally removed.

## Remaining limitations

WebKit still requires verification on a suitable host. Actual Windows browser execution, real phone performance, independent re-review of this revision, remote CI, public deployment and persistent-world behavior are pending. Aggregate seeds are not an uncertainty ensemble. Prices and closures are model assumptions, not calibrated economics. No services or repository content were changed by this revision.

## Requested follow-up review

Please verify F1 through F7 against the revised source and evidence. Prioritize the long-horizon display, fixed-price control, parser boundary, pooled-market semantics and concurrent worker requests. Distinguish a disclosed modeling choice from an implementation defect. Report concrete remaining counterexamples and new regressions. Do not approve merely because the author reports tests passing, and state exactly what you execute.
