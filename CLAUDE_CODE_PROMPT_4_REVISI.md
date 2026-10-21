# Claude Code — Session 3: Final Revisions

Last build session. Three content revisions, one layout bug, plus the logo. No new logic — the planner/solver/ranker stay exactly as they are.

**New data is already in place.** `ingredients.csv` now has a `foto_url` column and `ingredients.json` has a `foto` field for all 18 proteins and toppings. Nothing to regenerate.

---

## Prompt — paste this

```
SPEC.md has been updated. Re-read these before starting:
  §6.3b  button width rules (CORRECTED — this caused a real layout bug)
  §6.5   ingredient photos + logo file
  §7.3   /rekomendasi — alternatives and match score
  §7.5   /checkout — pickup form, payment methods

data/ingredients.json now has a `foto` field: a URL string for the 18 proteins
and toppings, null for bases and dressings. Do not regenerate the data files.

=== 1. FIX THE BUTTON WIDTH BUG (highest priority) ===

At ~80% browser zoom, "Hitung Kebutuhanku" and "Racik Menu Saya" stop filling
their card and sit as a narrow 360px button inside a much wider card. The pill
tabs have the same problem — they hug their text instead of filling the row.

Cause: SPEC.md previously said "cap CTA buttons at max-width 360px on lg" without
distinguishing button types. That cap is correct for standalone hero CTAs and
wrong for form submit buttons. At 80% zoom the CSS viewport is wider, so lg
activates earlier and the bug becomes obvious.

Apply SPEC.md §6.3b:

  Submit buttons inside a card or form -> w-full, NO max-width:
    Hitung Kebutuhanku, Racik Menu Saya, Pesan Sekarang, Ubah Topping,
    Simpan & Lanjut, Bayar Sekarang
  Standalone hero CTAs -> keep max-width 360px on lg:
    Mulai Personalisasi, Lihat cara kerja

  Pill tabs (Hitungkan untuk saya / Saya tahu targetnya):
    wrap in grid grid-cols-2, each pill w-full.

Audit EVERY button in the app for this, not just the two reported. Check at
browser zoom 80%, 100% and 125%.

=== 2. /rekomendasi — ALTERNATIVES AND MATCH SCORE ===

First verify, don't assume: the code at src/app/rekomendasi/page.tsx already
renders an "Alternatif lain" section (line ~189) and a "Skor cocok" badge
(line ~145). They may simply be below the fold on desktop.

Run the app, fill the form, and scroll the whole page.

  If both already render -> the real problem is placement, not absence.
  On lg the alternatives sit at the bottom of a long left column, far below the
  fold. Move the "Alternatif lain" section into the right-hand sticky panel,
  below "Sesuai targetmu" and the total, so it is visible without scrolling.
  Keep it below the main card on mobile, exactly as it is now.

  If alternatives genuinely do not render -> check how many candidates survived
  filtering. With one candidate, alternatif is empty by design and the score
  badge hides (SPEC.md §4.7). That is correct behaviour, not a bug. Only treat
  it as a bug if there were 2+ candidates and nothing showed.

Each alternative card shows: thumbnail, menu name, short description, kcal,
price, and its own "Skor cocok {n}%". Clicking it swaps it into the main slot.

=== 3. /ubah — INGREDIENT PHOTOS ===

Replace the letter avatars with real photos, matching prototype page 4.

Use the `foto` field from ingredients.json. Build an <IngredientThumb> component:

  - 40px rounded square, object-cover
  - foto is a URL -> next/image
  - foto is null (bases, dressings) -> fall back to <IngredientAvatar>
  - image fails to load (onError) -> fall back to <IngredientAvatar>

Do NOT delete IngredientAvatar. It stays as the fallback. Campus wifi blocking
the CDN mid-demo is a real scenario, and broken image icons look far worse than
a clean initial.

images.unsplash.com is already in next.config.ts remotePatterns.

=== 4. /checkout — THREE CHANGES ===

(a) Remove "Antar" entirely. Not disabled, not "coming soon" — delete the
    toggle. Every order is pickup. Keep no leftover UI for it.

(b) Add a pickup details form, above the payment section:
      Nama Lengkap   — required, min 2 characters
      No. WhatsApp   — required, Indonesian format (08… or +628…, 9–15 digits)
    Still no login. Values are used this session and saved into the order
    history entry. Disable "Bayar Sekarang" until both are valid.

(c) Make all three payment methods selectable. Each shows its own panel:

      QRIS (default) -> existing QR mockup + "Tunjukkan kode ini ke kasir"
      E-wallet       -> 0812-3456-7890 (OVO / GoPay — a.n. FixSalad Kitchen)
                        with a Salin button
      Transfer       -> BCA 1234567890 (a.n. FixSalad Kitchen)
                        with a Salin button on the account number

    Copy button: navigator.clipboard.writeText() wrapped in try/catch, shows
    "Tersalin!" for 2 seconds. If the clipboard API is unavailable, leave the
    number selectable so it can be copied by hand — do not show an error.

    These numbers are fictional placeholders. Keep them as-is.

=== 5. LOGO ===

FixSalad_Logo.png is in the website root folder. Move it to public/ and use it
in place of the inline SVG logo, via next/image, in both the mobile header and
the desktop top nav. Keep the aspect ratio and give it a sensible height
(~32px mobile, ~36px desktop).

=== RULES ===

- No changes to planner.ts, solver.ts, features.ts, ranker.ts or recommend.ts.
- No new libraries.
- Do not regenerate data/*.json — the photo data is already there.
- All user-facing text in Indonesian.
- All 45 existing tests must still pass.

When done, run `npm run build` and `npm test` and report:
  - build and test results
  - whether alternatives were already rendering or genuinely missing
  - which buttons you changed from capped to full width
  - confirmation that the Antar option is fully removed
```

---

## Check these yourself afterwards

1. **Zoom to 80%** on `/preferensi`. Both buttons and both pill tabs should fill their card edge to edge. Then check 100% and 125%.
2. **`/rekomendasi` without scrolling** at desktop width — can you see the alternatives?
3. **`/ubah`** — real photos, no broken image icons, no letter circles among the toppings.
4. **`/checkout`** — no trace of "Antar"; Bayar Sekarang stays disabled until name and WhatsApp are filled; all three payment tabs switch and both Salin buttons work.
5. **Logo** on mobile and desktop, not stretched.

Then push. It auto-deploys to fix-salad.vercel.app.
