import React from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/** Canonical MealLensAI wordmark — navy on light, white on dark. */
export const LOGO_SRC = '/care/logo.png'
export const LOGO_WHITE_SRC = '/care/logo-white.png'
export const LOGO_MARK_SRC = '/care/logo-mark.png'
export const FAVICON_SRC = '/care/favicon.png'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Force white wordmark (e.g. on dark / primary backgrounds). */
  inverse?: boolean
  /** Optional link target. */
  to?: string
}

const SIZE_CLASS: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'h-7',
  md: 'h-8',
  lg: 'h-10',
  xl: 'h-12',
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '', inverse = false, to }) => {
  const image = (
    <img
      src={inverse ? LOGO_WHITE_SRC : LOGO_SRC}
      alt="MealLensAI"
      className={cn('w-auto max-w-[200px] object-contain object-left', SIZE_CLASS[size], className)}
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

export default Logo
