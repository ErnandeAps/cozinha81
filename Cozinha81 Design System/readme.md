# Cozinha81 — Design System

> **Cozinha81 — Cozinhas inteligentes para aluguel.**
> Professional, licensed, fully-equipped kitchen stations rented by the hour, shift, or month to food entrepreneurs and delivery brands in São Paulo, Brazil. A "ghost / cloud kitchen" operator: you bring the recipe, Cozinha81 brings the cooktop.

This project is the canonical brand + product design system. An automated compiler indexes the tokens, fonts, components, and cards; consuming projects link `styles.css` and pull React components from the bundle.

---

## Sources

This system was built from the brand assets provided — there was **no existing codebase or Figma** to recreate. The two source logos:

- `uploads/logo-final-h.svg` → `assets/logo-horizontal.svg` (horizontal lockup)
- `uploads/logo-final-badge.svg` → `assets/logo-badge.svg` (rounded badge)

The visual language (colors, type, the burner motif) is **derived from those logos**; the product surfaces (marketing site, operator app) are original, designed to establish a coherent product direction. If a real product/codebase exists, share it and these UI kits should be reconciled against it.

The signed-in word "COZINHA**81**" + tagline "COZINHAS PROFISSIONAIS" come straight from the wordmark.

---

## The big idea: the cooktop

The logo is a **professional 4-burner cooktop seen from above** — three burners in ink, **one lit in flame orange**, each with a little control-knob dot. That single lit burner is the whole brand in one image: *idle professional capacity, ready to fire up for you.*

This motif recurs everywhere: the loader (`BurnerLoader`), the hero/CTA graphic (`Cooktop`), station tiles on the dashboard, list bullets, and the rounded badge. **Always exactly one burner lit, in flame.**

---

## CONTENT FUNDAMENTALS

**Language:** Brazilian Portuguese (pt-BR). All product copy is PT-BR.

**Voice — direto, capaz, pé no chão.** Confident and practical, like a seasoned kitchen operator. We sell *capability and removal of friction*, never hype.

- **Person:** Speak to the customer as **você**. We ("nós") take responsibility for the boring parts ("A regularização é nossa.").
- **Casing:** Sentence case for sentences. **Eyebrows and labels** are UPPERCASE mono, often prefixed with `//` (e.g. `// COMO FUNCIONA`). Headlines are tight, lowercase-feel Archivo Black.
- **Tone words:** acesa (lit), pronta, sem obra, sem CAPEX, por hora/turno/mês, licenciada, despache o pedido.
- **Rhythm:** short, declarative. Imperatives are good: *"Chegue, cozinhe, despache."* Three-beat lists land well.
- **Numbers:** R$ with tabular mono figures (`R$ 48/hora`). Unit IDs in mono (`UNIT-VL-07`, `Estação 04`).
- **No emoji.** No exclamation spam. No "revolucione", "sinergia", "disrupção", or rocket-ship startup-speak.

**Sounds like / Avoid** — see the `Voice & tone` card.
- ✅ "Sua cozinha já está acesa." · "Sem obra, sem CAPEX, sem dor." · "Três passos entre você e o próximo pedido."
- ❌ "Soluções sinérgicas de food-tech." · "Revolucione seu delivery agora!!!" · "A melhor cozinha do mundo 🚀🔥"

---

## VISUAL FOUNDATIONS

**Color.** Two brand anchors: **Ink `#1A1A1A`** and **Flame `#C4520A`** (the lit burner). Neutrals are a **warm "steel"** scale (stainless steel + warm light), never blue-gray. Flame is used *surgically* — one CTA, one lit burner, the accent rule — not as fields of orange. Status palette maps to kitchen state: **ready/green** (Disponível), **warn/amber** (Em preparo), **stop/red** (Ocupada). Page background is warm off-white `--bg-base` (steel-25); dark sections use ink.

**Type.** Display + headings: **Archivo** (800–900, tight tracking ~−0.03em, line-height ~0.95–1.2) — heavy industrial grotesk echoing the Arial-Black wordmark. Body: **Hanken Grotesk** (400–600, 16px base, line-height 1.5–1.65) — warm and legible. Data/labels/prices: **JetBrains Mono**, including the `//` uppercase eyebrow. (See *Font substitution* below.)

**Backgrounds.** Mostly flat warm surfaces — **no photographic heroes** are provided, so dark sections carry the brand via the CSS **cooktop graphic** + a soft **radial flame glow** (`radial-gradient(... rgba(196,82,10,.2) ...)`). No busy patterns, no noise/grain. When real kitchen photography exists it should be warm-toned, slightly contrasty, shot in stainless environments; swap it into `KitchenCard` and hero panels.

**Borders & cards.** 1px hairline borders in warm steel (`--border-default`). Cards: white surface, hairline border, **soft warm-tinted shadow** (`--shadow-sm/md`), radius 14–16px (`--radius-lg`). No colored left-border accent cards. The featured pricing plan uses a 2px **ink** border, not orange.

