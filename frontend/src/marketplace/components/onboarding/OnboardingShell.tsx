import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '../Logo'
import { ThemeToggle } from '../ThemeToggle'
import { cn } from '../../lib/utils'

export function OnboardingShell({
  image,
  kicker,
  headline,
  support,
  step,
  stepCount,
  children,
}: {
  image: string
  kicker: string
  headline: string
  support: string
  step: number
  stepCount: number
  children: ReactNode
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0E3E77]/92 via-[#0E3E77]/72 to-[#082A54]/88" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <Logo inverse className="h-12" />
          <p className="font-display mt-8 max-w-xl text-[44px] font-extrabold leading-[1.1] text-white">{headline}</p>
          <p className="mt-4 max-w-md text-base text-white/88">{support}</p>
        </div>
      </section>
      <section className="relative flex items-center justify-center bg-cream px-4 py-10 sm:px-6 sm:py-12">
        <ThemeToggle className="absolute right-4 top-4 sm:right-6 sm:top-6" />
        <div className="w-full max-w-md">
          <Logo className="h-12" />
          <p className="hy-eyebrow mt-8">{kicker}</p>
          <div className="mt-4 flex gap-2" aria-label={`Step ${step} of ${stepCount}`}>
            {Array.from({ length: stepCount }, (_, index) => (
              <span
                key={index}
                className={cn('h-1.5 flex-1 rounded-full', index < step ? 'bg-navy' : 'bg-line')}
              />
            ))}
          </div>
          <div className="mt-6">{children}</div>
          <p className="mt-6 text-center text-sm text-muted">
            Already have a workspace?{' '}
            <Link to="/login" className="font-semibold text-navy hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </div>
  )
}
