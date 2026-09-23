import { describe, expect, it } from 'vitest'
import { defaultAvailability } from './utils'
import { dietitianReply, timeSlotsFor } from './care'

describe('dietitianReply', () => {
  it('answers booking questions with a slot prompt', () => {
    expect(dietitianReply('Can I book an appointment tomorrow?', 'Emily')).toMatch(/slot|left|lock/i)
  })

  it('points video questions to the call panel', () => {
    expect(dietitianReply('Can we do a video call?', 'Emily')).toMatch(/video/i)
  })
})

describe('timeSlotsFor', () => {
  it('returns empty slots on a disabled weekend', () => {
    const saturday = nextWeekdayIso(6)
    expect(timeSlotsFor(defaultAvailability(), saturday)).toEqual([])
  })

  it('builds 30-minute openings on a weekday', () => {
    const monday = nextWeekdayIso(1)
    const slots = timeSlotsFor(defaultAvailability(), monday)
    expect(slots[0]).toBe('09:00')
    expect(slots.includes('09:30')).toBe(true)
    expect(slots.at(-1)).toBe('16:30')
  })
})

function nextWeekdayIso(dayIndex: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  const delta = (dayIndex - date.getDay() + 7) % 7
  date.setDate(date.getDate() + delta)
  return date.toISOString().slice(0, 10)
}
