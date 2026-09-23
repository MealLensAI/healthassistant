import type { AvailabilitySlot } from '../types'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export function upcomingDays(count = 8) {
  const start = new Date()
  start.setHours(12, 0, 0, 0)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      iso: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
      weekday: DAY_NAMES[date.getDay()] ?? 'Mon',
    }
  })
}

export function timeSlotsFor(availability: AvailabilitySlot[], iso: string) {
  const date = new Date(`${iso}T12:00:00`)
  const weekday = DAY_NAMES[date.getDay()]
  const window = availability.find((slot) => slot.day === weekday)
  if (!window?.enabled) return []

  const [startHour, startMinute] = window.start.split(':').map(Number)
  const [endHour, endMinute] = window.end.split(':').map(Number)
  const start = (startHour ?? 9) * 60 + (startMinute ?? 0)
  const end = (endHour ?? 17) * 60 + (endMinute ?? 0)
  const slots: string[] = []
  for (let minutes = start; minutes + 30 <= end; minutes += 30) {
    const hour = Math.floor(minutes / 60)
    const minute = minutes % 60
    slots.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
  }
  return slots
}

export function dietitianReply(patientText: string, dietitianFirstName: string) {
  const text = patientText.toLowerCase()
  if (text.includes('hello') || text.startsWith('hi') || text.includes('hey')) {
    return `Hi — ${dietitianFirstName} here. I’m with you. What’s feeling hardest with food this week?`
  }
  if (text.includes('book') || text.includes('appointment') || text.includes('schedule') || text.includes('slot')) {
    return `Perfect. Choose a day and time on the left and I’ll lock it in. Video or chat consults both work.`
  }
  if (text.includes('call') || text.includes('video') || text.includes('zoom')) {
    return `We can start a video consult right now from the panel on the right whenever you’re ready.`
  }
  if (text.includes('shared') && (text.includes('file') || text.includes('.pdf') || text.includes('.png') || text.includes('.jpg'))) {
    return `Got it — I’ll review that file before we talk. If you have labs or a food diary too, send those here as well.`
  }
  if (text.includes('lab') || text.includes('glucose') || text.includes('a1c') || text.includes('diary') || text.includes('upload')) {
    return `Thanks for flagging the labs. Upload them in chat if you can — I’ll review them before we meet.`
  }
  if (text.includes('ibs') || text.includes('bloat') || text.includes('stomach')) {
    return `Got it. Let’s keep a short food-and-symptom note until our session so we can spot triggers quickly.`
  }
  if (text.includes('thank')) {
    return `You’re welcome. Message me any time — I’ll reply here.`
  }
  return `I’ve read that. Keep the notes coming, and book a slot when you want live time. I’ll reply here as we go.`
}
