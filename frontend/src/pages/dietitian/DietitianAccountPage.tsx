import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DietitianHero } from '@/components/dietitians/DietitianHero'
import { SpecialtyPicker } from '@/components/dietitians/SpecialtyPicker'
import { Button } from '@/components/care-ui/Button'
import { useApp } from '@/lib/care/context'
import { uploadCareAsset } from '@/lib/care/api'
import { COUNTRIES } from '@/lib/care/data/mock'
import { draftDietitianFromUser } from '@/lib/care/draftDietitian'
import { practicePath } from '@/lib/care/practiceBase'

export function DietitianAccountPage() {
  const { currentUser, dietitians, applications, toast, saveAccount } = useApp()
  const [notifyPush, setNotifyPush] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState(true)
  const me = dietitians.find((item) => item.userId === currentUser?.id)
  const application = applications.find((item) => item.userId === currentUser?.id)
  const [details, setDetails] = useState({
    name: currentUser?.name ?? me?.name ?? '',
    email: currentUser?.email ?? '',
    phone: currentUser?.phone ?? application?.phone ?? '',
    title: me?.title ?? currentUser?.title ?? '',
    country: currentUser?.country ?? me?.country ?? application?.country ?? '',
    workplace: me?.workplace ?? application?.workplace ?? '',
    yearsExperience: String(me?.yearsExperience ?? application?.yearsExperience ?? ''),
    bio: me?.bio ?? application?.bio ?? '',
    specialties: me?.specialties ?? application?.specialties ?? [],
    languages: (me?.languages ?? application?.languages ?? []).join(', '),
  })

  if (!currentUser) return null

  const baseListing = me || draftDietitianFromUser(currentUser, application)
  const preview = {
    ...baseListing,
    name: details.name || baseListing.name,
    title: details.title || baseListing.title,
    country: details.country || baseListing.country,
    workplace: details.workplace || baseListing.workplace,
    bio: details.bio || baseListing.bio,
    specialties: details.specialties.length ? details.specialties : baseListing.specialties,
    yearsExperience: Number(details.yearsExperience) || baseListing.yearsExperience,
    languages: details.languages
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  }

  function patchDetails(partial: Partial<typeof details>) {
    setDetails((current) => ({ ...current, ...partial }))
  }

  function saveListing() {
    saveAccount(
      {
        name: details.name,
        email: details.email,
        phone: details.phone,
        title: details.title,
        country: details.country,
        workplace: details.workplace,
        yearsExperience: Number(details.yearsExperience) || 0,
        bio: details.bio,
        specialties: details.specialties,
        languages: details.languages
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      },
      'Listing saved.',
    )
  }

  return (
    <div className="space-y-5">
      <DietitianHero
        dietitian={preview}
        editable
        onChangeCover={(file) => { void uploadCareAsset(file, 'avatar').then(({ objectKey }) => saveAccount({ coverImage: objectKey }, 'Cover photo updated.')).catch(() => toast('error', 'Could not upload cover photo.')) }}
        onChangeAvatar={(file) => {
          void uploadCareAsset(file, 'avatar').then(async ({ objectKey: avatar }) => {
          await saveAccount({ avatar }, 'Profile photo updated.')
          try {
            const raw = window.localStorage.getItem('user_data')
            if (raw) {
              const parsed = JSON.parse(raw) as Record<string, unknown>
              parsed.photoURL = avatar
              parsed.avatar = avatar
              window.localStorage.setItem('user_data', JSON.stringify(parsed))
            }
          } catch {
            /* ignore */
          }
          }).catch(() => toast('error', 'Could not upload profile photo.'))
        }}
      />
      {!me && (
        <div className="hy-banner">
          <p className="text-sm font-bold text-navy-deep">Finish registration to go live</p>
          <p className="mt-1 text-sm text-muted">Patients only see you after admin approval. You can edit photos and listing details now.</p>
          <Link to={practicePath('apply')} className="mt-3 inline-block text-sm font-semibold text-navy hover:underline">
            Your Registration
          </Link>
        </div>
      )}

      <section className="hy-card p-5">
        <h2 className="font-bold text-ink">Listing details</h2>
        <p className="mt-1 text-sm text-muted">These fields appear on the public profile patients see.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="hy-label">Full name</span>
            <input className="hy-input" value={details.name} onChange={(event) => patchDetails({ name: event.target.value })} />
          </label>
          <label>
            <span className="hy-label">Title</span>
            <input className="hy-input" value={details.title} onChange={(event) => patchDetails({ title: event.target.value })} />
          </label>
          <label>
            <span className="hy-label">Country</span>
            <select className="hy-input" value={details.country} onChange={(event) => patchDetails({ country: event.target.value })}>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="hy-label">Years experience</span>
            <input
              className="hy-input"
              type="number"
              min={0}
              value={details.yearsExperience}
              onChange={(event) => patchDetails({ yearsExperience: event.target.value })}
            />
          </label>
          <label>
            <span className="hy-label">Workplace</span>
            <input className="hy-input" value={details.workplace} onChange={(event) => patchDetails({ workplace: event.target.value })} />
          </label>
          <label>
            <span className="hy-label">Languages</span>
            <input
              className="hy-input"
              value={details.languages}
              onChange={(event) => patchDetails({ languages: event.target.value })}
              placeholder="English, Spanish"
            />
          </label>
          <label className="sm:col-span-2">
            <span className="hy-label">Email</span>
            <input className="hy-input" type="email" value={details.email} onChange={(event) => patchDetails({ email: event.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className="hy-label">Phone</span>
            <input className="hy-input" value={details.phone} onChange={(event) => patchDetails({ phone: event.target.value })} />
          </label>
          <label className="sm:col-span-2">
            <span className="hy-label">About</span>
            <textarea
              className="hy-input min-h-28"
              value={details.bio}
              onChange={(event) => patchDetails({ bio: event.target.value })}
            />
          </label>
        </div>
        <div className="mt-4">
          <p className="hy-label">Specialties</p>
          <p className="mt-1 text-xs text-muted">Add your own, or pick from suggestions. Click a selected specialty to remove it.</p>
          <div className="mt-2">
            <SpecialtyPicker value={details.specialties} onChange={(specialties) => patchDetails({ specialties })} />
          </div>
        </div>
        <Button className="mt-4" onClick={saveListing}>
          Save listing
        </Button>
      </section>

      <section className="hy-card p-5">
        <h2 className="font-bold text-ink">Notifications</h2>
        <p className="mt-1 text-sm text-muted">Alerts for new patient messages, missed calls, and booking requests.</p>
        <div className="mt-3 space-y-1">
          <Toggle label="Push" checked={notifyPush} onChange={setNotifyPush} />
          <Toggle label="Email" checked={notifyEmail} onChange={setNotifyEmail} />
        </div>
        <Button className="mt-4" variant="outline" onClick={() => toast('success', 'Notification preferences saved.')}>
          Save notifications
        </Button>
      </section>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-[#0E3E77]' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </label>
  )
}
