# Beebud

Minimal fixed-apiary weather HUD for beekeepers. It turns Open-Meteo data into
flight status, an 8-day forecast rail, ops alerts, and site-condition signals.

This is a single-author hobby project. It has no contributor process and no
public roadmap.

## Privacy

- Real apiary coordinates belong in local `.env` only.
- `.env.example` intentionally ships blank coordinate fields.
- No API keys are needed.

## Architecture

- `src/routes/+layout.server.ts` is the only weather loader.
- `src/routes/+page.server.ts` only returns parent data.
- `src/lib/server/weather-cache.ts` provides in-memory stale-serving cache with 429 backoff.
- `src/lib/utils/` holds pure weather, forecast, ops, and site logic.
- Upstream payloads are validated with Zod before normalization.
- Loader failures throw `Weather API failed`.

## Data sources

- Open-Meteo MET Norway current + hourly
- Open-Meteo forecast daily astronomy
- Open-Meteo ensemble hourly: `icon_seamless`, `ecmwf_ifs025`

## Development

```sh
bun install
bun run dev
bun run check
bun run test
bun run lint
bun run build
```

## License

AGPL-3.0-only. See `LICENSE`.
