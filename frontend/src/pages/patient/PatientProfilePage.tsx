import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { PasswordSecuritySection } from '@/components/PasswordSecuritySection'
import { Button } from '@/components/care-ui/Button'
import { ProfilePhoto } from '@/components/care-ui/PhotoViewer'
import { Pill } from '@/components/care-ui/Primitives'
import { useApp } from '@/lib/care/context'
import { formatDate } from '@/lib/care/utils'
import { emptyPatientProfile } from '@/lib/care/patients'
import type { PatientProfile } from '@/lib/care/types'

export function PatientProfilePage() {
  const { currentUser, appointments, files, patientProfiles, savePatientProfile } = useApp()
  const stored = patientProfiles.find((item) => item.userId === currentUser?.id)
  const [draft, setDraft] = useState<PatientProfile | null>(stored ?? null)

  const mine = files.filter((file) => file.ownerId === currentUser?.id)
  const recordFiles = mine.filter((file) => file.category === 'labs' || file.name.toLowerCase().includes('referral'))

  const stats = useMemo(
    () => ({
      appointments: appointments.filter((item) => item.patientId === currentUser?.id).length,
      files: mine.length,
    }),
    [appointments, currentUser, mine.length],
  )

  if (!currentUser) return null

  const profile = draft ?? emptyPatientProfile(currentUser.id, currentUser.name)

  function set<K extends keyof PatientProfile>(key: K, value: PatientProfile[K]) {
    setDraft({ ...profile, [key]: value })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="hy-card p-6">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <ProfilePhoto
            src={currentUser.avatar}
            name={currentUser.name}
            className="h-24 w-24 rounded-full object-cover"
            fallbackClassName="grid h-24 w-24 place-items-center rounded-full bg-navy-soft text-xl font-bold text-navy"
          />
          <div className="min-w-0 flex-1">
            <p className="hy-eyebrow">Patient profile</p>
            <h1 className="mt-1 text-2xl font-extrabold text-ink">{profile.preferredName || currentUser.name}</h1>
            <p className="text-sm text-muted">{currentUser.email}</p>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Clinical and personal snapshot your dietitian reviews before consultations.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Appointments" value={stats.appointments} />
        <Stat label="Files" value={stats.files} />
      </div>

      <Section title="Demographics & contact">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full legal name" value={profile.legalName} onChange={(value) => set('legalName', value)} />
          <Field label="Preferred name" value={profile.preferredName} onChange={(value) => set('preferredName', value)} />
          <Field label="Date of birth" value={profile.dateOfBirth} type="date" onChange={(value) => set('dateOfBirth', value)} />
          <Field label="Age" value={String(profile.age)} onChange={(value) => set('age', Number(value) || 0)} />
          <Field label="Biological sex" value={profile.biologicalSex} onChange={(value) => set('biologicalSex', value)} />
          <Field label="Gender identity" value={profile.genderIdentity} onChange={(value) => set('genderIdentity', value)} />
          <Field label="Primary language" value={profile.primaryLanguage} onChange={(value) => set('primaryLanguage', value)} />
          <Field label="Phone" value={profile.phone} onChange={(value) => set('phone', value)} />
          <Field label="Emergency contact" value={profile.emergencyContact} onChange={(value) => set('emergencyContact', value)} />
          <Field label="Emergency phone" value={profile.emergencyPhone} onChange={(value) => set('emergencyPhone', value)} />
        </div>
      </Section>

      <Section title="Health & chronic conditions">
        <div className="space-y-3">
          {profile.conditions.map((condition, index) => (
            <article key={`${condition.name}-${index}`} className="rounded-xl bg-panel p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Condition"
                  value={condition.name}
                  onChange={(value) =>
                    set(
                      'conditions',
                      profile.conditions.map((item, i) => (i === index ? { ...item, name: value } : item)),
                    )
                  }
                />
                <Field
                  label="Date of diagnosis"
                  value={condition.diagnosed}
                  type="date"
                  onChange={(value) =>
                    set(
                      'conditions',
                      profile.conditions.map((item, i) => (i === index ? { ...item, diagnosed: value } : item)),
                    )
                  }
                />
                <Field
                  label="Managing physician"
                  value={condition.physician}
                  onChange={(value) =>
                    set(
                      'conditions',
                      profile.conditions.map((item, i) => (i === index ? { ...item, physician: value } : item)),
                    )
                  }
                />
                <Field
                  label="Clinic"
                  value={condition.clinic}
                  onChange={(value) =>
                    set(
                      'conditions',
                      profile.conditions.map((item, i) => (i === index ? { ...item, clinic: value } : item)),
                    )
                  }
                />
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Biometrics & physical stats">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Height (cm)" value={String(profile.heightCm)} onChange={(value) => set('heightCm', Number(value) || 0)} />
          <Field label="Current weight (kg)" value={String(profile.weightKg)} onChange={(value) => set('weightKg', Number(value) || 0)} />
          <Field label="Target weight range" value={profile.targetWeightKg} onChange={(value) => set('targetWeightKg', value)} />
          <Field label="Baseline BMI" value={String(profile.bmi)} onChange={(value) => set('bmi', Number(value) || 0)} />
        </div>
        <label className="mt-3 block">
          <span className="hy-label">Major weight fluctuations</span>
          <textarea className="hy-input min-h-20" value={profile.weightHistory} onChange={(event) => set('weightHistory', event.target.value)} />
        </label>
      </Section>

      <Section title="Dietary profile & allergies">
        <ChipField label="Severe food allergies" values={profile.allergies} onChange={(values) => set('allergies', values)} />
        <ChipField label="Intolerances" values={profile.intolerances} onChange={(values) => set('intolerances', values)} />
        <ChipField label="Lifestyle preferences" values={profile.dietPreferences} onChange={(values) => set('dietPreferences', values)} />
      </Section>

      <Section title="Current medications & supplements">
        <label>
          <span className="hy-label">Active prescriptions and dosages</span>
          <textarea className="hy-input min-h-20" value={profile.medications} onChange={(event) => set('medications', event.target.value)} />
        </label>
        <label className="mt-3 block">
          <span className="hy-label">Vitamins and supplements</span>
          <textarea className="hy-input min-h-20" value={profile.supplements} onChange={(event) => set('supplements', event.target.value)} />
        </label>
      </Section>

      <Section title="Activity & lifestyle">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Occupation type" value={profile.occupation} onChange={(value) => set('occupation', value)} />
          <Field label="Sleep patterns" value={profile.sleep} onChange={(value) => set('sleep', value)} />
          <Field label="Weekly exercise" value={profile.exercise} onChange={(value) => set('exercise', value)} />
          <Field label="Alcohol" value={profile.alcohol} onChange={(value) => set('alcohol', value)} />
          <Field label="Smoking status" value={profile.smoking} onChange={(value) => set('smoking', value)} />
        </div>
      </Section>

      <Section title="Uploaded records archive">
        <p className="mb-3 text-sm text-muted">Quick links to blood work, lipid panels, HbA1c tests, and referral notes.</p>
        <ul className="space-y-2">
          {recordFiles.map((file) => (
            <li key={file.id} className="flex items-center justify-between rounded-xl bg-panel px-3 py-3 text-sm">
              <span>
                <span className="font-semibold text-ink">{file.name}</span>
                <span className="ml-2 text-muted">{formatDate(file.uploadedAt)}</span>
              </span>
              <Pill>{file.category}</Pill>
            </li>
          ))}
        </ul>
        {recordFiles.length === 0 && <p className="text-sm text-muted">No lab records yet.</p>}
        <Link to="/files" className="mt-3 inline-block text-sm font-semibold text-navy">
          Open My Health Files
        </Link>
      </Section>

      <PasswordSecuritySection />

      <Button onClick={() => savePatientProfile({ ...profile, userId: currentUser.id })}>Save clinical profile</Button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="hy-card p-5">
      <h2 className="font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label>
      <span className="hy-label">{label}</span>
      <input className="hy-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function ChipField({ label, values, onChange }: { label: string; values: string[]; onChange: (values: string[]) => void }) {
  return (
    <label className="mb-3 block">
      <span className="hy-label">{label}</span>
      <input
        className="hy-input"
        value={values.join(', ')}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
      />
      <span className="mt-1 block text-xs text-muted">Comma-separated</span>
    </label>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="hy-card p-4 text-center">
      <p className="text-2xl font-extrabold text-navy">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}
