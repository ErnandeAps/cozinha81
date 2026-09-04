<!-- @dsCard group="Operator app" viewport="1200x760" name="App overview" subtitle="Operator dashboard structure" -->
# Cozinha81 — Operator app UI kit

Logged-in dashboard for **brands that rent Cozinha81 kitchens** (e.g. a delivery burger brand). Manage reservations, watch live station availability, track hours and spend.

## Files
- `index.html` — interactive app shell (entry point / starting point). Sidebar nav switches views.
- `sections.jsx` — `Sidebar`, `Topbar`, `Stats`, `StationBoard`, `Upcoming`, plus `PainelView` and the `App` shell. Exposes `window.DashboardApp`.
- `dashboard.css` — kit-local layout (`.db-` prefix).

## Composition
Built from DS primitives: `Button`, `IconButton`, `Avatar`, `StatusPill`, `Badge`. The **station board** reuses the burner-ring motif, color-coded by `ready / warn / stop`. Ink sidebar, warm-light content, the dark "next reservation" hero stat.

## Interactions
- Sidebar items switch the main view (`Painel`, `Reservas` are built; others show a placeholder).
- Live station tiles reflect availability; reservation rows show status + price.

## Notes
- Icons are inline Lucide-style strokes (see Iconography in the root readme).
- Single-tenant demo data; no real backend.
