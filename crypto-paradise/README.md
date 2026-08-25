# Crypto Paradise — NFT Dashboard

A pixel-perfect React rebuild of the "Crypto NFT Dashboard (Light Mode)" Figma design,
generated via the Figma MCP and hand-tuned to match the source frame (1440 × 1024).

**Source design:** [Figma — Freebie | Crypto NFT Dashboard (Light Mode)](https://www.figma.com/design/FQdQ0nsM3Svew4YpZD6qm7/?node-id=731-1586)

## Stack

- **Vite + React 19 + TypeScript**
- Plain CSS with design tokens (Figma variables) in `src/index.css` — no UI framework
- Bundled fonts via `@fontsource` — **Inter** (400/500/600) and **Quicksand** (600, used for numeric values), exactly as in the design
- All imagery (NFT artwork, avatars, crypto icons, charts) exported from Figma into `public/assets`

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
```

## How the design is reproduced

The dashboard is rendered on a fixed **1440 × 1024** stage that matches the Figma frame
1:1, then uniformly scaled to fit the viewport (`App.tsx`). This keeps every element
pixel-accurate at any window size.

Components (`src/components/`):

| Component | Region |
|---|---|
| `Sidebar` | Logo, BitCoin balance card + sparkline, nav (Home/Auctions/Inbox), wallets, settings, dark-mode toggle |
| `TopBar` | Search, **NEW** button, chat/bell/profile |
| `Featured` | "Featured NFTs" header + carousel controls + 4 NFT cards |
| `Investments` | "All" filter, 1D/1W/1Y toggle, legend, 3-wave area chart over a dashed grid |
| `Transactions` | Recent transactions list (BTC / ETH / Tether / USD Coin) |

Design tokens (from the Figma variables):

- `--text` `#3f444e` · `--muted` `#a2a3a4` · `--ink` `#010101` · `--bg` `#f4f4f4` · `--orange` `#ff9c00`
- Accent blue `#21a8ff`, logo red `#ff4f4f`, chart purple/pink/orange `#a82cd0` / `#d4767f` / `#ed9013`

Chevrons and the carousel arrows are drawn as inline SVG (for exact orientation/color);
all other icons are the original Figma vector exports.
