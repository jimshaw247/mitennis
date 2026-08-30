import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build stamp: compact build number (YYMMDDHHMM, ET) + readable ET time,
// computed at build time. Works on Vercel (no .git needed).
const _now = new Date()
const _et = _now.toLocaleString('en-US', {
  timeZone: 'America/New_York', month: 'short', day: 'numeric',
  hour: 'numeric', minute: '2-digit',
})
const _parts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York', year: '2-digit', month: '2-digit',
  day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
}).formatToParts(_now).reduce((a, p) => (a[p.type] = p.value, a), {})
const _num = `${_parts.year}${_parts.month}${_parts.day}${_parts.hour}${_parts.minute}`
const buildStamp = `build ${_num} · ${_et} ET`

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: { __BUILD__: JSON.stringify(buildStamp) },
})
