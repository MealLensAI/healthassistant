import { Link, useParams } from 'react-router-dom'
import { AdminSpecialistRecord } from '@/components/admin/AdminSpecialistRecord'
import { DocumentFileCard } from '@/components/admin/DocumentFileCard'
import { CredentialPreview } from '@/components/credentials/CredentialPreview'
import { useApp } from '@/lib/care/context'
import { specialistReviewFiles } from '@/lib/care/documents'

export function AdminDietitianDetailPage() {
  const { id } = useParams()
  const { dietitians, users } = useApp()
  const dietitian = dietitians.find((item) => item.id === id)
  const account = users.find((item) => item.id === dietitian?.userId)

  if (!dietitian) {
    return (
      <div className="hy-card p-10 text-center">
        Specialist not found.{' '}
        <Link to="/admin/dietitians" className="font-semibold text-navy">
          Back to approved dietitians
        </Link>
      </div>
    )
  }

  const files = specialistReviewFiles(dietitian)

  return (
    <div className="space-y-5">
      <div>
        <Link to="/admin/dietitians" className="text-sm font-semibold text-navy">
          ← Approved dietitians
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold text-ink">Dietitian record</h1>
        <p className="text-sm text-muted">Full profile, clinic hours, and uploaded files for this specialist.</p>
      </div>

      <AdminSpecialistRecord
        name={dietitian.name}
        title={dietitian.title}
        avatar={dietitian.avatar}
        email={account?.email}
        phone={account?.phone}
        country={dietitian.country}
        yearsExperience={dietitian.yearsExperience}
        workplace={dietitian.workplace}
        bio={dietitian.bio}
        specialties={dietitian.specialties}
        languages={dietitian.languages}
        education={dietitian.education}
        experience={dietitian.experience}
        availability={dietitian.availability}
        status={dietitian.status}
      >
        <section className="hy-card p-6">
          <h2 className="mb-4 font-bold">Uploaded documents</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {files.map((doc) => (
              <DocumentFileCard
                key={doc.id}
                name={doc.name}
                fileName={doc.fileName}
                kind={doc.kind}
                url={doc.url || (doc.kind === 'photo' ? dietitian.avatar : undefined)}
                holderName={dietitian.name}
                preview={<CredentialPreview dietitian={dietitian} document={doc} />}
              />
            ))}
          </div>
        </section>
      </AdminSpecialistRecord>
    </div>
  )
}
