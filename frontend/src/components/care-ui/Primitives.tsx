import { Star } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/care/utils'
import { useAttachmentUrl } from '@/lib/care/useAttachmentUrl'

export function Stars({
  value,
  size = 14,
  onSelect,
}: {
  value: number
  size?: number
  onSelect?: (value: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  const shown = onSelect ? hovered || value : Math.round(value)
  return (
    <span
      className="inline-flex items-center gap-0.5 text-navy"
      aria-label={`${value} out of 5`}
      onMouseLeave={() => setHovered(0)}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1
        const filled = starValue <= shown
        if (!onSelect) {
          return (
            <Star
              key={index}
              size={size}
              className={cn(filled ? 'fill-navy text-navy' : 'text-line')}
            />
          )
        }
        return (
          <button
            key={index}
            type="button"
            aria-label={`${starValue} star${starValue === 1 ? '' : 's'}`}
            onMouseEnter={() => setHovered(starValue)}
            onFocus={() => setHovered(starValue)}
            onClick={() => onSelect(starValue)}
            className="rounded-sm p-0.5 hover:scale-110"
          >
            <Star size={size} className={cn(filled ? 'fill-navy text-navy' : 'text-line')} />
          </button>
        )
      })}
    </span>
  )
}

export function Pill({ children, tone = 'mint' }: { children: ReactNode; tone?: 'mint' | 'slate' | 'blue' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
        tone === 'mint' && 'bg-navy-soft text-navy',
        tone === 'slate' && 'bg-panel text-muted',
        tone === 'blue' && 'bg-navy-soft text-navy',
      )}
    >
      {children}
    </span>
  )
}

export function Avatar({
  src,
  name,
  size = 44,
  to,
}: {
  src?: string
  name: string
  size?: number
  to?: string
}) {
  const [broken, setBroken] = useState(false)
  const resolved = useAttachmentUrl(
    src
      ? /^(https?:|blob:|data:)/i.test(src)
        ? { url: src }
        : { objectKey: src, bucket: 'avatars' }
      : undefined,
  )
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
  const showImage = Boolean(resolved) && !broken

  useEffect(() => {
    setBroken(false)
  }, [resolved])

  const body = (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-soft text-xs font-bold text-navy ring-2 ring-white"
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <img
          src={resolved}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initials
      )}
    </span>
  )

  if (!to) return body
  return (
    <Link
      to={to}
      aria-label={`View ${name} profile`}
      className="relative z-10 inline-flex shrink-0 cursor-pointer rounded-full hover:opacity-90"
      onClick={(event) => event.stopPropagation()}
    >
      {body}
    </Link>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function trapScroll(event: WheelEvent | TouchEvent) {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-modal-scroll]')) return
      event.preventDefault()
    }

    document.addEventListener('wheel', trapScroll, { passive: false })
    document.addEventListener('touchmove', trapScroll, { passive: false })
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('wheel', trapScroll)
      document.removeEventListener('touchmove', trapScroll)
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button className="absolute inset-0 bg-ink/40" aria-label="Close dialog" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-lg bg-white shadow-elevated',
          wide ? 'max-w-3xl' : 'max-w-lg',
        )}
        onWheel={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-6">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button className="text-sm text-muted hover:text-ink" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4" data-modal-scroll>
          {children}
        </div>
      </div>
    </div>
  )
}
