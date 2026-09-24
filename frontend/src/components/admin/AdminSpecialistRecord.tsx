import type { ReactNode } from 'react'
import type { AvailabilitySlot, EducationItem, ExperienceItem } from '@/lib/care/types'
import { ProfilePhoto } from '@/components/care-ui/PhotoViewer'
import { Pill } from '@/components/care-ui/Primitives'
import { AvailabilityGrid } from '@/components/admin/AvailabilityGrid'

export function AdminSpecialistRecord({
  name,
  title,
  avatar,
  email,
  phone,
  country,
  yearsExperience,
  workplace,
  bio,
  specialties,
  languages,
  education,
  experience,
  availability,
  status,
  children,
}: {
  name: string
  title?: string
  avatar?: string
  email?: string
  phone?: string
  country: string
  yearsExperience: number
  workplace?: string
  bio: string
  specialties: string[]
  languages: string[]
  education: EducationItem[]
  experience: ExperienceItem[]
  availability: AvailabilitySlot[]
  status?: string
  children?: ReactNode
}) {
  return (
    <div className="space-y-5">
      <section className="hy-card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:p-6">
        <ProfilePhoto
          src={avatar}
          name={name}
          className="h-[88px] w-[88px] rounded-full object-cover shadow-md ring-2 ring-white"
          fallbackClassName="grid h-[88px] w-[88px] place-items-center rounded-full bg-navy-soft text-xl font-bold text-navy"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-extrabold text-ink">{name}</h2>
            {status && (
              <span className="rounded-full bg-navy-soft px-2 py-0.5 text-[11px] font-bold uppercase text-navy">
                {status.replace('_', ' ')}
              </span>
            )}
          </div>
          <p className="text-sm text-muted">
            {title ? `${title} · ` : ''}
            {country}
            {workplace ? ` · ${workplace}` : ''}
          </p>
          <p className="mt-2 text-sm text-ink">{yearsExperience} years of experience</p>
          {specialties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {specialties.map((item) => (
                <Pill key={item}>{item}</Pill>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="hy-card grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Email" value={email || '—'} />
        <Field label="Phone" value={phone || '—'} />
        <Field label="Country" value={country} />
        <Field label="Workplace" value={workplace || '—'} />
        <Field label="Languages" value={languages.join(', ') || '—'} />
        <Field label="Years of experience" value={String(yearsExperience)} />
        <div className="sm:col-span-2">
          <p className="hy-label">Biography</p>
          <p className="rounded-xl bg-panel p-3 text-sm leading-relaxed">{bio}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="hy-label">Education</p>
          {education.length === 0 ? (
            <p className="text-sm text-muted">No education listed.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {education.map((item) => (
                <li key={`${item.school}-${item.year}`}>
                  {item.degree}, {item.school} ({item.year})
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="sm:col-span-2">
          <p className="hy-label">Professional experience</p>
          {experience.length === 0 ? (
            <p className="text-sm text-muted">No work history listed.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {experience.map((item) => (
                <li key={`${item.org}-${item.role}`} className="rounded-xl bg-panel px-3 py-2">
                  <p className="font-semibold text-ink">{item.role}</p>
                  <p className="text-xs text-muted">
                    {item.org} · {item.years}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <AvailabilityGrid slots={availability} />
      {children}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="hy-label">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
