"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Loader2 } from 'lucide-react'
import { PasswordSecuritySection } from '@/components/PasswordSecuritySection'
import { Button } from '@/components/care-ui/Button'
import { ProfilePhoto } from '@/components/care-ui/PhotoViewer'
import { Pill } from '@/components/care-ui/Primitives'
import { useApp } from '@/lib/care/context'
import { apiEnabled, uploadCareAsset } from '@/lib/care/api'
import { formatDate } from '@/lib/care/utils'
import { emptyPatientProfile } from '@/lib/care/patients'
import type { PatientProfile } from '@/lib/care/types'
import { useAuth } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import {
  useSicknessSettings,
  type SicknessSettings,
} from '@/hooks/useSicknessSettings'
import EngagementBanners from '@/components/EngagementBanners'
import { usePageHeader } from '@/components/PageHeaderContext'
import {
  readStoredProfilePhoto,
  writeStoredProfilePhoto,
} from '@/components/AppTopBar'
function genderFromSettings(gender?: SicknessSettings['gender']) {
  if (gender === 'male') return 'Male'
  if (gender === 'female') return 'Female'
  if (gender === 'other') return 'Other'
  return ''
}

function genderToSettings(value: string): SicknessSettings['gender'] | undefined {
  const lower = value.trim().toLowerCase()
  if (lower === 'male' || lower === 'm') return 'male'
  if (lower === 'female' || lower === 'f' || lower === 'woman') return 'female'
  if (lower) return 'other'
  return undefined
}

function activityLabel(level?: SicknessSettings['activityLevel']) {
  switch (level) {
    case 'sedentary':
      return 'Sedentary'
    case 'light':
      return 'Light'
    case 'moderate':
      return 'Moderate'
    case 'active':
      return 'Active'
    case 'very_active':
      return 'Very Active'
    default:
      return ''
  }
}

/**
 * Patient profile — marketplace clinical UI + MealLens meal-recommendation health fields.
 */
