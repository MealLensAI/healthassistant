import { Download, FileSearch, MapPin, MessageSquare, Video } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { practicePath } from '@/lib/care/practiceBase'
import { FilePreview } from '@/components/files/FilePreview'
import { Button } from '@/components/care-ui/Button'
import { ProfilePhoto } from '@/components/care-ui/PhotoViewer'
import { Modal, Pill } from '@/components/care-ui/Primitives'
import { useApp } from '@/lib/care/context'
import { FILES, PATIENT_PROFILES } from '@/lib/care/data/mock'
import { useCallMedia } from '@/lib/care/callMedia'
import { downloadNamedFile } from '@/lib/care/documents'
import { filesForPatient, filesVisibleToViewer, mergePatientProfile } from '@/lib/care/patients'
import { ageFromDob, bodyMassIndex, formatDate } from '@/lib/care/utils'
import type { PatientFile, User } from '@/lib/care/types'

export function PatientChartPage() {
  const params = useParams()
  const id = params.id ?? params.patientId
  const {
    users,
    patientProfiles,
    files,
    currentUser,
    appointments,
    dietitians,
    conversations,
    patientSettings,
    startCall,
    openConversation,
  } = useApp()
  const { ensureLocalMedia } = useCallMedia()
  const navigate = useNavigate()
  const [viewing, setViewing] = useState<PatientFile | null>(null)

  const seedProfile = PATIENT_PROFILES.find((item) => item.userId === id)
  const profile = mergePatientProfile(
    patientProfiles.find((item) => item.userId === id),
    seedProfile,
  )
  const user: User | undefined =
    users.find((item) => item.id === id) ??
    (id
      ? {
          id,
          name: profile?.preferredName || profile?.legalName || 'Patient',
          email: '',
          role: 'patient',
          avatar: '',
        }
      : undefined)
  const records = useMemo(() => {
    if (!id) return []
    const blocked = patientSettings.find((item) => item.userId === id)?.blockedFileAccessIds
    const live = filesVisibleToViewer({
      files,
      patientId: id,
      viewerId: currentUser?.id,
      viewerRole: currentUser?.role,
      blockedIds: blocked,
    })
    if (currentUser?.role === 'dietitian' && blocked && currentUser.id && blocked.includes(currentUser.id)) {
      return []
    }
    return live.length ? live : filesForPatient(FILES, id)
  }, [currentUser, files, id, patientSettings])
  const visits = appointments.filter((item) => item.patientId === id)
  const conversation = conversations.find(
    (item) => currentUser && item.participantIds.includes(currentUser.id) && item.participantIds.includes(id ?? ''),
  )
  const messagesPath = practicePath(`messages${conversation ? `/${conversation.id}` : ''}`)

  if (!id || !user) {
    return (
      <div className="hy-card p-10 text-center">
        <p className="font-semibold">This patient profile isn’t available.</p>
        <Link
          to={currentUser?.role === 'admin' ? '/admin' : practicePath()}
          className="mt-3 inline-block text-sm font-semibold text-navy"
        >
          Back
        </Link>
      </div>
    )
  }

  const conditions = profile?.conditions ?? []
  const bmi = profile ? bodyMassIndex(profile.weightKg, profile.heightCm) || profile.bmi : 0

  return (
    <div className="space-y-5" data-testid="patient-chart">
      <Link
        to={currentUser?.role === 'admin' ? '/admin' : practicePath()}
        className="text-sm font-semibold text-navy"
      >
        ← Back
      </Link>
      <article className="overflow-hidden rounded-2xl bg-white shadow-card">
        <div className="relative h-40 bg-gradient-to-br from-[#0E3E77] via-[#0E3E77] to-[#397F5E] md:h-48">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
        </div>
        <div className="relative z-10 -mt-12 w-fit px-5 sm:px-8">
          <ProfilePhoto
            src={user.avatar}
            name={user.name}
            className="h-24 w-24 rounded-2xl object-cover shadow-lg ring-4 ring-white md:h-28 md:w-28"
            fallbackClassName="grid h-24 w-24 place-items-center rounded-2xl bg-navy-soft text-xl font-bold text-navy shadow-lg ring-4 ring-white md:h-28 md:w-28"
          />
        </div>
        <div className="px-5 pb-6 sm:px-8">
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="hy-eyebrow">Patient profile</p>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-3xl">
                {profile?.preferredName || user.name}
              </h1>
              <p className="mt-1 text-sm font-medium text-muted">
                {profile?.legalName || user.name}
                {profile?.dateOfBirth ? ` · ${ageFromDob(profile.dateOfBirth)} years` : ''}
              </p>
              {user.email ? <p className="mt-1 text-sm text-muted">{user.email}</p> : null}
              <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                <MapPin size={16} className="text-navy" />
                {user.country ?? '—'}
              </p>
              {conditions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {conditions.map((item) => (
                    <Pill key={item.name}>{item.name}</Pill>
                  ))}
                </div>
              )}
            </div>
            {currentUser?.role === 'dietitian' && (
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                <Button onClick={() => navigate(messagesPath)}>
                  <MessageSquare size={16} /> Message
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    void ensureLocalMedia().finally(() => {
                      const conversationId = openConversation(user.id, user.name)
                      startCall(conversationId, user.id, user.name, user.avatar)
                      navigate(practicePath(`messages/${conversationId}`))
                    })
                  }}
                >
                  <Video size={16} /> Video call
                </Button>
              </div>
            )}
          </div>
        </div>
      </article>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Files" value={String(records.length)} />
        <Stat label="Appointments" value={String(visits.length)} />
        <Stat label="BMI" value={bmi ? String(bmi) : '—'} />
      </div>

      {profile ? (
        <>
          <Section title="Demographics & contact">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Preferred name" value={profile.preferredName} />
              <Info label="Legal name" value={profile.legalName} />
              <Info label="Date of birth" value={profile.dateOfBirth ? formatDate(profile.dateOfBirth) : '—'} />
              <Info
                label="Age"
                value={profile.dateOfBirth ? `${ageFromDob(profile.dateOfBirth)} (${profile.age} on file)` : '—'}
              />
              <Info label="Phone" value={profile.phone} />
              <Info label="Email" value={user.email || '—'} />
              <Info label="Primary language" value={profile.primaryLanguage} />
              <Info label="Biological sex / gender" value={`${profile.biologicalSex} · ${profile.genderIdentity}`} />
            </div>
          </Section>

          <Section title="Health & chronic conditions">
            <ul className="space-y-3">
              {conditions.map((item) => (
                <li key={item.name} className="rounded-2xl bg-panel p-3">
                  <span className="font-semibold text-ink">{item.name}</span>
                  <span className="block text-sm text-muted">
                    Diagnosed {item.diagnosed ? formatDate(item.diagnosed) : '—'}
                  </span>
                  <span className="text-xs text-muted">
                    {item.physician} · {item.clinic}
                  </span>
                </li>
              ))}
            </ul>
            {conditions.length === 0 && <p className="text-sm text-muted">No conditions listed.</p>}
          </Section>

          <Section title="Biometrics">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Height" value={profile.heightCm ? `${profile.heightCm} cm` : '—'} />
              <Stat label="Weight" value={profile.weightKg ? `${profile.weightKg} kg` : '—'} />
              <Stat label="Target weight" value={profile.targetWeightKg || '—'} />
              <Stat label="BMI" value={bmi ? String(bmi) : '—'} />
            </div>
            {profile.weightHistory && <p className="mt-3 text-sm text-ink">{profile.weightHistory}</p>}
          </Section>

          <Section title="Allergies, intolerances & diet">
            <Info label="Severe food allergies" value={(profile.allergies ?? []).join(', ') || 'None listed'} />
            <Info label="Intolerances" value={(profile.intolerances ?? []).join(', ') || 'None listed'} />
            <Info label="Diet preferences" value={(profile.dietPreferences ?? []).join(', ') || 'None listed'} />
          </Section>

          <Section title="Medications & supplements">
            <Info label="Prescriptions" value={profile.medications || 'None listed'} />
            <Info label="Vitamins and supplements" value={profile.supplements || 'None listed'} />
          </Section>

          <Section title="Lifestyle">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Occupation" value={profile.occupation} />
              <Info label="Sleep" value={profile.sleep} />
              <Info label="Exercise" value={profile.exercise} />
              <Info label="Alcohol" value={profile.alcohol} />
              <Info label="Smoking" value={profile.smoking} />
            </div>
          </Section>

          <Section title="Emergency contact">
            <Info label="Name" value={profile.emergencyContact} />
            <Info label="Phone" value={profile.emergencyPhone} />
          </Section>
        </>
      ) : (
        <section className="hy-card p-5">
          <p className="text-sm text-muted">This patient has not completed a clinical profile yet.</p>
        </section>
      )}

      <Section title={`Files (${records.length})`}>
        <p className="mb-3 text-sm text-muted">Labs, food diaries, photos, and documents on this chart. Open or download any file.</p>
        <ul className="space-y-2">
          {records.map((file) => (
            <li key={file.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-panel px-3 py-3">
              <button type="button" onClick={() => setViewing(file)} className="min-w-0 flex-1 text-left hover:text-navy">
                <span className="block font-semibold text-ink">{file.name}</span>
                <span className="text-xs text-muted">
                  {file.category} · {file.size} · {file.uploadedAt ? formatDate(file.uploadedAt) : ''}
                </span>
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
                onClick={() => setViewing(file)}
              >
                <FileSearch size={14} /> View
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
                onClick={() => downloadNamedFile(file.name, { url: file.url, title: file.name, holder: user.name })}
              >
                <Download size={14} /> Download
              </button>
            </li>
          ))}
        </ul>
        {records.length === 0 && <p className="text-sm text-muted">No files uploaded yet.</p>}
      </Section>

      <Section title="Appointments">
        <ul className="space-y-2">
          {visits.map((visit) => {
            const specialist = dietitians.find((item) => item.id === visit.dietitianId)
            return (
              <li key={visit.id} className="rounded-2xl bg-panel px-3 py-3 text-sm">
                <p className="font-semibold text-ink">{visit.topic}</p>
                <p className="text-xs text-muted">
                  {visit.date} · {visit.time} · {visit.type} · {visit.status}
                  {specialist ? ` · ${specialist.name}` : ''}
                </p>
              </li>
            )
          })}
        </ul>
        {visits.length === 0 && <p className="text-sm text-muted">No appointments on file.</p>}
      </Section>

      <Modal open={Boolean(viewing)} title={viewing?.name ?? 'File'} onClose={() => setViewing(null)} wide>
        {viewing ? <FilePreview file={viewing} patientName={user.name} /> : null}
      </Modal>
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

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-ink">{value || '—'}</p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-panel p-3">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-bold text-ink">{value}</p>
    </div>
  )
}
