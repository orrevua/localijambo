# Jambo-Vermelho Fruiting Predictor — Spec

**Status:** Draft
**Date:** 2026-08-25
**Related:** `docs/specs/localijambo-data-model.md`, `src/types/tree.ts`, `docs/HANDOFF.md`

## Goal
Given a registered tree's observed condition, when it was observed (`updatedAt`), and today's date, deterministically estimate its current phenological stage and the day-range until it fruits / until fruit is ripe. Surface this on the tree detail screen (and optionally as a map-marker badge) so foragers know when to return. Pure functions over a fixed seasonal calendar — **no AI/ML**.

## Context & Current State
- Domain model: `src/types/tree.ts:1-19`. Relevant fields: `fruitingStatus: 'none' | 'flowering' | 'fruiting'`, `ripeness: 'unknown' | 'unripe' | 'ripening' | 'ripe' | 'overripe'`, `updatedAt: string` (ISO). Species is fixed to *Syzygium malaccense* (jambo-vermelho). Schema is **not** changed by this spec.
- Existing pure-lib + hook pattern: `src/lib/geo.ts:1-54` (named consts, a pure classifier `classifyAccuracy`, plus a React hook). Its test `src/lib/geo.test.ts:1-20` establishes Vitest style: `describe`/`it`/`expect`, boundary-focused cases.
- Tree detail screen renders a `<dl className={styles.fields}>` of `<dt>/<dd>` pairs at `src/features/tree-detail/TreeDetailScreen.tsx:101-122`; styles use design tokens (`--space-*`, `--color-crimson`, `--radius-md`) in `TreeDetailScreen.module.css`.
- Map markers built in `src/features/map/treeMarkers.ts:6-29` — a plain DOM `<button>` per tree; a badge would be a child element or background tweak here.

## Proposed Design

### Module: `src/lib/phenology.ts` (pure)
A single pure entry point `predictFruiting(tree, now)` plus named calendar/duration constants. No `Date.now()`, `new Date()` without argument, or timezone-implicit parsing inside the pure path — the caller passes `now`. Dates are reduced to **local calendar day** (year, month 1-12, day) before any arithmetic, so hemisphere/timezone concerns collapse to "use the device's local date."

### Phenology constants (Northeast Brazil, single calendar)
Months are 1-based. Windows are inclusive `[start, end]` and may wrap the year boundary (e.g. flowering Aug→Feb).

```
FLOWERING_WINDOW      = { start: 8,  end: 2  }   // Aug–Feb (peak Sep–Oct)
FLOWERING_PEAK        = { start: 9,  end: 10 }
GREEN_FRUIT_WINDOW    = { start: 10, end: 1  }   // Oct–Jan (peak Nov–Dec)
HARVEST_WINDOW        = { start: 12, end: 5  }   // Dec–May ripe (peak Jan–Feb)
HARVEST_PEAK          = { start: 1,  end: 2  }
FLOWER_TO_RIPE_MEAN   = 70   // days
FLOWER_TO_RIPE_MIN    = 60
FLOWER_TO_RIPE_MAX    = 80
STALE_THRESHOLD_DAYS  = 80   // = FLOWER_TO_RIPE_MAX; observation older than this → calendar fallback
FLOWERING_OPEN_MONTH  = 8    // month the next bloom window opens, for out-of-season labels
```

Stage-anchored remaining-days-to-ripe (from the observation instant):
```
flowering            → mean 70,  min 60,  max 80
fruiting + unripe    → mean 45,  min 35,  max 55
fruiting + ripening  → mean 15,  min 7,   max 25
fruiting + ripe      → 0 (harvest now)
fruiting + overripe  → 0 (window closing/past; flagged windowClosing)
```

