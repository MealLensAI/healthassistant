import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'leaf'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium tracking-normal transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' && 'h-8 rounded-md px-3 text-xs',
        size === 'md' && 'h-10 rounded-md px-4 text-sm',
        size === 'lg' && 'h-11 rounded-md px-5 text-sm',
        variant === 'primary' && 'bg-[#0E3E77] text-white hover:bg-[#082A54] shadow-soft',
        variant === 'secondary' && 'bg-navy-soft text-navy hover:opacity-90',
        variant === 'ghost' && 'bg-transparent text-ink hover:bg-panel',
        variant === 'danger' && 'bg-destructive text-white hover:opacity-90',
        variant === 'outline' && 'border border-line bg-surface text-ink hover:bg-panel',
        variant === 'leaf' && 'bg-[#397F5E] text-white hover:bg-[#2C6349]',
        className,
      )}
      {...props}
    />
  )
}
