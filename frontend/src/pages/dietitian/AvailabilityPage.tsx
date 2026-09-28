import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/care-ui/Button'
import { useApp } from '@/lib/care/context'
import { practicePath } from '@/lib/care/practiceBase'
import { WEEKDAYS } from '@/lib/care/utils'
import type { AvailabilitySlot } from '@/lib/care/types'

export function AvailabilityPage() {
  const location = useLocation()
  const { currentUser, dietitians, applications, updateAvailability } = useApp()
  const me = dietitians.find((item) => item.userId === currentUser?.id)
  const myApplication = applications.find((item) => item.userId === currentUser?.id)
  const registrationTo = practicePath('apply', location.pathname)
  const [slots, setSlots] = useState<AvailabilitySlot[]>(
    WEEKDAYS.map((day) => ({ day, enabled: !['Sat', 'Sun'].includes(day), start: '09:00', end: '17:00' })),
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (me?.availability?.length) {
      setSlots(me.availability)
    }
  }, [me?.id, me?.availability])

  if (!me) {
    return (
      <div className="hy-card space-y-3 p-8 text-sm text-muted">
        <p>Submit an application first so we can attach availability to your profile.</p>
        {myApplication ? (
          <p>
            Your application is {myApplication.status.replace('_', ' ')}. If availability still does not appear,
            refresh this page after a moment.
          </p>
        ) : (
          <Link to={registrationTo} className="inline-block font-semibold text-navy">
            Go to registration form →
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Availability setup</h1>
        <p className="text-sm text-muted">
          Define the weekly windows patients can book. Saved to your marketplace profile in Supabase.
        </p>
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
      <Button
        disabled={saving}
        onClick={() => {
          setSaving(true)
          void Promise.resolve(updateAvailability(me.id, slots)).finally(() => setSaving(false))
        }}
      >
        {saving ? 'Saving…' : 'Save availability'}
      </Button>
    </div>
  )
}