### Algorithm (`predictFruiting`)
1. **Resolve `today` and `observedDay`.** `today = localDay(now)`. If `tree.updatedAt` is absent/unparseable → skip to step 4 (calendar fallback, lowest confidence). Else `observedDay = localDay(parse(updatedAt))`; `elapsed = daysBetween(observedDay, today)` (>= 0; if `updatedAt` is in the future relative to `now`, clamp `elapsed = 0`).
2. **Observation-anchored estimate.** If `fruitingStatus` is `flowering` or `fruiting` (with a defined ripeness bucket above) **and** `elapsed <= STALE_THRESHOLD_DAYS`:
   - Look up `{mean,min,max}` remaining-at-observation for the stage.
   - Age to now: `daysToRipeMean = clampMin0(mean - elapsed)` (and min/max likewise).
   - Derive `stage` from status/ripeness (see Interfaces). `confidence = 'observed'`.
3. **Overripe handling.** `fruiting + overripe` → `stage = 'overripe'`, `daysToRipe* = 0`, `windowClosing = true`, `inSeason` from harvest window.
4. **Calendar fallback** (status `none`, ripeness `unknown`, missing `updatedAt`, OR `elapsed > STALE_THRESHOLD_DAYS`):
   - `daysToBloom = daysUntilWindowOpens(FLOWERING_WINDOW, today)` (0 if currently inside flowering window).
   - `daysToRipeMean = daysToBloom + FLOWER_TO_RIPE_MEAN` (min/max from the range consts); if already in harvest window, treat `daysToRipeMean` as 0 and `stage = 'harvest'`.
   - `stage` = `'flowering'` if inside flowering window, `'harvest'` if inside harvest window, else `'dormant'`. `confidence = 'calendar'`.
5. **`inSeason`** = `monthInWindow(today.month, HARVEST_WINDOW)`.
6. **`label`** = human string built from `stage` + a coarse duration phrase (see `humanizeDays`).

### Helpers (all pure, exported for testing)
- `localDay(d: Date): { year; month; day }` — uses local getters.
- `daysBetween(a, b): number` — whole days, via UTC-normalized midnights of the local Y/M/D to avoid DST drift.
- `monthInWindow(month, window): boolean` — handles year-wrapping windows.
- `daysUntilWindowOpens(window, today): number` — 0 if inside; else forward distance to `window.start`, approximated month→day via first-of-month.
- `humanizeDays(days): string` — e.g. `~2 weeks`, `~10 weeks`, `now`.

### Trade-offs
- **Month-granularity fallback** (vs day-accurate ephemeris): the calendar path uses first-of-month anchoring, giving ±~2 weeks. Acceptable and honestly reflected by `confidence: 'calendar'`. Simpler and fully deterministic.
- **Single national calendar** (no per-state variation): matches the research brief and keeps constants flat. Revisit only if regional data is added to the schema.
- **No planting-age tracking**: the schema has no planting date, so juvenile/non-bearing trees are not detected. Out of scope; documented in Open Questions.

## Scope
- **In scope:** `src/lib/phenology.ts` (pure predictor + consts + helpers), its Vitest suite, a lightweight prediction row on `TreeDetailScreen`.
- **Out of scope (explicitly):** any schema change to `Tree`; per-region calendars; planting-age / juvenility; persisting predictions; the map-marker badge (listed as an optional stretch unit, not required).

## Interfaces / Models / Endpoints
```ts
// src/lib/phenology.ts
export type PhenologyStage =
  | 'dormant'      // outside all windows, no active fruit
  | 'flowering'    // in flower
  | 'developing'   // green/unripe fruit
  | 'ripening'     // fruit coloring toward crimson
  | 'harvest'      // ripe fruit available now
  | 'overripe';    // past-peak / window closing

export type PhenologyConfidence = 'observed' | 'calendar';

export interface FruitingPrediction {
  stage: PhenologyStage;
  daysToRipeMin: number;   // clamped >= 0
  daysToRipeMax: number;   // clamped >= 0
  label: string;           // human summary, e.g. "In flower — ~10 weeks to ripe fruit"
  inSeason: boolean;       // today's month within HARVEST_WINDOW
  confidence: PhenologyConfidence;
  windowClosing: boolean;  // true for overripe / past-window cases
}

export function predictFruiting(tree: Tree, now: Date): FruitingPrediction;
```
Stage derivation from observation: `flowering`→`flowering`; `fruiting`+`unripe`→`developing`; `fruiting`+`ripening`→`ripening`; `fruiting`+`ripe`→`harvest`; `fruiting`+`overripe`→`overripe`.

