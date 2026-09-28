import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAttachmentUrl } from '@/lib/care/useAttachmentUrl'

export function PhotoViewer({
  open,
  src,
  name,
  onClose,
  profileTo,
}: {
  open: boolean
  src: string
  name: string
  onClose: () => void
  profileTo?: string
}) {
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
      data-testid="photo-viewer"
      role="dialog"
      aria-label={`${name} photo`}
    >
      <button type="button" className="absolute inset-0 bg-ink/80" aria-label="Dismiss photo" onClick={onClose} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col items-center">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-0 top-0 z-20 grid h-10 w-10 place-items-center rounded-full bg-white text-ink shadow-md hover:bg-navy-soft sm:-right-2 sm:-top-2"
          aria-label="Close photo"
        >
          <X size={18} />
        </button>
        <img
          src={src}
          alt={`${name} full photo`}
          className="max-h-[min(82vh,720px)] w-full rounded-2xl bg-black/20 object-contain shadow-elevated"
          referrerPolicy="no-referrer"
        />
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-white">
          <p className="text-sm font-semibold">{name}</p>
          {profileTo ? (
            <Link
              to={profileTo}
              className="text-sm font-semibold text-white underline underline-offset-2 hover:text-navy-soft"
              onClick={onClose}
            >
              View profile
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ProfilePhoto({
  src,
  name,
  className,
  fallbackClassName,
}: {
  src?: string
  name: string
  className?: string
  fallbackClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const [broken, setBroken] = useState(false)
  const resolved = useAttachmentUrl(
    src
      ? /^(https?:|blob:|data:)/i.test(src)
        ? { url: src }
        : { objectKey: src, bucket: 'avatars' }
      : undefined,
  )
  const initial = name.trim().slice(0, 1) || '?'

  useEffect(() => {
    setBroken(false)
  }, [resolved])

  if (!resolved || broken) {
    return <div className={fallbackClassName ?? className}>{initial}</div>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${name} photo`}
        className="cursor-zoom-in rounded-[inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <img
          src={resolved}
          alt={name}
          className={className}
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      </button>
      <PhotoViewer open={open} src={resolved} name={name} onClose={() => setOpen(false)} />
    </>
  )
}
