import { FileUp } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { SpecialtyPicker } from '../../components/dietitians/SpecialtyPicker'
import { useApp } from '../../context'
import { validateApplication, type ApplicationDraft } from '../../lib/domain'
import { cn, formatDate } from '../../lib/utils'

const emptyDraft: ApplicationDraft = {
  fullName: '',
  email: '',
  phone: '',
  country: '',
  yearsExperience: '',
  bio: '',
  specialties: [],
  workplace: '',
  languages: 'English',
  degreeSchool: '',
  degreeTitle: '',
  experience: [{ role: '', org: '', years: '' }],
  education: [{ school: '', degree: '', year: '' }],
  documents: { photo: false, license: false, degree1: false, degree2: false },
}

export function ApplyPage() {
  const { currentUser, applications, dietitians, submitApplication } = useApp()
  const [params, setParams] = useSearchParams()
  const application = applications.find((item) => item.userId === currentUser?.id)
  const me = dietitians.find((item) => item.userId === currentUser?.id)
  const existing = application
  const registered = Boolean(application || me)
  const [editing, setEditing] = useState(!registered || params.get('edit') === '1')
  const [step, setStep] = useState(1)
  const [draft, setDraft] = useState<ApplicationDraft>(() =>
    application
      ? {
          fullName: application.fullName,
          email: application.email,
          phone: application.phone,
          country: application.country,
          yearsExperience: String(application.yearsExperience),
          bio: application.bio,
          specialties: application.specialties,
          workplace: application.workplace,
          languages: application.languages.join(', '),
          degreeSchool: application.education[0]?.school ?? '',
          degreeTitle: application.education[0]?.degree ?? '',
          experience: application.experience?.length ? application.experience : [{ role: '', org: application.workplace, years: '' }],
          education: application.education.length
            ? application.education
            : [{ school: application.education[0]?.school ?? '', degree: application.education[0]?.degree ?? '', year: application.education[0]?.year ?? '' }],
          documents: {
            photo: application.documents.some((doc) => doc.kind === 'photo' && doc.uploaded),
            license: application.documents.some((doc) => doc.kind === 'license' && doc.uploaded),
            degree1: application.documents.some((doc) => doc.kind === 'degree1' && doc.uploaded),
            degree2: application.documents.some((doc) => doc.kind === 'degree2' && doc.uploaded),
          },
        }
      : me
        ? {
            fullName: me.name,
            email: currentUser?.email ?? '',
            phone: '',
            country: me.country,
            yearsExperience: String(me.yearsExperience),
            bio: me.bio,
            specialties: me.specialties,
            workplace: me.workplace,
            languages: me.languages.join(', '),
            degreeSchool: me.education[0]?.school ?? '',
            degreeTitle: me.education[0]?.degree ?? '',
            experience: me.experience.length ? me.experience : [{ role: '', org: me.workplace, years: '' }],
            education: me.education.length ? me.education : [{ school: '', degree: '', year: '' }],
            documents: {
              photo: true,
              license: me.documents.some((doc) => doc.kind === 'license'),
              degree1: me.documents.some((doc) => doc.kind === 'degree'),
              degree2: true,
            },
          }
        : {
            ...emptyDraft,
            fullName: currentUser?.name ?? '',
            email: currentUser?.email ?? '',
            country: currentUser?.country ?? '',
          },
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<Record<string, string>>({})
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})

  const statusCopy = useMemo(() => {
    if (existing?.status === 'pending') return 'Your application is in the admin verification queue.'
    if (existing?.status === 'needs_info') return `Admin requested more info: ${existing.moreInfoRequest ?? 'Please update your documents.'}`
    if (existing?.status === 'approved' || me?.status === 'approved') return 'You are approved and visible to patients.'
    if (registered) return 'Your registration is on file. Edit if something needs updating.'
    return 'Complete the credentialing form. Uploads are mandatory before review.'
  }, [existing, me, registered])

  function markFile(kind: keyof ApplicationDraft['documents'], file?: File) {
    setDraft((current) => ({
      ...current,
      documents: { ...current.documents, [kind]: Boolean(file) },
    }))
    if (file) {
      setFiles((current) => ({ ...current, [kind]: file.name }))
      const reader = new FileReader()
      reader.onload = () => setFileUrls((current) => ({ ...current, [kind]: String(reader.result) }))
      reader.readAsDataURL(file)
    }
  }

  function submit() {
    const nextErrors = validateApplication(draft)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setStep(nextErrors.fullName || nextErrors.email || nextErrors.country ? 1 : nextErrors.license || nextErrors.degree1 || nextErrors.degree2 ? 2 : 3)
      return
    }
    submitApplication({
      userId: currentUser?.id ?? '',
      fullName: draft.fullName,
      email: draft.email,
      phone: draft.phone,
      country: draft.country,
      yearsExperience: Number(draft.yearsExperience),
      bio: draft.bio,
      specialties: draft.specialties,
      workplace: draft.workplace,
      languages: draft.languages.split(',').map((item) => item.trim()).filter(Boolean),
      education: (draft.education.length ? draft.education : [{ school: draft.degreeSchool, degree: draft.degreeTitle, year: '2018' }])
        .filter((item) => item.school.trim() || item.degree.trim())
        .map((item) => ({
          school: item.school || 'University',
          degree: item.degree || 'Degree',
          year: item.year || '2018',
        })),
      experience: draft.experience
        .filter((item) => item.role.trim() || item.org.trim())
        .map((item) => ({
          role: item.role || 'Dietitian',
          org: item.org || draft.workplace || 'Practice',
          years: item.years || 'Current',
        })),
      documents: [
        { kind: 'photo', name: 'Profile Photo', fileName: files.photo ?? 'profile.jpg', uploaded: draft.documents.photo, url: fileUrls.photo || currentUser?.avatar },
        { kind: 'license', name: 'Practice License', fileName: files.license ?? 'license.pdf', uploaded: true, url: fileUrls.license },
        { kind: 'degree1', name: 'University Degree 1', fileName: files.degree1 ?? 'degree-1.pdf', uploaded: true, url: fileUrls.degree1 },
        { kind: 'degree2', name: 'University Degree 2', fileName: files.degree2 ?? 'degree-2.pdf', uploaded: true, url: fileUrls.degree2 },
      ],
    })
    setEditing(false)
    setParams({})
  }

  if (registered && !editing) {
    const approved = existing?.status === 'approved' || me?.status === 'approved'
    const statusLabel =
      existing?.status === 'needs_info'
        ? 'Needs more information'
        : existing?.status === 'pending'
          ? 'In review'
          : approved
            ? 'Approved'
            : 'Submitted'

    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="rounded-lg bg-navy-soft px-6 py-5">
          <p className="hy-eyebrow">Specialist registration</p>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">
            {approved ? "You're approved" : 'Your application is in.'}
          </h1>
          <p className="mt-1 text-sm text-ink">{statusCopy}</p>
        </div>
        {approved && (
          <div className="rounded-2xl border border-leaf/20 bg-leaf-soft px-5 py-4 text-sm text-leaf-deep">
            Admin has approved your credentials. Patients can now find you in search and book care.
          </div>
        )}
        <div className="hy-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-navy">{statusLabel}</p>
              <h2 className="mt-1 text-lg font-bold text-ink">{existing?.fullName ?? me?.name}</h2>
              <p className="text-sm text-muted">
                {existing ? `Submitted ${formatDate(existing.submittedAt)} · ` : ''}
                {existing?.workplace ?? me?.workplace}
              </p>
            </div>
            <Button
              onClick={() => {
                setEditing(true)
                setParams({ edit: '1' })
              }}
            >
              Edit
            </Button>
          </div>
          {existing?.status === 'needs_info' && existing.moreInfoRequest && (
            <p className="mt-4 rounded-2xl bg-panel p-3 text-sm text-ink">{existing.moreInfoRequest}</p>
          )}
          <ul className="mt-5 space-y-2 text-sm text-muted">
            <li>
              {(existing?.experience?.length ?? me?.experience.length ?? 0)} work history{' '}
              {(existing?.experience?.length ?? me?.experience.length ?? 0) === 1 ? 'role' : 'roles'}
            </li>
            <li>
              {(existing?.education.length ?? me?.education.length ?? 0)}{' '}
              {(existing?.education.length ?? me?.education.length ?? 0) === 1 ? 'degree' : 'degrees'}
            </li>
            <li>{(existing?.specialties ?? me?.specialties ?? []).join(', ') || 'No specialties listed'}</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-lg bg-navy-soft px-6 py-5">
        <p className="hy-eyebrow">Specialist registration</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink">
          {existing ? 'Your registration' : 'Join as a verified specialist'}
        </h1>
        <p className="mt-1 text-sm text-ink">{statusCopy}</p>
      </div>

      <div className="flex gap-2 text-xs font-semibold">
        {[1, 2, 3, 4].map((item) => (
          <button
            key={item}
            onClick={() => setStep(item)}
            className={cn(
              'flex-1 rounded-full py-2',
              step === item ? 'bg-navy text-white' : 'bg-white text-muted border border-line',
            )}
          >
            Step {item}
          </button>
        ))}
      </div>

      <div className="hy-card p-6">
        {step === 1 && (
          <section className="grid gap-4 sm:grid-cols-2">
            <h2 className="sm:col-span-2 text-lg font-bold">1. Personal Details</h2>
            <Field label="Full Name" error={errors.fullName}>
              <input className="hy-input" value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input className="hy-input" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="hy-input" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
            </Field>
            <Field label="Country" error={errors.country}>
              <input className="hy-input" value={draft.country} onChange={(event) => setDraft({ ...draft, country: event.target.value })} />
            </Field>
          </section>
        )}

        {step === 2 && (
          <section>
            <h2 className="text-lg font-bold">2. Professional Credentials</h2>
            <p className="mb-4 text-sm text-muted">Upload official, verifiable PDFs. These are mandatory.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <UploadBox label="Profile Photo" hint="JPG or PNG" uploaded={draft.documents.photo} fileName={files.photo} onFile={(file) => markFile('photo', file)} accept="image/*" />
              <UploadBox label="Practice License (PDF)" hint="Required" uploaded={draft.documents.license} fileName={files.license} error={errors.license} onFile={(file) => markFile('license', file)} />
              <UploadBox label="University Degree 1 (PDF)" hint="Required" uploaded={draft.documents.degree1} fileName={files.degree1} error={errors.degree1} onFile={(file) => markFile('degree1', file)} />
              <UploadBox label="University Degree 2 (PDF)" hint="Required" uploaded={draft.documents.degree2} fileName={files.degree2} error={errors.degree2} onFile={(file) => markFile('degree2', file)} />
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="space-y-4">
            <h2 className="text-lg font-bold">3. Professional Details</h2>
            <Field label="Years of Experience" error={errors.yearsExperience}>
              <input className="hy-input" type="number" min={0} value={draft.yearsExperience} onChange={(event) => setDraft({ ...draft, yearsExperience: event.target.value })} />
            </Field>
            <Field label="Biography & Specialties" error={errors.bio}>
              <textarea className="hy-input min-h-32" value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} />
            </Field>
            <div>
              <p className="hy-label">Specialties</p>
              <p className="mt-1 text-xs text-muted">Add your own, or pick from suggestions. Click a selected specialty to remove it.</p>
              <div className="mt-2">
                <SpecialtyPicker
                  value={draft.specialties}
                  onChange={(specialties) => setDraft({ ...draft, specialties })}
                />
              </div>
              {errors.specialties && <p className="mt-1 text-xs text-destructive">{errors.specialties}</p>}
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="space-y-5">
            <h2 className="text-lg font-bold">4. Professional Experience</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Current workplace">
                <input className="hy-input" value={draft.workplace} onChange={(event) => setDraft({ ...draft, workplace: event.target.value })} />
              </Field>
              <Field label="Languages">
                <input className="hy-input" value={draft.languages} onChange={(event) => setDraft({ ...draft, languages: event.target.value })} />
              </Field>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-ink">Work history</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft({ ...draft, experience: [...draft.experience, { role: '', org: '', years: '' }] })}
                >
                  Add another role
                </Button>
              </div>
              <div className="space-y-3">
                {draft.experience.map((item, index) => (
                  <div key={`exp-${index}`} className="grid gap-3 rounded-2xl bg-panel p-3 sm:grid-cols-3">
                    <Field label="Role">
                      <input
                        className="hy-input"
                        value={item.role}
                        onChange={(event) => {
                          const experience = [...draft.experience]
                          experience[index] = { ...item, role: event.target.value }
                          setDraft({ ...draft, experience })
                        }}
                      />
                    </Field>
                    <Field label="Organisation">
                      <input
                        className="hy-input"
                        value={item.org}
                        onChange={(event) => {
                          const experience = [...draft.experience]
                          experience[index] = { ...item, org: event.target.value }
                          setDraft({ ...draft, experience })
                        }}
                      />
                    </Field>
                    <div className="flex items-end gap-2">
                      <Field label="Years">
                        <input
                          className="hy-input"
                          placeholder="2018 — Present"
                          value={item.years}
                          onChange={(event) => {
                            const experience = [...draft.experience]
                            experience[index] = { ...item, years: event.target.value }
                            setDraft({ ...draft, experience })
                          }}
                        />
                      </Field>
                      {draft.experience.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDraft({ ...draft, experience: draft.experience.filter((_, i) => i !== index) })}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-ink">Education</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDraft({ ...draft, education: [...draft.education, { school: '', degree: '', year: '' }] })}
                >
                  Add another degree
                </Button>
              </div>
              <div className="space-y-3">
                {draft.education.map((item, index) => (
                  <div key={`edu-${index}`} className="grid gap-3 rounded-2xl bg-panel p-3 sm:grid-cols-3">
                    <Field label="School">
                      <input
                        className="hy-input"
                        value={item.school}
                        onChange={(event) => {
                          const education = [...draft.education]
                          education[index] = { ...item, school: event.target.value }
                          setDraft({ ...draft, education })
                        }}
                      />
                    </Field>
                    <Field label="Degree title">
                      <input
                        className="hy-input"
                        value={item.degree}
                        onChange={(event) => {
                          const education = [...draft.education]
                          education[index] = { ...item, degree: event.target.value }
                          setDraft({ ...draft, education })
                        }}
                      />
                    </Field>
                    <div className="flex items-end gap-2">
                      <Field label="Year">
                        <input
                          className="hy-input"
                          value={item.year}
                          onChange={(event) => {
                            const education = [...draft.education]
                            education[index] = { ...item, year: event.target.value }
                            setDraft({ ...draft, education })
                          }}
                        />
                      </Field>
                      {draft.education.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDraft({ ...draft, education: draft.education.filter((_, i) => i !== index) })}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="mt-6 flex justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              if (step === 1 && registered) {
                setEditing(false)
                setParams({})
                return
              }
              setStep((value) => Math.max(1, value - 1))
            }}
            disabled={step === 1 && !registered}
          >
            {step === 1 && registered ? 'Close' : 'Back'}
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep((value) => value + 1)}>Continue</Button>
          ) : (
            <Button onClick={submit} data-testid="submit-application">
              Submit for verification
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label>
      <span className="hy-label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  )
}

function UploadBox({
  label,
  hint,
  uploaded,
  fileName,
  error,
  accept = 'application/pdf',
  onFile,
}: {
  label: string
  hint: string
  uploaded: boolean
  fileName?: string
  error?: string
  accept?: string
  onFile: (file?: File) => void
}) {
  return (
    <label className={cn('cursor-pointer rounded-2xl border border-dashed p-4', uploaded ? 'border-navy bg-navy-soft' : 'border-line bg-panel')}>
      <FileUp className="mb-2 text-navy" size={20} />
      <p className="text-sm font-bold text-ink">{label}</p>
      <p className="text-xs text-muted">{uploaded ? fileName : hint}</p>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      <input type="file" accept={accept} className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
    </label>
  )
}