export default function Profile() {
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentUser, appointments, files, patientProfiles, savePatientProfile, saveAccount } = useApp()
  const {
    settings,
    loading: healthLoading,
    saveSettings,
    hasResolved,
  } = useSicknessSettings()
  const fileInputRef = useRef<HTMLInputElement>(null)

  usePageHeader('Profile')

  const stored = patientProfiles.find((item) => item.userId === currentUser?.id)
  const [draft, setDraft] = useState<PatientProfile | null>(null)
  const [waist, setWaist] = useState('')
  const [activityLevel, setActivityLevel] = useState<SicknessSettings['activityLevel'] | ''>('')
  const [healthGoal, setHealthGoal] = useState('')
  const [location, setLocation] = useState('')
  const [healthCondition, setHealthCondition] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingHealth, setSavingHealth] = useState(false)
  const [seededFromHealth, setSeededFromHealth] = useState(false)
  const [photoUrl, setPhotoUrl] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoUploadInFlight = useRef(false)
  useEffect(() => { setPhotoUrl('') }, [user?.uid, currentUser?.id])

  const displayName =
    user?.displayName ||
    (currentUser?.name && currentUser.name !== 'Member' ? currentUser.name : '') ||
    user?.email?.split('@')[0] ||
    'Member'
  const email = currentUser?.email || user?.email || ''
  const avatar = currentUser?.avatar || photoUrl || user?.photoURL || readStoredProfilePhoto(user?.uid) || ''
  const careUserId = currentUser?.id || user?.uid || 'local'

  async function handlePhotoPick(file: File | null) {
    if (photoUploadInFlight.current || !file) return
    if (!file || !file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please choose an image.', variant: 'destructive' })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Too large', description: 'Please use an image under 5MB.', variant: 'destructive' })
      return
    }
    photoUploadInFlight.current = true
    setUploadingPhoto(true)
    try {
      if (currentUser && apiEnabled()) {
        const stored = await uploadCareAsset(file, 'avatar')
        // Optimistic local preview so the UI doesn't wait on a signed URL refresh.
        const preview = URL.createObjectURL(file)
        setPhotoUrl(preview)
        writeStoredProfilePhoto(preview, user?.uid)
        try {
          const raw = window.localStorage.getItem('user_data')
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, unknown>
            parsed.photoURL = preview
            parsed.avatar = stored.objectKey
            window.localStorage.setItem('user_data', JSON.stringify(parsed))
          }
        } catch {
          /* ignore */
        }
        window.dispatchEvent(new Event('meallensai-profile-photo'))
        await saveAccount({ avatar: stored.objectKey }, 'Profile photo updated.')
        return
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      if (!dataUrl) return
      setPhotoUrl(dataUrl)
      writeStoredProfilePhoto(dataUrl, user?.uid)
      window.dispatchEvent(new Event('meallensai-profile-photo'))
      if (currentUser) await saveAccount({ avatar: dataUrl }, 'Profile photo updated.')
      else toast({ title: 'Photo saved', description: 'Your profile picture was updated.' })
    } catch (error) {
      toast({
        title: 'Could not upload photo',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      photoUploadInFlight.current = false
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const mine = files.filter((file) => file.ownerId === currentUser?.id)
  const recordFiles = mine.filter(
    (file) => file.category === 'labs' || file.name.toLowerCase().includes('referral'),
  )

  const stats = useMemo(
    () => ({
      appointments: appointments.filter((item) => item.patientId === currentUser?.id).length,
      files: mine.length,
    }),
    [appointments, currentUser, mine.length],
  )

  // Seed draft from care profile + MealLens health settings once loaded
  useEffect(() => {
    if (!hasResolved || seededFromHealth) return
    const base =
      stored ??
      emptyPatientProfile(careUserId, displayName, {
        age: settings.age || 0,
        biologicalSex: genderFromSettings(settings.gender),
        genderIdentity: genderFromSettings(settings.gender),
        heightCm: settings.height || 0,
        weightKg: settings.weight || 0,
        conditions: settings.sicknessType
          ? [{ name: settings.sicknessType, diagnosed: '', physician: '', clinic: '' }]
          : [{ name: '', diagnosed: '', physician: '', clinic: '' }],
      })

    const merged: PatientProfile = {
      ...base,
      age: base.age || settings.age || 0,
      biologicalSex: base.biologicalSex || genderFromSettings(settings.gender),
      heightCm: base.heightCm || settings.height || 0,
      weightKg: base.weightKg || settings.weight || 0,
      conditions:
        base.conditions?.some((c) => c.name) || !settings.sicknessType
          ? base.conditions
          : [{ name: settings.sicknessType, diagnosed: '', physician: '', clinic: '' }],
    }

    setDraft(merged)
    setWaist(settings.waist != null ? String(settings.waist) : '')
    setActivityLevel(settings.activityLevel || '')
    setHealthGoal(settings.goal || '')
    setLocation(settings.location || '')
    setHealthCondition(
      settings.sicknessType || merged.conditions.find((c) => c.name)?.name || '',
    )
    setSeededFromHealth(true)
  }, [hasResolved, seededFromHealth, stored, careUserId, displayName, settings])

  const profile = draft ?? emptyPatientProfile(careUserId, displayName)

  function set<K extends keyof PatientProfile>(key: K, value: PatientProfile[K]) {
    setDraft({ ...profile, [key]: value })
  }

  function buildMealPayload(): { payload: SicknessSettings; condition: string } | null {
    const gender = genderToSettings(profile.biologicalSex || profile.genderIdentity)
    const condition =
      healthCondition.trim() ||
      profile.conditions.map((c) => c.name).filter(Boolean).join(', ')

    const mealPayload: SicknessSettings = {
      hasSickness: true,
      sicknessType: condition,
      age: profile.age || undefined,
      gender,
      height: profile.heightCm || undefined,
      weight: profile.weightKg || undefined,
      waist: waist ? parseFloat(waist) || undefined : undefined,
      activityLevel: activityLevel || undefined,
      goal: healthGoal || undefined,
      location: location || undefined,
    }

    const missing: string[] = []
    if (!mealPayload.age) missing.push('Age')
    if (!mealPayload.gender) missing.push('Gender')
    if (!mealPayload.height) missing.push('Height')
    if (!mealPayload.weight) missing.push('Weight')
    if (!mealPayload.waist) missing.push('Waist Circumference')
    if (!mealPayload.activityLevel) missing.push('Activity Level')
    if (!mealPayload.sicknessType) missing.push('Health Condition')
    if (!mealPayload.goal) missing.push('Health Goal')
    if (!mealPayload.location) missing.push('Location')

    if (missing.length) {
      toast({
        title: 'Missing required fields',
        description: `Please fill: ${missing.join(', ')}`,
        variant: 'destructive',
      })
      return null
    }
    return { payload: mealPayload, condition }
  }

  /** Save only MealLens health / meal-recommendation fields. */
  async function handleSaveHealth() {
    const built = buildMealPayload()
    if (!built) return
    setSavingHealth(true)
    try {
      const result = await saveSettings(built.payload)
      if (result.success) {
        toast({
          title: 'Health information saved',
          description: 'Your meal recommendation health profile was updated.',
        })
      } else {
        toast({
          title: 'Could not save health information',
          description: result.error || 'Please try again.',
          variant: 'destructive',
        })
      }
    } finally {
      setSavingHealth(false)
    }
  }

  /** Save clinical care profile and health / meal-recommendation fields together. */
  async function handleSave() {
    const built = buildMealPayload()
    if (!built) return
    const { payload: mealPayload, condition } = built

    setSaving(true)
    try {
      const nextProfile: PatientProfile = {
        ...profile,
        userId: careUserId,
        conditions:
          profile.conditions.some((c) => c.name.trim())
            ? profile.conditions
            : [{ name: condition, diagnosed: '', physician: '', clinic: '' }],
      }
      if (currentUser) {
        savePatientProfile(nextProfile)
      }
      const result = await saveSettings(mealPayload)
      if (result.success) {
        toast({
          title: 'Profile saved',
          description: 'Your clinical profile and meal recommendations info were updated.',
        })
      } else {
        toast({
          title: 'Partially saved',
          description: result.error || 'Care profile saved, but meal health info failed.',
          variant: 'destructive',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  if (!hasResolved && healthLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <p className="text-sm text-muted">Loading profile…</p>
      </div>
    )
  }

  return (
    <div className="min-h-full">
      <EngagementBanners />
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="hy-card p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="relative" aria-busy={uploadingPhoto}>
              <ProfilePhoto
                src={avatar}
                name={displayName}
                className="h-24 w-24 rounded-full object-cover"
                fallbackClassName="grid h-24 w-24 place-items-center rounded-full bg-navy-soft text-xl font-bold text-navy"
              />
              {uploadingPhoto && (
                <div className="absolute inset-0 z-10 grid place-items-center rounded-full bg-black/50 text-white" role="status">
                  <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
                  <span className="sr-only">Uploading profile photo…</span>
                </div>
              )}
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 grid h-9 w-9 place-items-center rounded-full border border-line bg-white text-navy shadow-soft hover:bg-panel"
                aria-label="Upload profile photo"
              >
                <Camera size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                disabled={uploadingPhoto}
                accept="image/*"
                className="hidden"
                onChange={(event) => handlePhotoPick(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="hy-eyebrow">Patient profile</p>
              <h1 className="mt-1 text-2xl font-extrabold text-ink">
                {profile.preferredName || displayName}
              </h1>
              <p className="text-sm text-muted">{email}</p>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Clinical and personal snapshot your dietitian reviews before consultations.
              </p>
              <button
                type="button"
                disabled={uploadingPhoto}
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-sm font-semibold text-navy hover:underline"
              >
                {uploadingPhoto ? 'Uploading photo…' : avatar ? 'Change profile photo' : 'Upload profile photo'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stat label="Appointments" value={stats.appointments} />
          <Stat label="Files" value={stats.files} />
        </div>

        <Section title="Meal recommendations">
          <p className="mb-4 text-sm text-muted">
            This information helps us provide personalized medical meal recommendations
          </p>
          <p className="mb-3 text-sm font-semibold text-ink">Health Information Details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Age *"
              value={String(profile.age || '')}
              onChange={(value) => set('age', Number(value) || 0)}
              type="number"
            />
            <label>
              <span className="hy-label">Gender *</span>
              <select
                className="hy-input"
                value={genderToSettings(profile.biologicalSex) || ''}
                onChange={(event) => {
                  const g = event.target.value as SicknessSettings['gender'] | ''
                  const label = genderFromSettings(g || undefined)
                  setDraft({
                    ...profile,
                    biologicalSex: label,
                    genderIdentity: profile.genderIdentity || label,
                  })
                }}
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <Field
              label="Height (cm) *"
              value={String(profile.heightCm || '')}
              onChange={(value) => set('heightCm', Number(value) || 0)}
              type="number"
            />
            <Field
              label="Weight (kg) *"
              value={String(profile.weightKg || '')}
              onChange={(value) => set('weightKg', Number(value) || 0)}
              type="number"
            />
            <Field
              label="Waist Circumference (cm) *"
              value={waist}
              onChange={setWaist}
              type="number"
            />
            <label>
              <span className="hy-label">Activity Level *</span>
              <select
                className="hy-input"
                value={activityLevel}
                onChange={(event) =>
                  setActivityLevel(event.target.value as SicknessSettings['activityLevel'] | '')
                }
              >
                <option value="">Select activity level</option>
                <option value="sedentary">Sedentary</option>
                <option value="light">Light</option>
                <option value="moderate">Moderate</option>
                <option value="active">Active</option>
                <option value="very_active">Very Active</option>
              </select>
            </label>
            <Field
              label="Health Condition *"
              value={healthCondition}
              onChange={(value) => {
                setHealthCondition(value)
                const next = [...profile.conditions]
                if (next[0]) next[0] = { ...next[0], name: value }
                else next.push({ name: value, diagnosed: '', physician: '', clinic: '' })
                set('conditions', next)
              }}
            />
            <label>
              <span className="hy-label">Health Goal *</span>
              <select
                className="hy-input"
                value={healthGoal}
                onChange={(event) => setHealthGoal(event.target.value)}
              >
                <option value="">Select your goal</option>
                <option value="Heal">Heal</option>
                <option value="Improve">Improve</option>
                <option value="Manage">Manage</option>
                <option value="Restore">Restore</option>
                <option value="Maintain">Maintain</option>
              </select>
            </label>
            <Field label="Location *" value={location} onChange={setLocation} />
          </div>
          {activityLevel ? (
            <p className="mt-2 text-xs text-muted">Selected activity: {activityLabel(activityLevel)}</p>
          ) : null}
          <div className="mt-4">
            <Button
              type="button"
              onClick={() => void handleSaveHealth()}
              disabled={savingHealth || saving}
            >
              {savingHealth ? 'Saving…' : 'Save health information'}
            </Button>
            <p className="mt-2 text-xs text-muted">
              Saves only this health section for meal recommendations. Use “Save clinical profile” below to update everything.
            </p>
          </div>
        </Section>

        <Section title="Demographics & contact">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full legal name" value={profile.legalName} onChange={(value) => set('legalName', value)} />
            <Field label="Preferred name" value={profile.preferredName} onChange={(value) => set('preferredName', value)} />
            <Field
              label="Date of birth"
              value={profile.dateOfBirth}
              type="date"
              onChange={(value) => set('dateOfBirth', value)}
            />
            <Field label="Age" value={String(profile.age || '')} onChange={(value) => set('age', Number(value) || 0)} type="number" />
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
                    onChange={(value) => {
                      set(
                        'conditions',
                        profile.conditions.map((item, i) => (i === index ? { ...item, name: value } : item)),
                      )
                      if (index === 0) setHealthCondition(value)
                    }}
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
            <Field
              label="Height (cm)"
              value={String(profile.heightCm || '')}
              onChange={(value) => set('heightCm', Number(value) || 0)}
              type="number"
            />
            <Field
              label="Current weight (kg)"
              value={String(profile.weightKg || '')}
              onChange={(value) => set('weightKg', Number(value) || 0)}
              type="number"
            />
            <Field
              label="Target weight range"
              value={profile.targetWeightKg}
              onChange={(value) => set('targetWeightKg', value)}
            />
            <Field
              label="Baseline BMI"
              value={String(profile.bmi || '')}
              onChange={(value) => set('bmi', Number(value) || 0)}
              type="number"
            />
          </div>
          <label className="mt-3 block">
            <span className="hy-label">Major weight fluctuations</span>
            <textarea
              className="hy-input min-h-20"
              value={profile.weightHistory}
              onChange={(event) => set('weightHistory', event.target.value)}
            />
          </label>
        </Section>

        <Section title="Dietary profile & allergies">
          <ChipField label="Severe food allergies" values={profile.allergies} onChange={(values) => set('allergies', values)} />
          <ChipField label="Intolerances" values={profile.intolerances} onChange={(values) => set('intolerances', values)} />
          <ChipField
            label="Lifestyle preferences"
            values={profile.dietPreferences}
            onChange={(values) => set('dietPreferences', values)}
          />
        </Section>

        <Section title="Current medications & supplements">
          <label>
            <span className="hy-label">Active prescriptions and dosages</span>
            <textarea
              className="hy-input min-h-20"
              value={profile.medications}
              onChange={(event) => set('medications', event.target.value)}
            />
          </label>
          <label className="mt-3 block">
            <span className="hy-label">Vitamins and supplements</span>
            <textarea
              className="hy-input min-h-20"
              value={profile.supplements}
              onChange={(event) => set('supplements', event.target.value)}
            />
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
          <p className="mb-3 text-sm text-muted">
            Quick links to blood work, lipid panels, HbA1c tests, and referral notes.
          </p>
          <ul className="space-y-2">
            {recordFiles.map((file) => (
              <li
                key={file.id}
                className="flex items-center justify-between rounded-xl bg-panel px-3 py-3 text-sm"
              >
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

        <Button onClick={() => void handleSave()} disabled={saving || savingHealth}>
          {saving ? 'Saving…' : 'Save clinical profile'}
        </Button>
      </div>
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
      <input
        className="hy-input"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function ChipField({
  label,
  values,
  onChange,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
}) {
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
