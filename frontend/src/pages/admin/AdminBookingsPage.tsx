import { CalendarDays, Mail, Phone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/care-ui/Primitives'
import { useApp } from '@/lib/care/context'
import { dietitianProfilePath, patientProfilePath } from '@/lib/care/profilePaths'
import type { Appointment, DietitianApplication, LiveCall, PatientProfile, User } from '@/lib/care/types'
import { cn } from '@/lib/care/utils'

type Filter = 'upcoming' | 'now' | 'all'

function phoneHref(phone?: string) {
  const cleaned = (phone || '').replace(/[^\d+]/g, '')
  return cleaned ? `tel:${cleaned}` : ''
}

function appointmentStamp(item: Appointment) {
  return `${item.date}T${item.time || '00:00'}`
}

function isHappeningNow(item: Appointment, now = new Date()) {
  if (item.status !== 'upcoming' || !item.date) return false
  const start = new Date(`${item.date}T${item.time || '00:00'}:00`)
  if (Number.isNaN(start.getTime())) return false
  const minutes = (now.getTime() - start.getTime()) / 60000
  return minutes >= -30 && minutes <= 120
}

function presenceLabel(userId: string | undefined, liveCalls: LiveCall[]) {
  if (!userId) return 'Offline'
  const live = liveCalls.find((call) => call.callerId === userId || call.calleeId === userId)
  if (!live) return 'Offline'
  return live.status === 'live' ? 'On a call' : 'Ringing'
}

function firstPhone(...candidates: Array<string | undefined>) {
  return candidates.map((item) => item?.trim()).find(Boolean) || ''
}

function firstEmail(...candidates: Array<string | undefined>) {
  return candidates.map((item) => item?.trim()).find(Boolean) || ''
}

function PartyCard({
  label,
  name,
  avatar,
  to,
  email,
  phone,
  details,
  presence,
}: {
  label: string
  name: string
  avatar?: string
  to?: string
  email: string
  phone: string
  details: string[]
  presence: string
}) {
  const callTo = phoneHref(phone)
  return (
    <div className="min-w-0 rounded-2xl bg-panel/60 p-4">
      <div className="flex items-start gap-3">
        <Avatar src={avatar} name={name} size={48} to={to} />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-navy">{label}</p>
          {to ? (
            <Link to={to} className="block truncate font-bold text-ink hover:text-navy">
              {name}
            </Link>
          ) : (
            <p className="truncate font-bold text-ink">{name}</p>
          )}
          <p className="mt-0.5 text-xs text-muted">{details.filter(Boolean).join(' · ') || 'No extra details yet'}</p>
          <p className={cn('mt-1 text-xs font-semibold', presence === 'Offline' ? 'text-muted' : 'text-leaf-deep')}>
            {presence}
          </p>
        </div>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Mail size={14} className="shrink-0 text-muted" />
          {email ? (
            <a href={`mailto:${email}`} className="min-w-0 truncate font-medium text-navy hover:underline">
              {email}
            </a>
          ) : (
            <span className="text-muted">No email on file</span>
          )}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <Phone size={14} className="shrink-0 text-muted" />
          {phone ? (
            <a href={callTo} className="min-w-0 truncate font-medium text-navy hover:underline">
              {phone}
            </a>
          ) : (
            <span className="text-muted">No phone on file</span>
          )}
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        {callTo ? (
          <a href={callTo} className="inline-flex h-9 items-center justify-center rounded-md bg-[#0E3E77] px-3 text-xs font-medium text-white hover:bg-[#082A54]">
            <Phone size={14} className="mr-1.5" />
            Call
          </a>
        ) : (
          <span className="inline-flex h-9 items-center rounded-md bg-white px-3 text-xs font-medium text-muted ring-1 ring-line">
            No number to call
          </span>
        )}
        {email ? (
          <a href={`mailto:${email}`} className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-medium text-ink hover:bg-panel">
            <Mail size={14} className="mr-1.5" />
            Email
          </a>
        ) : null}
      </div>
    </div>
  )
}

export function AdminBookingsPage() {
  const { appointments, dietitians, users, applications, patientProfiles, patientSettings, liveCalls, currentUser } = useApp()
  const [filter, setFilter] = useState<Filter>('upcoming')

  const rows = useMemo(() => {
    const visible = appointments.filter((item) => item.status !== 'deleted')
    const ranked = visible.slice().sort((a, b) => {
      const rank = (status: string) => (status === 'upcoming' ? 0 : status === 'completed' ? 1 : 2)
      const byStatus = rank(a.status) - rank(b.status)
      if (byStatus !== 0) return byStatus
      return appointmentStamp(a).localeCompare(appointmentStamp(b))
    })
    if (filter === 'upcoming') return ranked.filter((item) => item.status === 'upcoming')
    if (filter === 'now') return ranked.filter((item) => isHappeningNow(item))
    return ranked
  }, [appointments, filter])

  const upcomingCount = appointments.filter((item) => item.status === 'upcoming').length
  const liveCount = appointments.filter((item) => isHappeningNow(item)).length

  function patientUser(id: string): User | undefined {
    return users.find((item) => item.id === id)
  }

  function patientProfile(id: string): PatientProfile | undefined {
    return patientProfiles.find((item) => item.userId === id)
  }

  function dietitianApplication(userId: string): DietitianApplication | undefined {
    return applications.find((item) => item.userId === userId)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-navy-soft px-6 py-5">
        <p className="hy-eyebrow">Admin Dashboard — Bookings</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink">Appointment bookings</h1>
        <p className="text-sm text-ink">
          See who booked, which dietitian they booked, and call either person if they were offline.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['upcoming', `Upcoming (${upcomingCount})`],
            ['now', `Happening now (${liveCount})`],
            ['all', `All (${appointments.filter((item) => item.status !== 'deleted').length})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-bold',
              filter === id ? 'bg-navy text-white' : 'bg-white text-navy ring-1 ring-navy/20',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {rows.map((appointment) => {
          const listing = dietitians.find((item) => item.id === appointment.dietitianId)
          const patient = patientUser(appointment.patientId)
          const profile = patientProfile(appointment.patientId)
          const settings = patientSettings.find((item) => item.userId === appointment.patientId)
          const dietitianUser = listing ? users.find((item) => item.id === listing.userId) : undefined
          const application = listing ? dietitianApplication(listing.userId) : undefined
          const happening = isHappeningNow(appointment)
          const patientName = profile?.preferredName || profile?.legalName || patient?.name || 'Patient'
          const dietitianName = listing?.name || dietitianUser?.name || application?.fullName || 'Dietitian'
          const patientPhone = firstPhone(patient?.phone, profile?.phone, settings?.phone)
          const dietitianPhone = firstPhone(dietitianUser?.phone, application?.phone)
          const patientEmail = firstEmail(patient?.email, settings?.email)
          const dietitianEmail = firstEmail(dietitianUser?.email, application?.email)

          return (
            <article key={appointment.id} className="hy-card space-y-4 p-5" data-testid={`booking-${appointment.id}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-ink">{appointment.topic || 'Consultation'}</h2>
                    <span className="rounded-full bg-navy-soft px-2 py-0.5 text-[11px] font-bold uppercase text-navy">
                      {appointment.status}
                    </span>
                    {happening ? (
                      <span className="rounded-full bg-leaf-soft px-2 py-0.5 text-[11px] font-bold uppercase text-leaf-deep">
                        Happening now
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <CalendarDays size={14} />
                    {appointment.date || 'Date TBD'} · {appointment.time || 'Time TBD'} · {appointment.type}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <PartyCard
                  label="Who booked"
                  name={patientName}
                  avatar={patient?.avatar}
                  to={patient ? patientProfilePath(patient.id, currentUser?.role ?? 'admin') : undefined}
                  email={patientEmail}
                  phone={patientPhone}
                  details={[patient?.country, profile?.primaryLanguage, profile?.conditions?.map((item) => item.name).filter(Boolean)[0]]}
                  presence={presenceLabel(patient?.id, liveCalls)}
                />
                <PartyCard
                  label="Booked with"
                  name={dietitianName}
                  avatar={listing?.avatar || dietitianUser?.avatar}
                  to={listing ? dietitianProfilePath(listing.id, currentUser?.role ?? 'admin') : undefined}
                  email={dietitianEmail}
                  phone={dietitianPhone}
                  details={[listing?.title || dietitianUser?.title, listing?.workplace, listing?.country || dietitianUser?.country || application?.country]}
                  presence={presenceLabel(listing?.userId || dietitianUser?.id, liveCalls)}
                />
              </div>
            </article>
          )
        })}
        {rows.length === 0 && (
          <div className="hy-card p-10 text-center text-sm text-muted">
            {filter === 'now' ? 'No appointments are happening right now.' : 'No bookings yet. New patient bookings will show up here.'}
          </div>
        )}
      </div>
    </div>
  )
}
