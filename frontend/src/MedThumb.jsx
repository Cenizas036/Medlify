import { useState } from 'react'
import { Pill } from 'lucide-react'
import { MED_IMAGES } from './medImages.js'

const S = { fill: 'currentColor', fillOpacity: 0.16 }
const ART = {
  tablet: <><circle cx="24" cy="24" r="13" {...S} /><path d="M15 33L33 15" /></>,
  capsule: <g transform="rotate(-40 24 24)"><rect x="7" y="15" width="34" height="18" rx="9" {...S} /><path d="M24 15v18" /></g>,
  syrup: <><rect x="14" y="19" width="20" height="23" rx="4" {...S} /><rect x="19" y="11" width="10" height="8" rx="1.5" /><rect x="18" y="6" width="12" height="5" rx="1.5" /><path d="M14 29h20M24 33v6M21 36h6" /></>,
  cream: <><path d="M15 15h18l-2.5 23h-13z" {...S} /><rect x="19" y="7" width="10" height="8" rx="2" /><path d="M17.5 38h13" /></>,
  injection: <g transform="rotate(-45 24 24)"><rect x="12" y="18" width="20" height="12" rx="2.5" {...S} /><path d="M32 24h9M12 24H7M7 19v10M18 18v12M23 18v7M28 18v5" /></g>,
  sachet: <><path d="M13 10h22v28H13z" {...S} /><path d="M13 14h22M13 34h22M20 22h8M20 27h8" /></>,
}

export default function MedThumb({ name, form, size = 44, tint }) {
  const [bad, setBad] = useState(false)
  const src = MED_IMAGES[name]
  if (src && !bad) return <img className="mthumb" src={src} alt={name} loading="lazy" onError={() => setBad(true)} style={{ width: size, height: size }} />
  const hue = 140 + [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 70, 7)
  const art = ART[form]
  return (
    <span className="mthumb" title="Illustration" aria-hidden="true"
      style={{ width: size, height: size, background: tint?.bg || `hsl(${hue} 55% 92%)`, color: tint?.fg || `hsl(${hue} 55% 30%)` }}>
      {art
        ? <svg viewBox="0 0 48 48" width={size * 0.64} height={size * 0.64} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{art}</svg>
        : <Pill size={Math.round(size * 0.45)} />}
    </span>
  )
}
