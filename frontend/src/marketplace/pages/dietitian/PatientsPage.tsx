import { Link } from 'react-router-dom'
import { Avatar, Pill } from '../../components/ui/Primitives'
import { useApp } from '../../context'
import { carePatientIds, carePatients, filesForPatient } from '../../lib/patients'
import { ageFromDob } from '../../lib/utils'

export function PatientsPage() {
  const { currentUser, users, dietitians, appointments, conversations, consultationRequests, patientProfiles, files } =
    useApp()
  if (!currentUser) return null

  const ids = carePatientIds({
    currentUserId: currentUser.id,
    dietitians,
    appointments,
    conversations,
    consultationPatientIds: consultationRequests
      .filter((item) => dietitians.find((dietitian) => dietitian.id === item.dietitianId)?.userId === currentUser.id)
      .map((item) => item.patientId),
  })
  const patients = carePatients(users, ids)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Patients</h1>
        <p className="text-sm text-muted">Open a chart to review clinical details and every file they’ve uploaded.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {patients.map((patient) => {
          const profile = patientProfiles.find((item) => item.userId === patient.id)
          const recordCount = filesForPatient(files, patient.id).length
          return (
            <article key={patient.id} className="hy-card flex gap-4 p-5">
              <Avatar src={patient.avatar} name={patient.name} size={64} to={`/dietitian/patients/${patient.id}`} />
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-ink">{profile?.preferredName || patient.name}</h2>
                <p className="text-sm text-muted">
                  {patient.country ?? '—'}
                  {profile ? ` · ${ageFromDob(profile.dateOfBirth)} years` : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile?.conditions.map((item) => (
                    <Pill key={item.name}>{item.name}</Pill>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">{recordCount} file{recordCount === 1 ? '' : 's'}</p>
                <Link to={`/dietitian/patients/${patient.id}`} className="mt-2 inline-block text-sm font-semibold text-navy hover:underline">
                  View chart
                </Link>
              </div>
            </article>
          )
        })}
        {patients.length === 0 && <div className="hy-card p-10 text-center text-sm text-muted">No patients on your caseload yet.</div>}
      </div>
    </div>
  )
}
