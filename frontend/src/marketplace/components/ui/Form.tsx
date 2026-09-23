import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="hy-label">{label}</span>
      {children}
    </label>
  )
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className, ...rest } = props
  return (
    <Field label={label}>
      <input className={cn('hy-input', className)} {...rest} />
    </Field>
  )
}

export function SelectField(props: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const { label, className, children, ...rest } = props
  return (
    <Field label={label}>
      <select className={cn('hy-input', className)} {...rest}>
        {children}
      </select>
    </Field>
  )
}

export function AreaField(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const { label, className, ...rest } = props
  return (
    <Field label={label}>
      <textarea className={cn('hy-input min-h-24', className)} {...rest} />
    </Field>
  )
}

export function Toggle({
  on,
  onChange,
  label,
  hint,
}: {
  on: boolean
  onChange: (value: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        {hint ? <p className="text-xs text-muted">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          on ? 'bg-[#0E3E77]' : 'bg-line',
        )}
      >
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-[#ffffff] transition-transform', on ? 'left-5' : 'left-0.5')} />
      </button>
    </div>
  )
}

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="hy-card p-5">
      <h2 className="font-bold text-ink">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}
