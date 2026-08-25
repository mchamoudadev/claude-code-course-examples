// Logic ported 1:1 from the Claude Design "Crypto Dashboard.dc.html" DCLogic class.
// Pure helpers + a single computeView() that mirrors the design's renderVals().

const GREEN = '#12a76a'
const RED = '#e5484d'

// ---- deterministic RNG (mulberry32-ish) so charts are stable across renders ----
export function rng(seed) {
  let s = seed >>> 0 || 1
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

export function usd(n, dec = 2) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export function pct(n) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%'
}

export function hexA(hex, a) {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16),
    g = parseInt(m.slice(2, 4), 16),
    b = parseInt(m.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}

const COIN_BASE = { BTC: 64230.12, ETH: 3412.55, SOL: 148.3 }

function buildSeries(coin, tf, basePrices) {
  const rand = rng(hash(coin) * 131 + hash(tf) * 17 + 7)
  const n = 72
  const base = (basePrices && basePrices[coin]) || COIN_BASE[coin] || 100
  const vol = { '1H': 0.0022, '24H': 0.009, '1W': 0.02, '1M': 0.04, '1Y': 0.09 }[tf]
  const drift = { '1H': 0.0001, '24H': 0.0005, '1W': 0.0009, '1M': 0.0014, '1Y': 0.0028 }[tf]
  let v = base * (1 - vol * 3.2)
  const pts = []
  for (let i = 0; i < n; i++) {
    v = v * (1 + (rand() - 0.5) * vol + drift)
    pts.push(v)
  }
  return pts
}

function pathFrom(pts, W, H, pad) {
  const n = pts.length,
    min = Math.min(...pts),
    max = Math.max(...pts),
    range = max - min || 1
  const X = (i) => (i / (n - 1)) * W
  const Y = (v) => pad + (1 - (v - min) / range) * (H - 2 * pad)
  let line = ''
  for (let i = 0; i < n; i++) line += (i === 0 ? 'M' : 'L') + X(i).toFixed(1) + ' ' + Y(pts[i]).toFixed(1) + ' '
  const area = line + `L${W} ${H} L0 ${H} Z`
  return { line: line.trim(), area, min, max, range, lastX: X(n - 1), lastY: Y(pts[n - 1]), X, Y }
}

function spark(seed, up) {
  const rand = rng(seed)
  const n = 20,
    W = 58,
    H = 24,
    pad = 3
  const pts = []
  let v = 0.5
  for (let i = 0; i < n; i++) {
    v += (rand() - 0.5) * 0.28 + (up ? 0.02 : -0.02)
    pts.push(v)
  }
  const min = Math.min(...pts),
    max = Math.max(...pts),
    range = max - min || 1
  let d = ''
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * W,
      y = pad + (1 - (pts[i] - min) / range) * (H - 2 * pad)
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '
  }
  return d.trim()
}

