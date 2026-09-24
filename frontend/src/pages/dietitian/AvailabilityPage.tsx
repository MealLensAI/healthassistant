import { useState } from 'react'
import { Button } from '@/components/care-ui/Button'
import { useApp } from '@/lib/care/context'
import { WEEKDAYS } from '@/lib/care/utils'
import type { AvailabilitySlot } from '@/lib/care/types'

export function AvailabilityPage() {
  const { currentUser, dietitians, updateAvailability } = useApp()
  const me = dietitians.find((item) => item.userId === currentUser?.id)
  const [slots, setSlots] = useState<AvailabilitySlot[]>(
    me?.availability.length
      ? me.availability
      : WEEKDAYS.map((day) => ({ day, enabled: !['Sat', 'Sun'].includes(day), start: '09:00', end: '17:00' })),
  )

  if (!me) {
    return <div className="hy-card p-8 text-sm text-muted">Submit an application first so we can attach availability to your profile.</div>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Availability setup</h1>
        <p className="text-sm text-muted">Define the weekly windows patients can request. Example: Mon–Wed 12:00–17:00.</p>
      </div>
      <div className="hy-card divide-y divide-line">
        {slots.map((slot, index) => (
          <div key={slot.day} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <label className="flex w-24 items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={slot.enabled}
                onChange={(event) => {
                  const next = [...slots]
                  next[index] = { ...slot, enabled: event.target.checked }
                  setSlots(next)
                }}
              />
              {slot.day}
            </label>
            <input
              type="time"
              className="hy-input sm:w-36"
              value={slot.start}
              disabled={!slot.enabled}
              onChange={(event) => {
                const next = [...slots]
                next[index] = { ...slot, start: event.target.value }
                setSlots(next)
              }}
            />
            <span className="text-xs text-muted">to</span>
            <input
              type="time"
              className="hy-input sm:w-36"
              value={slot.end}
              disabled={!slot.enabled}
              onChange={(event) => {
                const next = [...slots]
                next[index] = { ...slot, end: event.target.value }
                setSlots(next)
              }}
            />
          </div>
        ))}
      </div>
      <Button onClick={() => updateAvailability(me.id, slots)}>Save availability</Button>
    </div>
  )
}
