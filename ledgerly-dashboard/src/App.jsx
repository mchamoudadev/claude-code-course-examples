import { useMemo, useState } from 'react'
import { computeView } from './logic.js'
import { useLivePrices } from './useLivePrices.js'

// Design props (mirror the Claude Design editor props). Change these to re-skin.
const PROPS = { accentColor: '#7b61ff', chartStyle: 'area', showSparklines: true }

const MONO = "'JetBrains Mono', monospace"

export default function App() {
  const [state, setState] = useState({
    coin: 'BTC',
    tf: '24H',
    mover: 'gainers',
    side: 'buy',
    amountUsd: 500,
  })
  const { prices, status } = useLivePrices()

  const v = useMemo(() => computeView(state, PROPS, prices), [state, prices])
  const set = (patch) => setState((s) => ({ ...s, ...patch }))

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: '#f6f7f9',
        fontFamily: "'Manrope', system-ui, sans-serif",
        color: '#15171c',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <Sidebar v={v} />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <Topbar v={v} status={status} />

        <div style={{ flex: 1, overflow: 'auto', padding: '24px 26px 40px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) 372px',
              gap: 20,
              alignItems: 'start',
              maxWidth: 1560,
              minWidth: 1160,
              margin: '0 auto',
            }}
          >
            {/* MAIN COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
              <PortfolioHero v={v} />
              <ChartCard v={v} state={state} set={set} />
              <Holdings v={v} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <Movers v={v} set={set} />
                <Activity v={v} />
              </div>
            </div>

            {/* RIGHT RAIL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0 }}>
              <QuickTrade v={v} state={state} set={set} />
              <Allocation v={v} />
              <Watchlist v={v} />
              <News v={v} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const card = {
  background: '#ffffff',
  border: '1px solid #ececf0',
  borderRadius: 18,
  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
}

/* ----------------------------------------------------------------- SIDEBAR */
function Sidebar({ v }) {
  const navItems = [
    { label: 'Markets', icon: <polyline points="1,13 6,7 10,10 17,2" stroke="#8b909c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /> },
    { label: 'Portfolio', icon: <><rect x="1.5" y="3.5" width="15" height="11" rx="2.5" stroke="#8b909c" strokeWidth="1.6" /><circle cx="13" cy="9" r="1.4" fill="#8b909c" /></> },
    { label: 'Trade', icon: <rect x="4" y="4" width="10" height="10" rx="2.5" transform="rotate(45 9 9)" stroke="#8b909c" strokeWidth="1.6" /> },
    { label: 'News', icon: <><line x1="4.5" y1="6" x2="13.5" y2="6" stroke="#8b909c" strokeWidth="1.6" strokeLinecap="round" /><line x1="4.5" y1="9" x2="13.5" y2="9" stroke="#8b909c" strokeWidth="1.6" strokeLinecap="round" /><line x1="4.5" y1="12" x2="10" y2="12" stroke="#8b909c" strokeWidth="1.6" strokeLinecap="round" /><rect x="1.5" y="2.5" width="15" height="13" rx="2.5" stroke="#8b909c" strokeWidth="1.6" /></> },
    { label: 'Settings', icon: <><line x1="2" y1="5" x2="16" y2="5" stroke="#8b909c" strokeWidth="1.6" strokeLinecap="round" /><line x1="2" y1="13" x2="16" y2="13" stroke="#8b909c" strokeWidth="1.6" strokeLinecap="round" /><circle cx="12" cy="5" r="2.4" fill="#fff" stroke="#8b909c" strokeWidth="1.6" /><circle cx="6" cy="13" r="2.4" fill="#fff" stroke="#8b909c" strokeWidth="1.6" /></> },
  ]
  return (
    <aside
      style={{
        width: 236, flexShrink: 0, background: '#ffffff', borderRight: '1px solid #ececf0',
        display: 'flex', flexDirection: 'column', padding: '20px 16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 8px 22px' }}>
        <div style={v.logoStyle} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>Ledgerly</span>
          <span style={{ fontSize: 10.5, color: '#8b909c', fontWeight: 600, letterSpacing: '0.02em' }}>TRADING</span>
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: '#a4a9b3', letterSpacing: '0.08em', padding: '6px 10px 8px' }}>MENU</div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <a href="#" style={v.navActive}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="1" y="1" width="7" height="7" rx="2" fill={v.accent} />
            <rect x="10" y="1" width="7" height="7" rx="2" fill={v.accent} opacity="0.35" />
            <rect x="1" y="10" width="7" height="7" rx="2" fill={v.accent} opacity="0.35" />
            <rect x="10" y="10" width="7" height="7" rx="2" fill={v.accent} />
          </svg>
          Dashboard
        </a>
        {navItems.map((it) => (
          <a
            key={it.label}
            href="#"
            className="nav-link"
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
              fontSize: 14, fontWeight: 600, color: '#5a5f6b', textDecoration: 'none',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">{it.icon}</svg>
            {it.label}
          </a>
        ))}
      </nav>

      <div style={{ marginTop: 'auto', borderRadius: 14, padding: 16, background: 'linear-gradient(150deg,#15171c,#2a2d38)', color: '#fff' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>Upgrade to Pro</div>
        <div style={{ fontSize: 11.5, color: '#b7bcc7', lineHeight: 1.45, marginBottom: 12 }}>
          Zero-fee trading &amp; advanced charts.
        </div>
        <button style={v.proBtn}>Get Pro</button>
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ TOPBAR */
function Topbar({ v, status }) {
  const live = status === 'live'
  const dotColor = status === 'loading' ? '#f5a623' : live ? '#12a76a' : '#a4a9b3'
  const statusLabel = status === 'loading' ? 'Connecting…' : live ? 'Live prices' : 'Markets open'
  return (
    <header
      style={{
        height: 68, flexShrink: 0, borderBottom: '1px solid #ececf0', background: '#ffffff',
        display: 'flex', alignItems: 'center', gap: 20, padding: '0 26px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
        <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>Dashboard</span>
        <span style={{ fontSize: 12, color: '#8b909c', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
          Fri, Jul 4 ·
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor }} />
            {statusLabel}
          </span>
        </span>
      </div>
      <div
        style={{
          marginLeft: 14, flex: 1, maxWidth: 340, display: 'flex', alignItems: 'center', gap: 9,
          background: '#f4f5f7', border: '1px solid #eceef0', borderRadius: 11, padding: '9px 13px',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="5" stroke="#a4a9b3" strokeWidth="1.6" />
          <line x1="10.8" y1="10.8" x2="14" y2="14" stroke="#a4a9b3" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          placeholder="Search coins, markets…"
          style={{ border: 'none', background: 'transparent', outline: 'none', fontFamily: 'inherit', fontSize: 13, color: '#15171c', width: '100%' }}
        />
        <span style={{ fontSize: 10.5, color: '#a4a9b3', fontWeight: 600, border: '1px solid #e2e4e8', borderRadius: 5, padding: '1px 5px' }}>/</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          className="icon-btn"
          style={{ position: 'relative', width: 40, height: 40, borderRadius: 11, border: '1px solid #eceef0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
            <path d="M4 7a4.5 4.5 0 0 1 9 0c0 3 1 4 1.5 4.5H2.5C3 11 4 10 4 7Z" stroke="#5a5f6b" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M7 14a1.6 1.6 0 0 0 3 0" stroke="#5a5f6b" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ position: 'absolute', top: 9, right: 10, width: 7, height: 7, borderRadius: '50%', background: '#e5484d', border: '1.5px solid #fff' }} />
        </button>
        <button style={v.depositBtn}>
          <span style={{ fontSize: 16, lineHeight: 0, marginTop: -2 }}>+</span> Deposit
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, paddingLeft: 6 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(140deg,#c9b7ff,#8b6bff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>
            MR
          </div>
        </div>
      </div>
    </header>
  )
}

/* -------------------------------------------------------------- PORTFOLIO */
function PortfolioHero({ v }) {
  return (
    <section style={{ ...card, padding: '24px 26px', display: 'flex', alignItems: 'center', gap: 24, animation: 'dashpop .4s ease both' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#8b909c', letterSpacing: '0.02em', marginBottom: 8 }}>TOTAL BALANCE</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 40, letterSpacing: '-0.03em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v.port.value}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#e7f6ef', color: '#12a76a', fontWeight: 700, fontSize: 13, padding: '5px 10px', borderRadius: 8, fontFamily: MONO }}>▲ {v.port.day}</span>
          <span style={{ fontSize: 13, color: '#8b909c', fontWeight: 600 }}>past 24 hours</span>
        </div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'stretch', gap: 26 }}>
        <div style={{ width: 220, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <svg viewBox="0 0 220 74" width="220" height="74" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="pspark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={v.accent} stopOpacity="0.22" />
                <stop offset="1" stopColor={v.accent} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={v.port.sparkArea} fill="url(#pspark)" />
            <path d={v.port.sparkLine} fill="none" stroke={v.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ textAlign: 'right', fontSize: 11.5, color: '#a4a9b3', fontWeight: 600, marginTop: 4 }}>30-day trend</div>
        </div>
        <div style={{ borderLeft: '1px solid #f0f1f3', paddingLeft: 26, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#a4a9b3', marginBottom: 4 }}>ALL-TIME P/L</div>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16, color: '#12a76a' }}>{v.port.allTime}</div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#a4a9b3', marginBottom: 4 }}>AVAILABLE</div>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 16 }}>$3,500.00</div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------- CHART */
function ChartCard({ v, state, set }) {
  return (
    <section style={{ ...card, padding: '22px 24px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {v.coinPills.map((c) => (
            <button key={c.sym} onClick={() => set({ coin: c.sym })} style={c.style}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: c.color }} />
              {c.sym}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26, letterSpacing: '-0.02em' }}>{v.sel.price}</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 14, color: v.sel.chColor }}>{v.sel.change}</span>
          </div>
          <div style={{ fontSize: 12, color: '#8b909c', fontWeight: 600, marginTop: 2 }}>{v.sel.name} · {v.tf}</div>
        </div>
      </div>

      <div style={{ marginTop: 16, position: 'relative' }}>
        <svg viewBox="0 0 760 300" width="100%" height="300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="carea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={v.accent} stopOpacity="0.20" />
              <stop offset="1" stopColor={v.accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {v.chart.grid.map((g, i) => (
            <line key={i} x1="0" y1={g} x2="760" y2={g} stroke="#f0f1f3" strokeWidth="1" />
          ))}
          {v.chart.showArea && <path d={v.chart.areaPath} fill="url(#carea)" />}
          <path d={v.chart.linePath} fill="none" stroke={v.accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={v.chart.lastX} cy={v.chart.lastY} r="4.5" fill={v.accent} stroke="#fff" strokeWidth="2.5" />
        </svg>
        <div style={{ position: 'absolute', top: 0, right: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 300, pointerEvents: 'none' }}>
          {v.chart.priceLabels.map((p, i) => (
            <span key={i} style={{ fontFamily: MONO, fontSize: 10.5, color: '#b0b4bc', background: '#ffffff', padding: '0 3px', fontWeight: 600 }}>{p}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, paddingRight: 44 }}>
        {v.chart.timeLabels.map((t, i) => (
          <span key={i} style={{ fontSize: 11, color: '#a4a9b3', fontWeight: 600 }}>{t}</span>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 12 }}>
        {v.tfTabs.map((t) => (
          <button key={t.label} onClick={() => set({ tf: t.label })} style={t.style}>{t.label}</button>
        ))}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- HOLDINGS */
function Holdings({ v }) {
  const gridCols = '1.6fr 1fr 1fr 1fr 0.9fr'
  return (
    <section style={{ ...card, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>Your holdings</span>
        <a href="#" style={v.accText}>Manage</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, padding: '10px 4px', borderBottom: '1px solid #f0f1f3', fontSize: 11.5, fontWeight: 700, color: '#a4a9b3', letterSpacing: '0.02em' }}>
        <span>ASSET</span>
        <span style={{ textAlign: 'right' }}>PRICE</span>
        <span style={{ textAlign: 'right' }}>HOLDINGS</span>
        <span style={{ textAlign: 'right' }}>VALUE</span>
        <span style={{ textAlign: 'right' }}>24H</span>
      </div>
      {v.holdings.map((h) => (
        <div key={h.sym} style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 10, padding: '13px 4px', borderBottom: '1px solid #f6f7f9', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#fff', background: h.color }}>{h.icon}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{h.name}</div>
              <div style={{ fontSize: 12, color: '#a4a9b3', fontWeight: 600 }}>{h.sym}</div>
            </div>
          </div>
          <span style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 600, fontSize: 13.5 }}>{h.price}</span>
          <span style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 600, fontSize: 13.5, color: '#5a5f6b' }}>{h.amount}</span>
          <span style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700, fontSize: 13.5 }}>{h.value}</span>
          <span style={{ textAlign: 'right', fontFamily: MONO, fontWeight: 700, fontSize: 13, color: h.chColor }}>{h.change}</span>
        </div>
      ))}
    </section>
  )
}

/* ------------------------------------------------------------------ MOVERS */
function Movers({ v, set }) {
  return (
    <section style={{ ...card, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>Market movers</span>
        <div style={{ display: 'flex', gap: 3, background: '#f4f5f7', borderRadius: 9, padding: 3 }}>
          <button onClick={() => set({ mover: 'gainers' })} style={v.gainersTab}>Gainers</button>
          <button onClick={() => set({ mover: 'losers' })} style={v.losersTab}>Losers</button>
        </div>
      </div>
      {v.movers.map((m, i) => (
        <div key={m.sym + i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: '1px solid #f6f7f9' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#fff', background: m.color }}>{m.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{m.sym}</div>
            <div style={{ fontSize: 11.5, color: '#a4a9b3', fontWeight: 600 }}>{m.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13 }}>{m.price}</div>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12, color: m.chColor }}>{m.change}</div>
          </div>
        </div>
      ))}
    </section>
  )
}

/* ---------------------------------------------------------------- ACTIVITY */
function Activity({ v }) {
  return (
    <section style={{ ...card, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>Recent activity</span>
        <a href="#" style={v.accText}>All</a>
      </div>
      {v.txns.map((t, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: '1px solid #f6f7f9' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg, color: t.fg, fontWeight: 800, fontSize: 13 }}>{t.glyph}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.title}</div>
            <div style={{ fontSize: 11.5, color: '#a4a9b3', fontWeight: 600 }}>{t.time}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13, color: t.amtColor }}>{t.amount}</div>
            <div style={{ fontFamily: MONO, fontSize: 11.5, color: '#a4a9b3' }}>{t.qty}</div>
          </div>
        </div>
      ))}
    </section>
  )
}

/* ------------------------------------------------------------- QUICK TRADE */
function QuickTrade({ v, state, set }) {
  return (
    <section style={{ ...card, padding: '20px 22px' }}>
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 14 }}>Quick trade</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: '#f4f5f7', borderRadius: 11, padding: 4, marginBottom: 16 }}>
        <button onClick={() => set({ side: 'buy', amountUsd: Math.min(state.amountUsd, v.maxUsdBuy) })} style={v.buyTab}>Buy</button>
        <button onClick={() => set({ side: 'sell' })} style={v.sellTab}>Sell</button>
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#a4a9b3', marginBottom: 7 }}>AMOUNT (USD)</div>
      <div style={{ border: '1px solid #eceef0', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24, letterSpacing: '-0.01em' }}>{v.trade.amount}</span>
        <span style={{ fontSize: 13, color: '#8b909c', fontWeight: 700 }}>USD</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 7, marginBottom: 16 }}>
        {v.presets.map((p) => (
          <button
            key={p.label}
            className="preset-btn"
            onClick={() => set({ amountUsd: Math.round(p.max * p.frac) })}
            style={{ border: '1px solid #eceef0', background: '#fff', borderRadius: 9, padding: '8px 0', fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, color: '#5a5f6b', cursor: 'pointer' }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ background: '#f8f9fb', borderRadius: 12, padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 16 }}>
        <Row label={`You ${v.trade.verb}`} value={`${v.trade.qty} BTC`} bold />
        <Row label="Price" value={v.trade.px} />
        <Row label="Est. fee" value={v.trade.fee} />
      </div>
      <button style={v.trade.btnStyle}>{v.trade.btn}</button>
    </section>
  )
}

function Row({ label, value, bold }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
      <span style={{ color: '#8b909c', fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: MONO, fontWeight: bold ? 700 : 600 }}>{value}</span>
    </div>
  )
}

/* -------------------------------------------------------------- ALLOCATION */
function Allocation({ v }) {
  return (
    <section style={{ ...card, padding: '20px 22px' }}>
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 16 }}>Allocation</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg width="118" height="118" viewBox="0 0 118 118" style={{ flexShrink: 0 }}>
          <circle cx="59" cy="59" r="46" fill="none" stroke="#f2f3f5" strokeWidth="15" />
          {v.alloc.map((a) => (
            <circle key={a.sym} cx="59" cy="59" r="46" fill="none" stroke={a.color} strokeWidth="15" strokeDasharray={a.dash} strokeDashoffset={a.offset} transform="rotate(-90 59 59)" strokeLinecap="butt" />
          ))}
          <text x="59" y="55" textAnchor="middle" fontFamily="Manrope" fontWeight="800" fontSize="12" fill="#a4a9b3">ASSETS</text>
          <text x="59" y="72" textAnchor="middle" fontFamily="JetBrains Mono" fontWeight="700" fontSize="19" fill="#15171c">5</text>
        </svg>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 9, minWidth: 0 }}>
          {v.alloc.map((a) => (
            <div key={a.sym} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: a.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{a.sym}</span>
              <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: '#5a5f6b' }}>{a.pct}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- WATCHLIST */
function Watchlist({ v }) {
  return (
    <section style={{ ...card, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em' }}>Watchlist</span>
        <a href="#" style={v.accText}>Edit</a>
      </div>
      {v.watch.map((w) => (
        <div key={w.sym} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: '1px solid #f6f7f9' }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#fff', background: w.color }}>{w.icon}</div>
          <div style={{ minWidth: 44 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{w.sym}</div>
          </div>
          {v.showSparklines && (
            <svg width="58" height="24" viewBox="0 0 58 24" style={{ flexShrink: 0 }}>
              <path d={w.spark} fill="none" stroke={w.chColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13 }}>{w.price}</div>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 11.5, color: w.chColor }}>{w.change}</div>
          </div>
        </div>
      ))}
    </section>
  )
}

/* -------------------------------------------------------------------- NEWS */
function News({ v }) {
  return (
    <section style={{ ...card, padding: '20px 22px' }}>
      <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 12 }}>Market news</div>
      {v.news.map((n, i) => (
        <a key={i} href="#" className="news-link" style={{ display: 'block', padding: '11px 0', borderBottom: '1px solid #f6f7f9', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.35, marginBottom: 5 }}>{n.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#a4a9b3', fontWeight: 600 }}>
            <span style={{ color: n.srcColor }}>{n.src}</span>·<span>{n.time}</span>
          </div>
        </a>
      ))}
    </section>
  )
}