**Radii.** Modest and industrial — 6–16px on most UI; pills for tags/status; **the burner is the only true circle.** Avatars and station rings are circular by design (the motif).

**Shadows.** Warm-tinted, low-spread, tight (`rgba(26,26,26,.06–.16)`) — never gray-blue. One special: `--shadow-flame` (orange glow) for lit/active emphasis only.

**Elevation & blur.** Sticky nav uses `backdrop-filter: blur(12px)` over translucent ink. Otherwise transparency/blur is rare — this is a solid, grounded, "industrial" UI, not glassy.

**Motion.** Confident and mechanical — `--ease-out cubic-bezier(.22,.61,.36,1)`, `120–320ms`. **No bounce, no spring.** Signature animations: the **ready StatusPill** emits a slow pulsing ring (the pilot light); **BurnerLoader** lights its four rings in sequence. All gated behind `prefers-reduced-motion`.

**Hover / press.**
- Buttons: hover → one step darker flame/steel; press → `translateY(1px)` (no scale).
- Cards (interactive): hover → lift `translateY(-2px)` + `--shadow-lg` + stronger border.
- Ghost/icon: hover → subtle `--bg-subtle` fill.
- Links: hover → darker (`--accent-press`) or white on dark.
- Focus: `--ring-accent` (3px translucent flame ring).

**Layout.** 1200px max content width, 32px gutters, 4px spacing grid. Sticky dark nav; generous section padding (72–96px). Dark hero/CTA/footer bookend warm-light content sections.

---

## ICONOGRAPHY

- **System:** **Lucide** (`https://unpkg.com/lucide`) — 2px stroke, round caps/joins. This weight matches the geometric, industrial type. In the kits, a tiny inline `Ico` wrapper renders Lucide-style 24×24 paths (clock, calendar, pin, card, bell, search, plus, arrow, bolt, shield, trend, cog) to avoid a runtime dependency in static cards. **For production, pull the real Lucide set** (npm `lucide-react` or the CDN) at `stroke-width: 2`.
  - *Substitution flag:* the inline glyphs are hand-matched to Lucide's geometry, not the official package. Swap to real Lucide for full coverage.
- **Brand mark vs UI icons:** the **burner rings** (concentric circles) are a *brand* device, not a UI icon — used for the loader, station tiles, bullets, and hero. Don't mix it into the functional icon set.
- **No emoji** anywhere in product UI. No unicode-symbol icons. Status is communicated by the colored `StatusPill` dot, not by emoji.
- **Color:** icons inherit `currentColor`; flame only when active/featured (e.g. active sidebar item), otherwise steel/secondary.
- **Assets on disk:** `assets/logo-horizontal.svg`, `assets/logo-horizontal-light.svg` (inverse), `assets/logo-badge.svg`, `assets/mark-burners.svg` (mark only).

---

## Font substitution ⚠️

No font binaries were supplied, so the system loads **Archivo**, **Hanken Grotesk**, and **JetBrains Mono** from **Google Fonts** (via `@import` in `tokens/fonts.css`). These are deliberate, close matches to the heavy Arial-Black wordmark + a warm body grotesk. **If Cozinha81 has licensed brand fonts, send the files** and we'll swap the `@import` for local `@font-face` rules. (Because they're loaded by `@import` rather than `@font-face`, the compiler reports "Fonts: none" — that's expected for CDN-hosted fonts.)

---

## Index / manifest

**Root**
- `styles.css` — the single entry point consumers link (only `@import`s).
- `readme.md` — this guide. `SKILL.md` — Agent-Skill wrapper.

**`tokens/`** — `fonts.css` (webfonts), `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `base.css` (element defaults).

**`components/`** — `components.css` (component styles, shipped via styles.css) plus React primitives:
- `core/` — **Button**, **IconButton**, **Badge**, **Tag**, **Card**, **StatusPill**, **Avatar**
- `forms/` — **Input**, **Select**, **Switch**, **Checkbox**
- `product/` — **KitchenCard**, **BurnerLoader**
- Each has `.jsx` + `.d.ts` + `.prompt.md`; each directory has a `@dsCard` HTML.

**`ui_kits/`**
- `marketing/` — public homepage (`index.html`, `sections.jsx`, `marketing.css`). Starting point.
- `dashboard/` — operator app / painel (`index.html`, `sections.jsx`, `dashboard.css`). Starting point.

**`guidelines/`** — foundation specimen cards (Type, Colors, Spacing, Brand) shown in the Design System tab.

**`assets/`** — logos + burner mark.

### Starting points
- **Marketing site** — Cozinha81 landing page.
- **Operator app** — operator dashboard.
- **Button** (Core), **KitchenCard** (Product).

### Using a component (in a `@dsCard` / consumer HTML)
```html
<link rel="stylesheet" href="styles.css">
<script src="_ds_bundle.js"></script>
<script type="text/babel">
  const { Button, KitchenCard, StatusPill } = window.Cozinha81DesignSystem_72690b;
</script>
```
