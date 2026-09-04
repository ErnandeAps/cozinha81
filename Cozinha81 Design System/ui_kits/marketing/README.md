<!-- @dsCard group="Marketing site" viewport="1200x720" name="Site overview" subtitle="Sections of the Cozinha81 homepage" -->
# Cozinha81 — Marketing site UI kit

Public-facing homepage for **Cozinha81** (cozinhas profissionais para aluguel). Audience: food entrepreneurs and delivery brands looking to rent licensed, equipped kitchen stations.

## Files
- `index.html` — full interactive landing page (entry point / starting point).
- `sections.jsx` — all section components (`Nav`, `Hero`, `Values`, `How`, `Units`, `Pricing`, `CTA`, `Footer`) + the `Cooktop` brand motif. Exposes `window.MarketingPage`.
- `marketing.css` — kit-local layout styles (prefixed `.mk-`).

## Composition
Uses DS primitives from the bundle: `Button`, `Badge`, `Tag`, `StatusPill`, `KitchenCard`. The hero/CTA feature the **Cooktop** motif — four CSS burner rings with one lit in flame, echoing the logo.

## Notes
- All copy is PT-BR in the brand voice (direct, capable, no hype).
- Logos load from `../../assets/`. Dark hero + dark footer; warm light body.
- Kitchen photos are not provided — `KitchenCard` falls back to the burner-mark placeholder panel. Swap in real imagery when available.