// props: { accentColor, chartStyle: 'area'|'line', showSparklines }
// state: { coin, tf, mover, side, amountUsd }
// live:  optional { BTC, ETH, SOL, ... } spot prices to override the design defaults
export function computeView(state, props, live) {
  const accent = props.accentColor || '#7b61ff'
  const soft = hexA(accent, 0.12)
  const chartStyle = props.chartStyle || 'area'
  const showSparklines = props.showSparklines !== false

  const livePx = live || {}

  const logoStyle = {
    width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center',
    justifyContent: 'center', transform: 'rotate(45deg)', background: accent,
  }
  const proBtn = {
    width: '100%', border: 'none', borderRadius: 9, padding: 8, fontFamily: 'inherit',
    fontWeight: 700, fontSize: 12.5, cursor: 'pointer', color: '#fff', background: accent,
  }
  const depositBtn = {
    display: 'flex', alignItems: 'center', gap: 8, border: 'none', borderRadius: 11,
    padding: '10px 15px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer',
    color: '#fff', background: accent, boxShadow: `0 6px 16px ${hexA(accent, 0.28)}`,
  }
  const navActive = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10,
    fontSize: 14, fontWeight: 700, textDecoration: 'none', background: soft, color: accent,
  }
  const accText = { fontSize: 13, fontWeight: 700, textDecoration: 'none', color: accent }

  // ---- selected coin + chart ----
  const coinMeta = {
    BTC: { name: 'Bitcoin', color: '#f7931a' },
    ETH: { name: 'Ethereum', color: '#627eea' },
    SOL: { name: 'Solana', color: '#14c8a3' },
  }
  const pillBase = {
    border: '1px solid #eceef0', borderRadius: 10, padding: '7px 12px', fontFamily: 'inherit',
    fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
  }
  const coinPills = ['BTC', 'ETH', 'SOL'].map((sym) => ({
    sym,
    color: coinMeta[sym].color,
    active: state.coin === sym,
    style:
      state.coin === sym
        ? { ...pillBase, background: '#15171c', color: '#fff', borderColor: '#15171c' }
        : { ...pillBase, background: '#fff', color: '#15171c' },
  }))

  const pts = buildSeries(state.coin, state.tf, livePx)
  const p = pathFrom(pts, 760, 300, 18)
  const changePct = ((pts[pts.length - 1] - pts[0]) / pts[0]) * 100
  const grid = [0, 1, 2, 3].map((k) => (18 + (k / 3) * (300 - 36)).toFixed(1))
  const priceLabels = [0, 1, 2, 3, 4].map((k) => usd(p.max - (k / 4) * p.range, 0))
  const timeSets = {
    '1H': ['60m', '45m', '30m', '15m', 'now'],
    '24H': ['00:00', '06:00', '12:00', '18:00', 'now'],
    '1W': ['Mon', 'Tue', 'Thu', 'Sat', 'now'],
    '1M': ['Wk1', 'Wk2', 'Wk3', 'Wk4', 'now'],
    '1Y': ['Aug', 'Nov', 'Feb', 'May', 'now'],
  }
  const chart = {
    grid, linePath: p.line, areaPath: p.area,
    lastX: p.lastX.toFixed(1), lastY: p.lastY.toFixed(1),
    priceLabels, timeLabels: timeSets[state.tf], showArea: chartStyle === 'area',
  }
  const sel = {
    name: coinMeta[state.coin].name,
    price: usd(pts[pts.length - 1], 2),
    change: pct(changePct),
    chColor: changePct >= 0 ? GREEN : RED,
  }
  const tabBase = {
    border: 'none', borderRadius: 8, padding: '6px 13px', fontFamily: 'inherit',
    fontWeight: 700, fontSize: 12.5, cursor: 'pointer',
  }
  const tfTabs = ['1H', '24H', '1W', '1M', '1Y'].map((label) => ({
    label,
    style:
      state.tf === label
        ? { ...tabBase, background: soft, color: accent }
        : { ...tabBase, background: 'transparent', color: '#8b909c' },
  }))

  // ---- portfolio ----
  const psp = pathFrom(buildSeries('BTC', '1M', livePx).map((v, i) => v * (1 + i * 0.001)), 220, 74, 6)
  const port = {
    value: '$99,687.51',
    day: '+$2,148.35 (2.20%)',
    allTime: '+$27,412.09 (+37.9%)',
    sparkLine: psp.line,
    sparkArea: psp.area,
  }

  // ---- holdings ----
  const priceStr = (sym, fallback, dec = 2) =>
    livePx[sym] ? usd(livePx[sym], dec) : fallback
  const holdings = [
    { sym: 'BTC', name: 'Bitcoin', icon: '₿', color: '#f7931a', price: priceStr('BTC', '$64,230.12'), amount: '0.8420', value: '$54,081.76', ch: 2.34 },
    { sym: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627eea', price: priceStr('ETH', '$3,412.55'), amount: '8.2100', value: '$28,017.03', ch: -1.12 },
    { sym: 'SOL', name: 'Solana', icon: 'S', color: '#14c8a3', price: priceStr('SOL', '$148.30'), amount: '62.400', value: '$9,253.92', ch: 5.67 },
    { sym: 'LINK', name: 'Chainlink', icon: 'L', color: '#2a5ada', price: '$14.22', amount: '340.00', value: '$4,834.80', ch: 0.89 },
    { sym: 'USDC', name: 'USD Coin', icon: '$', color: '#2775ca', price: '$1.00', amount: '3,500.0', value: '$3,500.00', ch: 0.01 },
  ].map((h) => ({ ...h, change: pct(h.ch), chColor: h.ch >= 0 ? GREEN : RED }))

  // ---- allocation donut ----
  const allocRaw = [
    { sym: 'BTC', v: 54081.76, color: '#f7931a' },
    { sym: 'ETH', v: 28017.03, color: '#627eea' },
    { sym: 'SOL', v: 9253.92, color: '#14c8a3' },
    { sym: 'LINK', v: 4834.8, color: '#2a5ada' },
    { sym: 'USDC', v: 3500.0, color: '#cbd2dc' },
  ]
  const totalV = allocRaw.reduce((a, b) => a + b.v, 0)
  const C = 2 * Math.PI * 46
  let acc = 0
  const alloc = allocRaw.map((a) => {
    const frac = a.v / totalV
    const seg = {
      sym: a.sym, color: a.color, pct: (frac * 100).toFixed(1) + '%',
      dash: `${(frac * C).toFixed(2)} ${(C - frac * C).toFixed(2)}`,
      offset: (-acc * C).toFixed(2),
    }
    acc += frac
    return seg
  })

  // ---- movers ----
  const gainers = [
    { sym: 'PEPE', name: 'Pepe', icon: 'P', color: '#3ba55d', price: '$0.0000121', ch: 24.3 },
    { sym: 'INJ', name: 'Injective', icon: 'I', color: '#00b4c8', price: '$28.44', ch: 18.72 },
    { sym: 'RNDR', name: 'Render', icon: 'R', color: '#ff4d4d', price: '$9.87', ch: 12.41 },
    { sym: 'DOGE', name: 'Dogecoin', icon: 'D', color: '#c2a633', price: '$0.1284', ch: 8.9 },
    { sym: 'SOL', name: 'Solana', icon: 'S', color: '#14c8a3', price: priceStr('SOL', '$148.30'), ch: 5.67 },
  ]
  const losers = [
    { sym: 'APT', name: 'Aptos', icon: 'A', color: '#1a1a1a', price: '$7.12', ch: -6.1 },
    { sym: 'ATOM', name: 'Cosmos', icon: 'C', color: '#2e3148', price: '$8.34', ch: -4.8 },
    { sym: 'DOT', name: 'Polkadot', icon: 'P', color: '#e6007a', price: '$6.05', ch: -3.2 },
    { sym: 'MATIC', name: 'Polygon', icon: 'M', color: '#8247e5', price: '$0.5820', ch: -2.44 },
    { sym: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627eea', price: priceStr('ETH', '$3,412.55'), ch: -1.12 },
  ]
  const movers = (state.mover === 'gainers' ? gainers : losers).map((m) => ({
    ...m, change: pct(m.ch), chColor: m.ch >= 0 ? GREEN : RED,
  }))
  const mtBase = {
    border: 'none', borderRadius: 7, padding: '5px 11px', fontFamily: 'inherit',
    fontWeight: 700, fontSize: 12, cursor: 'pointer',
  }
  const moverTab = (on) =>
    state.mover === on
      ? { ...mtBase, background: '#fff', color: '#15171c', boxShadow: '0 1px 2px rgba(16,24,40,0.08)' }
      : { ...mtBase, background: 'transparent', color: '#8b909c' }

  // ---- transactions ----
  const txns = [
    { title: 'Bought Bitcoin', time: '2 min ago', glyph: '↓', bg: '#e7f6ef', fg: GREEN, amount: '-$963.45', qty: '0.0150 BTC', amtColor: '#15171c' },
    { title: 'Sold Ethereum', time: '1 hr ago', glyph: '↑', bg: '#fdecec', fg: RED, amount: '+$4,095.06', qty: '1.2000 ETH', amtColor: GREEN },
    { title: 'Received USDC', time: '3 hr ago', glyph: '↓', bg: '#eef2fb', fg: '#2a5ada', amount: '+$1,500.00', qty: '1,500 USDC', amtColor: GREEN },
    { title: 'Staked Solana', time: '5 hr ago', glyph: '◆', bg: soft, fg: accent, amount: '20.00 SOL', qty: '≈ $2,966', amtColor: '#15171c' },
    { title: 'Bought Solana', time: 'Yesterday', glyph: '↓', bg: '#e7f6ef', fg: GREEN, amount: '-$1,838.92', qty: '12.400 SOL', amtColor: '#15171c' },
  ]

  // ---- watchlist ----
  const watch = [
    { sym: 'BTC', icon: '₿', color: '#f7931a', price: priceStr('BTC', '$64,230', 0), ch: 2.34 },
    { sym: 'ETH', icon: 'Ξ', color: '#627eea', price: priceStr('ETH', '$3,412', 0), ch: -1.12 },
    { sym: 'SOL', icon: 'S', color: '#14c8a3', price: priceStr('SOL', '$148.30'), ch: 5.67 },
    { sym: 'LINK', icon: 'L', color: '#2a5ada', price: '$14.22', ch: 0.89 },
    { sym: 'AVAX', icon: 'A', color: '#e84142', price: '$27.65', ch: 3.21 },
    { sym: 'DOGE', icon: 'D', color: '#c2a633', price: '$0.1284', ch: 8.9 },
  ].map((w) => ({
    ...w, change: pct(w.ch), chColor: w.ch >= 0 ? GREEN : RED, spark: spark(hash(w.sym) + 3, w.ch >= 0),
  }))

  // ---- news ----
  const news = [
    { title: 'Bitcoin reclaims $64K as spot ETF inflows hit weekly high', src: 'CoinDesk', srcColor: accent, time: '12m ago' },
    { title: 'Ethereum core devs finalize Pectra upgrade timeline', src: 'The Block', srcColor: accent, time: '1h ago' },
    { title: 'Solana sees record daily active addresses amid meme surge', src: 'Decrypt', srcColor: accent, time: '3h ago' },
    { title: 'Fed signals patience on cuts; risk assets rally into weekend', src: 'Bloomberg', srcColor: accent, time: '5h ago' },
  ]

  // ---- trade panel ----
  const px = livePx.BTC || 64230.12
  const isBuy = state.side === 'buy'
  const amt = state.amountUsd
  const maxUsd = isBuy ? 3500 : 54081.76
  const presets = [['25%', 0.25], ['50%', 0.5], ['75%', 0.75], ['Max', 1]].map(([label, f]) => ({
    label, frac: f, max: maxUsd,
  }))
  const trade = {
    amount: usd(amt, 2), verb: isBuy ? 'get' : 'sell',
    qty: (amt / px).toFixed(5), px: usd(px, 2), fee: usd(amt * 0.001, 2),
    btn: (isBuy ? 'Buy' : 'Sell') + ' Bitcoin',
    btnStyle: {
      width: '100%', border: 'none', borderRadius: 12, padding: 14, fontFamily: 'inherit',
      fontWeight: 800, fontSize: 14.5, cursor: 'pointer', color: '#fff',
      background: isBuy ? accent : RED,
      boxShadow: isBuy ? `0 8px 20px ${hexA(accent, 0.32)}` : `0 8px 20px ${hexA(RED, 0.28)}`,
    },
  }
  const stBase = {
    border: 'none', borderRadius: 8, padding: 9, fontFamily: 'inherit',
    fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
  }
  const segTab = (on) =>
    state.side === on
      ? { ...stBase, background: '#fff', color: on === 'buy' ? GREEN : RED, boxShadow: '0 1px 3px rgba(16,24,40,0.1)' }
      : { ...stBase, background: 'transparent', color: '#8b909c' }

  return {
    accent, soft, logoStyle, proBtn, depositBtn, navActive, accText, showSparklines,
    coinPills, chart, sel, tf: state.tf, tfTabs,
    port, holdings, alloc,
    movers, gainersTab: moverTab('gainers'), losersTab: moverTab('losers'),
    txns, watch, news, trade, presets,
    buyTab: segTab('buy'), sellTab: segTab('sell'),
    maxUsdBuy: 3500,
  }
}
