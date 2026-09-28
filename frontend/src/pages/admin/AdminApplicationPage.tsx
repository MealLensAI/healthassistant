import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AdminReviewTools } from '@/components/admin/AdminReviewTools'
import { AdminSpecialistRecord } from '@/components/admin/AdminSpecialistRecord'
import { DocumentFileCard } from '@/components/admin/DocumentFileCard'
import { CredentialPreview } from '@/components/credentials/CredentialPreview'
import { Button } from '@/components/care-ui/Button'
import { Modal } from '@/components/care-ui/Primitives'
import { useApp } from '@/lib/care/context'
import { analyzeApplicationText } from '@/lib/care/domain'
import { applicantPhotoUrl, applicationDocumentKind, previewDietitianFromApplication } from '@/lib/care/documents'
import { defaultAvailability } from '@/lib/care/utils'

export function AdminApplicationPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { applications, approveApplication, requestMoreInfo, deleteApplication, users, dietitians } = useApp()
  const application = applications.find((item) => item.id === id)
  const [message, setMessage] = useState('Please upload a clearer scan of your practice license and confirm years of experience.')
  const [docOpen, setDocOpen] = useState(false)
  const [analysisOpen, setAnalysisOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const wantsInfo = params.get('action') === 'info'

  const analysis = useMemo(
    () =>
      application
        ? analyzeApplicationText({
            fullName: application.fullName,
            bio: application.bio,
            yearsExperience: application.yearsExperience,
            specialties: application.specialties,
            workplace: application.workplace,
          })
        : null,
    [application],
  )

  if (!application) {
    return (
      <div className="hy-card p-10 text-center">
        Application not found.{' '}
        <Link to="/admin" className="font-semibold text-navy">
          Back to queue
        </Link>
      </div>
    )
  }

  const specialist = dietitians.find((item) => item.userId === application.userId)
  const photo = applicantPhotoUrl(application, users, dietitians)
  const availability = specialist?.availability?.length ? specialist.availability : defaultAvailability()
  const previewDietitian = specialist ?? previewDietitianFromApplication(application, photo, availability)

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        <div>
          <Link to="/admin" className="text-sm font-semibold text-navy">
            ← Verification queue
          </Link>
          <h1 className="mt-2 text-2xl font-extrabold text-ink">Detailed Application View</h1>
          <p className="text-sm text-muted">{application.fullName} · {application.country} · {application.status.replace('_', ' ')}</p>
        </div>

        <AdminSpecialistRecord
          name={application.fullName}
          title={specialist?.title}
          avatar={photo}
          email={application.email}
          phone={application.phone}
          country={application.country}
          yearsExperience={application.yearsExperience}
          workplace={application.workplace}
          bio={application.bio}
          specialties={application.specialties}
          languages={application.languages}
          education={application.education}
          experience={application.experience ?? []}
          availability={availability}
          status={application.status}
        >
          <section className="hy-card p-6">
            <h2 className="mb-4 font-bold">Uploaded documents</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {application.documents.map((doc) => (
                <DocumentFileCard
                  key={doc.kind}
                  name={doc.name}
                  fileName={doc.fileName}
                  kind={doc.kind}
                  url={doc.url || (doc.kind === 'photo' ? photo : undefined)}
                  holderName={application.fullName}
                  preview={
                    <CredentialPreview
                      dietitian={previewDietitian}
                      document={{
                        id: doc.kind,
                        name: doc.name,
                        kind: applicationDocumentKind(doc.kind),
                        fileName: doc.fileName,
                        url: doc.url,
                      }}
                    />
                  }
                />
              ))}
            </div>
          </section>
        </AdminSpecialistRecord>

        {(wantsInfo || application.status === 'needs_info') && (
          <section className="hy-card p-6">
            <h2 className="font-bold">Request more information</h2>
            <textarea className="hy-input mt-3 min-h-28" value={message} onChange={(event) => setMessage(event.target.value)} />
            <Button className="mt-3" variant="danger" onClick={() => requestMoreInfo(application.id, message)}>
              Send request
            </Button>
          </section>
        )}

        {application.adminNotes.length > 0 && (
          <section className="hy-card p-6">
            <h2 className="mb-3 font-bold">Admin notes</h2>
            <ul className="space-y-2 text-sm text-muted">
              {application.adminNotes.map((note) => (
                <li key={note} className="rounded-xl bg-panel p-3">
                  {note}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside>
        <AdminReviewTools
          onDocumentCheck={() => setDocOpen(true)}
          onTextAnalysis={() => setAnalysisOpen(true)}
          onApprove={() => approveApplication(application.id)}
          onDelete={async () => {
            if (deleting) return
            if (!window.confirm(`Permanently delete ${application.fullName}'s application? This cannot be undone.`)) {
              return
            }
            setDeleting(true)
            const ok = await deleteApplication(application.id)
            setDeleting(false)
            if (ok) navigate('/admin')
          }}
        />
      </aside>

      <Modal open={docOpen} title="Document check" onClose={() => setDocOpen(false)} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          {application.documents.map((doc) => (
            <DocumentFileCard
              key={doc.kind}
              name={doc.name}
              fileName={doc.fileName}
              kind={doc.kind}
              url={doc.url || (doc.kind === 'photo' ? photo : undefined)}
              holderName={application.fullName}
              preview={
                <CredentialPreview
                  dietitian={previewDietitian}
                  document={{
                    id: doc.kind,
                    name: doc.name,
                    kind: applicationDocumentKind(doc.kind),
                    fileName: doc.fileName,
                    url: doc.url,
                  }}
                />
              }
            />
          ))}
        </div>
      </Modal>

      <Modal open={analysisOpen} title="Text analysis" onClose={() => setAnalysisOpen(false)} wide>
        {analysis && (
          <div className="space-y-3">
            <p className="text-sm">
              Overall risk: <strong className="uppercase">{analysis.risk.replace('_', ' ')}</strong>
            </p>
            {analysis.findings.map((finding) => (
              <div key={finding.label} className="rounded-xl bg-panel p-3">
                <p className="text-sm font-bold">
                  {finding.label} · <span className={finding.status === 'pass' ? 'text-leaf' : 'text-leaf-deep'}>{finding.status}</span>
                </p>
                <p className="text-sm text-muted">{finding.detail}</p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
