# Ledgerly — Crypto Trading Dashboard

A React + Vite implementation of the **Crypto Dashboard** Claude Design, built
faithfully from the design's layout and logic, and wired up to be functional.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## What's here

- **Faithful design port** — sidebar, topbar, portfolio hero, price chart,
  holdings table, market movers, activity feed, quick-trade panel, allocation
  donut, watchlist, and news, matching the original design's spacing, colors,
  and typography (Manrope + JetBrains Mono).
- **Interactive** (all ported from the design's own logic):
  - Coin switcher (BTC / ETH / SOL) redraws the chart + header price.
  - Timeframe tabs (1H / 24H / 1W / 1M / 1Y).
  - Market movers Gainers / Losers toggle.
  - Quick-trade Buy / Sell with 25/50/75/Max amount presets; qty, price, and
    fee recompute live.
- **Live prices** — `useLivePrices` pulls BTC/ETH/SOL spot prices from
  CoinGecko's free, keyless public API every 60s and feeds them into the chart,
  holdings, watchlist, and trade panel. The header dot shows the status
  (green = live, grey = fallback). On any failure (offline / CORS / rate limit)
  it silently falls back to the design's built-in values, so it always renders.

## Structure

| File | Purpose |
| --- | --- |
| `src/App.jsx` | All dashboard components + layout |
| `src/logic.js` | Pure port of the design's `DCLogic` (seeded RNG, chart/path builders, view-model) |
| `src/useLivePrices.js` | CoinGecko live-price hook with fallback |
| `src/index.css` | Global reset, fonts, scrollbar, hover states |

## Design source

Imported from the Claude Design project *"Modern crypto dashboard design"* —
`Crypto Dashboard.dc.html`. The synthetic chart data is deterministic (seeded),
so charts are stable across renders while still varying per coin/timeframe.
