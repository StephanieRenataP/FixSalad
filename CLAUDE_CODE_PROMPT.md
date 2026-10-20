# Claude Code Prompts

Run Claude Code inside `website/`, then paste the prompt below.

**Use two separate sessions.** Session 1 for UI, session 2 for logic. Splitting them keeps each session's scope clear and makes bugs traceable — if they're combined, one error in the solver can blank every screen and you won't know why.

Prompts are in English; the website UI stays in Indonesian.

---

## SESSION 1 — Scaffold + UI (Day 1, morning)

```
Read SPEC.md in this folder before doing anything. It is the complete project
specification. Also open FixSalad_Mobile_Prototype.pdf for the visual reference —
5 pages, one screen each.

SCOPE OF THIS SESSION: scaffold the project and build ALL the UI with dummy data.
Do NOT implement the planner, solver, or ranker in this session. That is session 2.

1. Scaffold Next.js 14 (App Router) + TypeScript + Tailwind CSS.
   - No src/app/api directory — this project has no backend
   - ESLint on

2. Set up the design tokens from SPEC.md §6 as CSS variables in globals.css and
   extend tailwind.config.ts so they're usable as classes (bg-green-900,
   text-rust-600, etc). Load Plus Jakarta Sans via next/font/google.

3. Build the components listed in SPEC.md §6.4:
   Stepper, Chip, StatBox, CriteriaBadge, Counter, BottomNav.
   All mobile-first. Container max-width 480px, centered on desktop.

4. Build the 6 screens from SPEC.md §7 using HARDCODED DUMMY DATA:
   / (landing), /preferensi, /rekomendasi, /ubah, /checkout, /sukses
   Match the prototype PDF layout as closely as you can — spacing, corner radius,
   font size hierarchy, badge placement.

   Pay particular attention to §7.2: the "Data Diri" input is NOT a separate screen.
   It is two pill-style tabs at the top of the /preferensi card that swap which
   input block is visible. No navigation, no URL change, stepper stays at 4 steps.
   Switching tabs must NOT clear values the user already entered.

5. Build a <MenuImage> component wrapping next/image with an onError handler that
   falls back to a green gradient placeholder showing the menu name. See SPEC.md §6.5.
   Add images.unsplash.com to next.config.ts remotePatterns.
   For ingredient thumbnails on /ubah, do NOT use photos — use colored circles with
   the ingredient's initial, color derived from its category.

6. Set up OrderContext (React Context + useReducer) per SPEC.md §8. Full state shape
   as specified, but populate `rekomendasi` with dummy data for now.

7. Create src/lib/types.ts with all types from SPEC.md §5 and §8.

RULES:
- Mobile-first. Test at 390px viewport.
- No horizontal scroll at 360px.
- All user-facing text in Indonesian.
- Do NOT install a state management library, UI kit, or animation library.
  Tailwind + React only.
- Do NOT create API routes, a database, or auth.

When done, run npm run dev and report which screens are complete and which still
need work.
```

---

## SESSION 2 — Logic + Tests + Deploy prep (Day 2, morning)