## Impact Analysis
- **Tests:** new suite `src/lib/phenology.test.ts`. No existing tests break (new module).
- **Dependencies/layers:** `phenology.ts` imports only the `Tree` type; UI unit imports the predictor into `TreeDetailScreen.tsx`. No repo/network changes.
- **Backward-compat:** additive; no migration.
- **Failure modes:** unparseable/missing `updatedAt` → calendar fallback (never throws); future `updatedAt` → `elapsed` clamped to 0; negative day math clamped to 0.
- **Perf:** O(1), pure — safe to call per render.

## Implementation Units

1. **Calendar constants & types** — files: `src/lib/phenology.ts` — change: add all named window/duration constants, `PhenologyStage`, `PhenologyConfidence`, `FruitingPrediction`, and the stage/remaining-days lookup tables. No logic yet. — acceptance: `tsc` passes; constants match the values in this spec.

2. **Pure date helpers** — files: `src/lib/phenology.ts` — change: implement `localDay`, `daysBetween`, `monthInWindow`, `daysUntilWindowOpens` (export them). — acceptance: unit tests for wrapping windows (Aug–Feb) and cross-year day diffs pass.

3. **`humanizeDays` + label builder** — files: `src/lib/phenology.ts` — change: `humanizeDays(days)` and an internal `buildLabel(stage, days, inSeason)`. — acceptance: returns `now`, `~2 weeks`, `~10 weeks`; "Out of season — next bloom ~Aug" produced for `dormant`.

4. **Observation-anchored branch** — files: `src/lib/phenology.ts` — change: `predictFruiting` for `flowering`/`fruiting` within `STALE_THRESHOLD_DAYS`, including aging to `now`, overripe/`windowClosing`, and clamping. — acceptance: tests for flowering→70d, unripe→45d, ripening→15d, ripe→0, overripe→windowClosing, plus aged-forward and future-date-clamp cases.

5. **Calendar-fallback branch + `inSeason`/confidence** — files: `src/lib/phenology.ts` — change: fallback for `none`/`unknown`/missing/stale; compute `daysToBloom + FLOWER_TO_RIPE_*`, set `stage`, `inSeason`, `confidence='calendar'`. — acceptance: tests for a stale observation, `none` status, and missing `updatedAt`; boundary months Aug/Feb/Dec/May classified correctly.

6. **Vitest suite completion** — files: `src/lib/phenology.test.ts` — change: consolidate/round out coverage across every branch + boundary month + edge cases (undefined `updatedAt`, future date, overripe). — acceptance: `vitest run` green; each `predictFruiting` branch has at least one case.

7. **TreeDetailScreen prediction row** — files: `src/features/tree-detail/TreeDetailScreen.tsx`, `src/features/tree-detail/TreeDetailScreen.module.css` — change: call `predictFruiting(tree, new Date())` in the component, render a `<dt>Forecast</dt><dd>{prediction.label}</dd>` pair in the existing `<dl>`; add a subtle `inSeason`/`confidence` cue (e.g. a `.badge` styled with `--color-crimson`). Keep it lightweight, no new state. — acceptance: detail screen shows the label; `inSeason` and calendar-vs-observed are visually distinguishable; `tsc` passes.

8. **(Optional stretch) Map-marker season badge** — files: `src/features/map/treeMarkers.ts` — change: when `predictFruiting(tree, new Date()).inSeason`, add a small child dot/ring to the marker element. — acceptance: in-season trees render a distinct marker; others unchanged.

## Open Questions
- Juvenile / non-bearing trees can't be detected (no planting-age field). Assumption: treat every tree as mature-bearing. Flag to product if false positives matter.
- Overripe with a fresh observation: spec sets `daysToRipe=0` + `windowClosing`. Confirm the label wording ("Past peak — harvest window closing") is acceptable.
- Marker badge (Unit 8) is optional; confirm whether it's in this milestone before delegating it.
