import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DietitianHero } from '../../components/dietitians/DietitianHero'
import { SpecialtyPicker } from '../../components/dietitians/SpecialtyPicker'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context'
import { COUNTRIES } from '../../data/mock'

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
    title: me?.title ?? currentUser?.title ?? 'Dietitian',
    country: currentUser?.country ?? me?.country ?? '',
    workplace: me?.workplace ?? '',
    yearsExperience: String(me?.yearsExperience ?? application?.yearsExperience ?? ''),
    bio: me?.bio ?? '',
    specialties: me?.specialties ?? [],
    languages: (me?.languages ?? []).join(', '),
  })

  if (!currentUser) return null

  const preview = me
    ? {
        ...me,
        name: details.name || me.name,
        title: details.title || me.title,
        country: details.country || me.country,
        specialties: details.specialties.length ? details.specialties : me.specialties,
        yearsExperience: Number(details.yearsExperience) || me.yearsExperience,
      }
    : null

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
      {preview ? (
        <DietitianHero
          dietitian={preview}
          editable
          onChangeCover={(coverImage) => saveAccount({ coverImage }, 'Cover photo updated.')}
          onChangeAvatar={(avatar) => saveAccount({ avatar }, 'Profile photo updated.')}
        />
      ) : (
        <div className="hy-card p-10 text-center">
          <p className="font-semibold text-ink">Your public profile isn’t live yet.</p>
          <p className="mt-2 text-sm text-muted">Register as a specialist so patients can find you.</p>
          <Link to="/dietitian/apply" className="mt-4 inline-block">
            <Button>Your Registration</Button>
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
