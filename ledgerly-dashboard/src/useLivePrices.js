import { useEffect, useState } from 'react'

// Fetches live spot prices from CoinGecko's free, keyless public API.
// Returns { prices, status } where status is 'loading' | 'live' | 'fallback'.
// On any failure (offline, CORS, rate limit) it silently falls back to the
// design's built-in values, so the dashboard always renders.

const IDS = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL' }
const URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd'
const REFRESH_MS = 60_000

export function useLivePrices() {
  const [prices, setPrices] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(URL, { headers: { accept: 'application/json' } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const next = {}
        for (const [id, sym] of Object.entries(IDS)) {
          if (json[id]?.usd) next[sym] = json[id].usd
        }
        if (!cancelled && Object.keys(next).length) {
          setPrices(next)
          setStatus('live')
        } else if (!cancelled) {
          setStatus('fallback')
        }
      } catch {
        if (!cancelled) setStatus('fallback')
      }
    }

    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return { prices, status }
}
