## Product

Beebud is a single-author hobby weather HUD for fixed apiaries. It turns
Open-Meteo data into flight status, forecast windows, ops alerts, and
site-condition signals.

## Stack

- Bun
- Svelte 5 runes + SvelteKit 2
- TypeScript strict
- Zod
- Biome
- `svelte-adapter-bun`

## Commands

- `bun install`
- `bun run dev`
- `bun run check`
- `bun run test`
- `bun run lint`
- `bun run build`
- `bun run start`
- `bun run preview`
- `bun run format`

## Runtime contract

- `APIARY_LAT` and `APIARY_LON` are required server env vars; copy `.env.example`.
- No API key is required.
- Do not commit real apiary names, coordinates, `.env` files, local deployment
  paths, or private contact details beyond the public author identity.
- `src/routes/+layout.server.ts` is the only weather loader.
- It fetches Open-Meteo MET Norway current/hourly, forecast daily astronomy, and
  ensemble hourly data from `icon_seamless` and `ecmwf_ifs025`.
- Validate external payloads with Zod before normalization.
- Fail closed with `Weather API failed`.
- Keep apiary coordinates server-only.
- Keep public examples blank or synthetic.

## Code map

```text
src/
  routes/                 app shell, weather loader, dashboard
  lib/components/ui/      BlockHeader, Logo, Panel, Topbar
  lib/components/weather/ DayTabs, FlightPanel, ForecastGrid, OpsPanel, SitePanel
  lib/server/             weather-cache.ts
  lib/utils/              ensemble, flight, forecast, ops, site, weather, weather-api
```

## Rules

- Keep the project minimal and single-author; do not add contributor workflows,
  governance docs, or social metadata.
- Use Svelte 5 runes for props, state, and derived values.
- Do not add legacy component APIs: `export let`, `$:`, `createEventDispatcher`, or
  legacy slots.
- Prefer callback props over dispatchers.
- Keep domain logic pure in `src/lib/utils/`.
- Keep fetch, caching, and env access on the server.
- Prefer native platform APIs and existing dependencies. Add packages only when
  unavoidable.
- Preserve strict typing and validate data at the boundary.
- Preserve the existing HUD language: hard borders, dense dividers, uppercase mono
  labels, signal colors, scoped component CSS, and global tokens in `src/app.css`.
- Keep primary controls at least `var(--space-touch)` where practical.
- Do not add Tailwind, soft-card styling, broad radii, or off-theme gradients.
