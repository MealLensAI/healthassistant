import { Link } from 'react-router-dom'
import { cn } from '@/lib/care/utils'
import { useTheme } from '@/lib/care/theme'
import { LOGO_SRC, LOGO_WHITE_SRC } from '@/components/Logo'

/** Same API/sizing as meallensaidieticnafrontend `components/Logo`. */
export function Logo({
  compact = false,
  inverse = false,
  to,
  className,
}: {
  compact?: boolean
  inverse?: boolean
  to?: string
  className?: string
}) {
  const { theme } = useTheme()
  const lightOnDark = inverse || theme === 'dark'
  const image = (
    <img
      src={lightOnDark ? LOGO_WHITE_SRC : LOGO_SRC}
      alt="MealLensAI"
      className={cn(
        'w-auto max-w-[180px] object-contain object-left',
        className ?? (compact ? 'h-8' : 'h-10'),
      )}
      width={533}
      height={186}
    />
  )

  if (!to) return image

  return (
    <Link to={to} className="inline-flex max-w-full items-center" aria-label="MealLensAI home">
      {image}
    </Link>
  )
}
