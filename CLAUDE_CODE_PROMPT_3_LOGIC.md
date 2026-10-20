# Claude Code — Session 2: Logic, Tests, Integration

The final build session. After this the site stops showing hardcoded numbers and starts using the trained model.

**Status going in:** UI and responsive layout are done and deployed. `src/lib/` has `data.ts`, `dummy.ts`, `format.ts`, `order.ts`, `orderHistory.ts`, `types.ts` — but none of the computation. `/nutrisi` section (b) is deferred behind a TODO waiting for `solver.ts`. No tests exist yet.

---

## Prompt — paste this

```
Read SPEC.md §2, §3, and §4 carefully before writing anything. This is the most
critical part of the project.

The reference implementation is model/fixsalad_core.py. The TypeScript you write
MUST produce numbers identical to that Python. If they differ, the TypeScript is
wrong — do not change the Python to match.

data/model_weights.json is the trained model, already in place. Do not regenerate it.

SCOPE: implement the three computation layers, wire them into the existing UI,
replace all dummy data, and write tests.

=== 1. src/lib/planner.ts — Layer 1 (SPEC.md §2) ===

calculateTargets(bodyData, tujuan) -> { targetKcal, minProteinG, batasNatriumMg }

Port hitung_bmr and hitung_target from fixsalad_core.py directly.
Mifflin-St Jeor, activity factors, goal multipliers, divide by meals per day,
round calories to nearest 10 and protein to nearest 1.

=== 2. src/lib/solver.ts — Layer 2 (SPEC.md §3.2) ===

solvePortions(menuIds, ingredients, targetKcal, minProteinG, budget, batasNatriumMg)
  -> SolveResult

Port solve_portions from fixsalad_core.py. Preserve the step order exactly:
  starting portions (base 70% of max, dressing at min, others midpoint)
  -> 3 iterations of: scale calories -> fix protein -> fix price
  -> round to multiples of 5 -> clamp again

Step 1c must consider BOTH toppings and proteins, in that order, with the guard
that protein is only cut while total protein stays >= minProteinG. A version that
only reduces toppings cannot bring a protein-dominated menu under budget — that
was a real bug found during testing, see SPEC.md §3.3.

Also return the four criteria booleans (kaloriOk, proteinOk, budgetOk, natriumOk)
per SPEC.md §3.5, and harga_jual = round(modal * 2.0 / 500) * 500.

=== 3. src/lib/features.ts — the 9 features (SPEC.md §4.2) ===

Array order MUST match feature_names in data/model_weights.json exactly.
Use EPS = 1e-6 in every division. Not optional: without it, budget = 0 produces
Infinity and silently corrupts the ranking with no error thrown.

=== 4. src/lib/ranker.ts — Layer 3 (SPEC.md §4.7) ===

scoreAllMenus(featureRows, weights) -> number[]

CRITICAL: there is a within-group centering step BEFORE standardization.
Subtract each feature's mean across the candidate set, THEN standardize with
scaler_mean / scaler_scale, THEN dot with coefficients, THEN sigmoid.
Do not skip centering. SPEC.md §4.8 explains why — without it the model's most
important coefficient comes out with the wrong sign.

Scores are computed for the whole candidate set at once, never one menu at a time.
When only 1 candidate survives, centering makes every feature 0 — hide the match
score badge in that case rather than showing a meaningless 50%.

Implement the rule-based fallback from SPEC.md §4.9, used when model_weights.json
is missing or fails to parse. The app must never throw because of a model problem.

=== 5. src/lib/recommend.ts — orchestration ===

  a. hard filter: drop menus containing any ingredient in the user's tidakSuka list
  b. hard filter: drop menus whose bentuk doesn't match
     if this leaves nothing, SKIP the bentuk filter — offering a different format
     beats offering nothing
  c. solvePortions for each surviving menu
  d. buildFeatures for each
  e. scoreAllMenus, sort descending
  f. return top 3

=== 6. Wire into the existing UI and DELETE src/lib/dummy.ts ===

dummy.ts is currently imported by nutrisi/page.tsx, preferensi/page.tsx and
context/OrderContext.tsx. Replace every use with real computation, then delete
the file. If anything still imports it at the end, you missed a wiring point.

  /preferensi  "Hitung Kebutuhanku" -> calculateTargets, fill targetKcal and
               minProteinG, both still editable afterwards
  /preferensi  "Racik Menu Saya" -> recommend(), store to context, go to /rekomendasi
  /rekomendasi rank 1 with per-ingredient grams, criteria badges showing n/4,
               match score badge, 2 alternatives. Clicking an alternative swaps it
               into the main slot.
  /ubah        Counter per topping, live recalculation on every click (1 unit = 25 g).
               Red warning when over the calorie target or over budget.
  /checkout    real total from the solved menu
  /sukses      order code "FS-" + 4 random digits, write to order history

=== 7. /nutrisi section (b) — resolve the deferred TODO ===

src/app/nutrisi/page.tsx has a TODO waiting for solver.ts. Implement it now:
5 menu cards showing each menu's nutrition at a reference 500 kcal portion via
solvePortions(menuIds, ingredients, 500, 30, 50000).

The label above that section is required, exactly as written in the TODO comment.
Without it the numbers mislead — portions genuinely vary per user, that's the
core of the product.

=== 8. Empty state on /rekomendasi ===

When no menu survives filtering:
  "Belum ada menu yang cocok dengan pantanganmu. Coba longgarkan satu pantangan
   atau naikkan budget."
plus a button back to /preferensi.

REQUIRED — without it the page renders blank and looks like a crash during the demo.

=== 9. Tests (SPEC.md §10) — use Vitest ===

Highest value first:

  a. NaN / Infinity guards. Extreme inputs: targetKcal 100, targetKcal 2000,
     budget 10000, budget 0, minProteinG 0, minProteinG 200.
     Assert every returned number is finite. This is the test most likely to find
     a real bug.
  b. Every gram stays within [minGram, maxGram] across 200 random inputs x 5 menus.
  c. Grams are always multiples of 5.
  d. No ingredient with a forbidden exclusionTag ever appears in a result.
  e. planner matches the worked example in SPEC.md §10:
     male 70kg 175cm 22y, ringan, defisit, 3 meals
     BMR 1688.75 -> TDEE 2322 -> x0.80 = 1857/day -> 619 kcal/meal
  f. ranker: scoreAllMenus on a known feature matrix returns values in (0,1)
     and ranks the better-fitting menu higher.

=== 10. Build check ===

Run `npm run build` and `npm test`. Both must pass with no TypeScript errors.

RULES:
- All logic runs client-side. No API routes.
- No new libraries except Vitest and its config.
- localStorage stays limited to order history (SPEC.md §8.2). Nothing else.
- If a test fails, fix the implementation — do not loosen the test.
- All user-facing text in Indonesian.

When done, report:
  - npm run build result
  - npm test result, with the count of passing tests
  - confirmation that src/lib/dummy.ts is deleted and nothing imports it
  - the solved output for one scenario: wanita 21, 52kg/157cm, ringan, defisit
    kalori, 3 meals, budget 40000, suka segar, bentuk bowl
    (expect target ~450 kcal, min protein ~35 g, M01 or M05 winning at 4/4)
```

