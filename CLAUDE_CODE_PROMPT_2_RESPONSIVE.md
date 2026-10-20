# Claude Code — Session 1b: Responsive + Navigation

Run this in the **same Claude Code session** that built the UI, if it's still open. If you started a fresh one, tell it to read `SPEC.md` first.

Do this **before** Session 2 (logic). Retrofitting responsive layout after the logic is wired in is strictly worse — every screen gets touched twice.

---

## Prompt — paste this

```
SPEC.md has been updated. Re-read these sections before you start:
  §6.3b  breakpoints and grid
  §6.4   SiteNav component and routes
  §7.0   desktop layout per screen
  §7.7   /pesanan (new page)
  §7.8   /nutrisi (new page)
  §8.2   localStorage for order history

Three corrections and two new pages. No new colors, no new design language —
everything below reuses the tokens and components already built.

=== 1. THIS IS A WEBSITE, NOT A PHONE APP ===

The current build locks content to a ~480px column, so on a desktop monitor it
renders as a narrow strip in the middle of an empty screen. The prototype PDF was
drawn at mobile size to communicate the design concept only — it was never an
instruction to cap the page width.

Make it fully responsive per SPEC.md §6.3b:
  < 768px    single column, 16px padding, bottom nav      (keep exactly as-is today)
  768-1023px single column, max-width 680px, centered, top nav
  >= 1024px  two-column grid, max-width 1200px, centered, top nav

Build a <PageShell> component that provides the 1200px container and the
`1fr 380px` two-column grid, and use it on every page. Right-hand panels are
`position: sticky; top: 88px`.

Per-screen desktop layout is specified in SPEC.md §7.0 — follow that table.

Do NOT simply remove max-width and let everything stretch. Specifically:
  - CTA buttons cap at max-width 360px on lg. A 1200px-wide button looks broken.
  - Body paragraphs cap at 60ch. Long lines are unreadable.
  - Headline scales 32px -> 44px at lg.
  - Cards get 28px padding at lg (up from 20px).
  - "Tiga langkah gampang" on landing: 1 column -> 3 columns side by side at lg.
  - "Alternatif lain" on /rekomendasi: stacked -> 2 columns at lg.

Mobile layout must come out pixel-identical to what exists now. If a mobile screen
shifts, that's a regression — fix it.

=== 2. THE BOTTOM NAV MUST ACTUALLY NAVIGATE ===

Right now all four items are decorative. Replace <BottomNav> with <SiteNav>
(SPEC.md §6.4): one component, one route list, two renderings.

  < 768px   fixed bottom bar, 4 icons + labels — same as now
  >= 768px  top header: logo left, 4 text links right. Bottom bar hidden.

Routes, all of which must work:
  Menu     -> /
  Rakit    -> /preferensi
  Pesanan  -> /pesanan
  Nutrisi  -> /nutrisi

Active item: icon + label in --green-900, bold. Others --gray-600.
Derive active state from usePathname().

=== 3. REMOVE THE PROFILE ICON ===

Delete the circular profile avatar in the top-right of the header. There is no
login or signup in this product, so it leads nowhere. A visible control that does
nothing invites a reviewer to click it and find a dead button.

Mobile header: logo only.
Desktop header: logo + the 4 nav links from <SiteNav>.

=== 4. NEW PAGE: /pesanan (SPEC.md §7.7) ===

Order history for this browser.

Has orders: cards, newest first — order code, menu name, small photo, nutrition
summary ("{kcal} kkal · {protein} g protein"), total price, pickup time, timestamp.
2-column grid at lg.

No orders: empty state — simple icon, "Belum ada pesanan. Racik menu pertamamu
dulu.", and a primary button "Mulai Personalisasi →" linking to /preferensi.
Use an empty state, NOT an automatic redirect.

Persistence per SPEC.md §8.2:
  - localStorage key 'fixsalad_orders', max 20 entries
  - EVERY read and write wrapped in try/catch — it throws in private mode
  - read ONLY inside useEffect, never during render. Reading during render causes
    a Next.js hydration mismatch, which surfaces as a blank white page.
  - write when /sukses mounts, not on the "Bayar Sekarang" click
  - this is the ONLY thing allowed in localStorage. Form inputs, preferences and
    the selected menu all stay in React state.

Also add a secondary button on /sukses: "Lihat pesanan saya" -> /pesanan.

=== 5. NEW PAGE: /nutrisi (SPEC.md §7.8) ===

Do this LAST. It is the only genuinely new feature here; everything above is a
correction. If you run low on time, section (a) alone is enough.

(a) Ingredient table — all 27 from ingredients.json, values per 100 g: name,
    category, kcal, protein, carbs, fat, fiber, sodium. Grouped by category with
    a heading per group. On mobile wrap it in overflow-x: auto and let it scroll
    horizontally — do not shrink it until it's unreadable.
    Ingredients with an exclusionTag get a small chip next to the name
    (e.g. "mengandung dairy").

(b) Per-menu nutrition — 5 cards showing each menu's profile at a REFERENCE
    500 kcal portion, computed via solvePortions(menu, 500, 30, 50000).
    Required label above this section:
    "Nilai gizi di bawah dihitung pada porsi referensi 500 kkal. Porsi aktual
     menyesuaikan target kalori dan proteinmu."
    Without that label the numbers are misleading — portions genuinely vary per
    user, that's the core of the product.

    NOTE: if solver.ts does not exist yet (Session 2 hasn't run), skip section (b)
    and leave a TODO comment. Do not stub fake numbers.

(c) "Cara kami menghitung" — three short paragraphs: the Mifflin-St Jeor method
    and activity factors (SPEC.md §2.2, §2.3) in plain language; a table of the
    4 goals with calorie multiplier, protein per kg, and sodium cap (SPEC.md §2.4);
    and the disclaimer "Estimasi berdasarkan rumus standar. Angka aktual bisa
    berbeda ±15%. Bukan pengganti saran ahli gizi."

=== RULES ===

- No new libraries. Tailwind + React only.
- No new colors. Use the existing tokens.
- No API routes, no database.
- All user-facing text in Indonesian.
- Mobile must not regress. Check 390px before you call this done.

When finished, run `npm run build` and report:
  - which screens you verified at 390px, 768px and 1440px
  - whether any mobile layout changed
  - whether /nutrisi section (b) was completed or deferred
```

---

## What to check yourself afterwards

Resize the browser slowly from 1440px down to 360px and watch for:

1. **The 1024px jump** — two columns should collapse to one cleanly, with no overlap and no horizontal scrollbar.
2. **The 768px jump** — top nav should disappear and the bottom bar should appear. Both visible at once, or neither, is the bug to look for.
3. **Button widths at 1440px** — if any CTA spans the full 1200px, the `max-width: 360px` rule was missed.
4. **Sticky panels** — scroll `/rekomendasi` at desktop width; the right panel should hold position, not scroll away.
5. **`/pesanan` after a refresh** — place an order, refresh, open Pesanan. The order should still be there. If it's gone, the localStorage write didn't fire.
6. **`/pesanan` in a private window** — should show the empty state, not a crash.

Check 5 and 6 specifically. They're the ones most likely to be quietly broken, and both are easy to hit during a live demo.