```
Read SPEC.md §2, §3, and §4 carefully. This is the most critical part of the project.

The reference implementation is model/fixsalad_core.py. The TypeScript you write
MUST produce numbers identical to that Python. If they differ, the TypeScript is
wrong — do not "fix" the Python to match.

SCOPE OF THIS SESSION: implement the logic and wire it into the existing UI.

1. src/lib/planner.ts — Layer 1, per SPEC.md §2
   calculateTargets(bodyData, tujuan) -> { targetKcal, minProteinG, batasNatriumMg }
   Port hitung_bmr and hitung_target from fixsalad_core.py directly.

2. src/lib/solver.ts — Layer 2, per SPEC.md §3.2
   solvePortions(menuIds, ingredients, targetKcal, minProteinG, budget, batasNatriumMg)
   Port solve_portions from fixsalad_core.py. Preserve the step order exactly:
   starting portions -> 3 iterations (scale calories, fix protein, fix price)
   -> round to multiples of 5 -> clamp again.

   Step 1c must consider BOTH toppings and proteins, with the guard that protein
   is only reduced while total protein stays >= minProteinG. A version that only
   reduces toppings cannot bring a protein-dominated menu under budget — that was
   a real bug, see SPEC.md §3.3.

3. src/lib/features.ts — the 9 features, per SPEC.md §4.2
   The array order MUST match feature_names in data/model_weights.json exactly.
   Use EPS = 1e-6 in every division. This is not optional: without it, budget = 0
   yields Infinity and silently corrupts the ranking with no error thrown.

4. src/lib/ranker.ts — Layer 3, per SPEC.md §4.7
   scoreAllMenus(featureRows, weights) -> number[]
   CRITICAL: there is a within-group centering step BEFORE standardization.
   Do not skip it. SPEC.md §4.8 explains why — without it the model's most
   important coefficient comes out with the wrong sign.
   Scores must be computed for the whole candidate set at once, never per-menu.
   Also implement the rule-based fallback from SPEC.md §4.9, used when
   model_weights.json is missing or fails to parse.

5. src/lib/recommend.ts — orchestration:
   a. hard filter: drop menus containing any ingredient in the user's tidakSuka list
   b. hard filter: drop menus whose bentuk doesn't match
      (if this leaves nothing, SKIP the bentuk filter — offering a different
       format beats offering nothing)
   c. solve portions for each surviving menu
   d. build features
   e. score all, sort descending
   f. return top 3

6. Wire into the UI:
   - /preferensi: "Hitung Kebutuhanku" calls the planner and fills targetKcal and
     minProteinG (still editable afterwards)
   - /preferensi: "Racik Menu Saya" calls recommend, stores to context, navigates
     to /rekomendasi
   - /rekomendasi: show rank 1 with per-ingredient grams, criteria badges, and 2
     alternatives. Clicking an alternative swaps it into the main slot.
     Hide the match-score badge when only 1 candidate survived (SPEC.md §4.7).
   - /ubah: Counter per topping, live recalculation on every click (1 unit = 25 g).
     Red warning when over the calorie target or budget.
   - /checkout: compute total, generate order code "FS-" + 4 random digits
   - /sukses: display the order code

7. Empty state on /rekomendasi when no menu survives filtering:
   "Belum ada menu yang cocok dengan pantanganmu. Coba longgarkan satu pantangan
   atau naikkan budget." plus a button back to /preferensi.
   This is REQUIRED — without it the page renders blank and looks like a crash
   during the demo.

8. Unit tests per SPEC.md §10, using Vitest.
   Highest priority: NaN/Infinity tests with extreme inputs (target 100 kcal,
   target 2000 kcal, budget 10000, budget 0). These are the ones most likely to
   find a real bug.
   Also port the worked Mifflin-St Jeor example from SPEC.md §10 as a test.

9. Prepare for deploy: .gitignore, short README, and make sure `npm run build`
   passes with no TypeScript errors.

RULES:
- All logic runs client-side. No API routes.
- Do not use localStorage.
- If data/model_weights.json is absent, the app must still work via the
  rule-based fallback without throwing.
- When done, run `npm run build` and `npm test` and report the results.
- If a test fails, fix the implementation — do not loosen the test.
```

---

## If Claude Code does something off-spec

Things it may plausibly do that you don't want. Correct them as soon as you notice:

| What might happen | Say this |
|---|---|
| Creates API routes under `src/app/api/` | "No API routes — all logic is client-side per SPEC.md §1" |
| Installs zustand / redux / shadcn / framer-motion | "Don't install extra libraries. Tailwind + React only." |
| Skips centering in ranker.ts | "Read SPEC.md §4.8. Centering is required before standardization." |
| Scores menus one at a time | "scoreAllMenus takes the whole candidate set. Centering needs all of them." |
| Makes Data Diri a separate screen or 5th stepper step | "Read SPEC.md §7.2. It's two pill tabs on the same page, stepper stays at 4." |
| Clears the form when switching tabs | "Switching tabs must not clear entered values. SPEC.md §7.2." |
| Doesn't round grams to multiples of 5 | "Step 4 in SPEC.md §3.2 — round to multiples of 5, then clamp again." |
| Loosens a test to make it pass | "Fix the implementation, not the test. The test is what proves the constraints hold." |
| Uses an external placeholder image service | "Use a local gradient div. External services can fail during the demo." |
| Omits the onError image fallback | "SPEC.md §6.5 — onError fallback is mandatory, campus WiFi may block the CDN." |
| Builds a distinct desktop layout | "Mobile-first. Desktop is just a centered 480px container." |
| Reduces only toppings in the price step | "Proteins must be included, with the protein-minimum guard. SPEC.md §3.2 step 1c." |
