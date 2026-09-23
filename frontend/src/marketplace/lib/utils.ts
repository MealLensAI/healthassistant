export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatMoney(amount: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

export function ageFromDob(iso: string) {
  if (!iso) return 0
  const birth = new Date(iso)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const month = now.getMonth() - birth.getMonth()
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

export function bodyMassIndex(weightKg: number, heightCm: number) {
  if (!weightKg || !heightCm) return 0
  const meters = heightCm / 100
  return Number((weightKg / (meters * meters)).toFixed(1))
}

export function fileSizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

export function defaultAvailability() {
  return WEEKDAYS.map((day) => ({
    day,
    enabled: day !== 'Sat' && day !== 'Sun',
    start: '09:00',
    end: '17:00',
  }))
}
