import { Link } from 'react-router-dom'

/** The personal mark: a plain "ZM" monogram in `currentColor`, so it reads on
 *  both light and dark chrome. Sized by the parent via `className`. */
export function LogoMark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden focusable="false">
      <text
        x="32"
        y="44"
        textAnchor="middle"
        fontFamily="Inter, -apple-system, Segoe UI, Roboto, sans-serif"
        fontSize="34"
        fontWeight="700"
        letterSpacing="0.5"
        fill="currentColor"
      >
        ZM
      </text>
    </svg>
  )
}

export function Logo({ to = '/app', compact = false }: { to?: string; compact?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2" aria-label="Zachary Moulton — home">
      <LogoMark className="h-7 w-7 shrink-0" />
      {!compact && <span className="text-base font-semibold tracking-tight">Zachary Moulton</span>}
    </Link>
  )
}
