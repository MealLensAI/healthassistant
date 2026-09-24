import type { AvailabilitySlot } from '@/lib/care/types'

export function AvailabilityGrid({ slots, title = 'Available time' }: { slots: AvailabilitySlot[]; title?: string }) {
  return (
    <section className="hy-card p-6">
      <h2 className="mb-4 font-bold">{title}</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {slots.map((slot) => (
          <div key={slot.day} className="rounded-2xl border border-line bg-panel px-3 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{slot.day}</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {slot.enabled ? `${slot.start} – ${slot.end}` : 'Unavailable'}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