---

## Correcting it if it goes off-spec

| What might happen | Say this |
|---|---|
| Skips centering in ranker.ts | "Read SPEC.md §4.8. Centering is required before standardization." |
| Scores menus one at a time | "scoreAllMenus takes the whole candidate set. Centering needs all of them." |
| Leaves dummy.ts in place | "Delete dummy.ts and replace every import with real computation." |
| Only reduces toppings in the price step | "Proteins must be included, with the protein-minimum guard. SPEC.md §3.2 step 1c." |
| Grams not rounded to multiples of 5 | "Step 4 in SPEC.md §3.2 — round to 5, then clamp again." |
| Loosens a test to make it pass | "Fix the implementation, not the test. The test is what proves the constraints hold." |
| Creates API routes | "No API routes — all logic is client-side per SPEC.md §1." |
| Regenerates model_weights.json | "That file is the trained model output. Use it, don't rebuild it." |

---

## Verify yourself afterwards

Run through the full flow on **fix-salad.vercel.app** once it redeploys:

1. Fill the body-data tab → the calorie and protein fields populate, and are still editable
2. Racik → recommendation shows **gram amounts per ingredient**, not round numbers
3. Criteria badges say n/4, and at least one menu reaches 4/4 for a realistic input
4. Tick "tidak suka: bawang" → M05 Classic Chicken Caesar Wrap disappears or changes
5. Pick "rendah garam" → M02 Smoked Beef drops down the ranking (sodium ~820 mg)
6. Exclude everything → empty state appears, not a blank page
7. `/nutrisi` → menu cards show numbers, with the 500 kcal reference label above them

Check 4 and 5 specifically. They're what proves the recommender is actually doing something, and they're what a penguji will ask you to demonstrate live.
