import { Link } from 'react-router-dom'
import { Button } from '@/components/care-ui/Button'
import { Avatar } from '@/components/care-ui/Primitives'
import { useApp } from '@/lib/care/context'
import { applicantPhotoUrl } from '@/lib/care/documents'
import { formatDate } from '@/lib/care/utils'

export function AdminQueuePage() {
  const { applications, approveApplication, users, dietitians } = useApp()
  const pending = applications.filter((item) => item.status === 'pending' || item.status === 'needs_info')
  const reviewed = applications.filter((item) => item.status === 'approved' || item.status === 'rejected')

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-navy-soft px-6 py-5">
        <p className="hy-eyebrow">Admin Dashboard — Verification Queue</p>
        <h1 className="mt-1 text-2xl font-extrabold text-ink">Pending Applications</h1>
        <p className="text-sm text-ink">Review licenses, degrees, and biography before a specialist becomes visible to patients.</p>
      </div>

      <div className="space-y-4">
        {pending.map((application) => {
          const photo = applicantPhotoUrl(application, users, dietitians)
          return (
            <article key={application.id} className="hy-card p-5" data-testid={`application-${application.id}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <Avatar
                  src={photo}
                  name={application.fullName}
                  size={72}
                  to={`/admin/applications/${application.id}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{application.fullName}</h2>
                    <span className="rounded-full bg-navy-soft px-2 py-0.5 text-[11px] font-bold uppercase text-navy">
                      {application.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted">
                    {application.country}
                    {application.specialties[0] ? `, ${application.specialties[0]} specialty` : ''}
                  </p>
                  <p className="mt-1 text-xs text-muted">Submitted {formatDate(application.submittedAt)}</p>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-48">
                  <Link to={`/admin/applications/${application.id}`} className="rounded-xl bg-white py-2.5 text-center text-sm font-semibold text-navy ring-1 ring-navy/20">
                    View Full Application
                  </Link>
                  <Button onClick={() => approveApplication(application.id)}>Approve</Button>
                  <Link
                    to={`/admin/applications/${application.id}?action=info`}
                    className="rounded-md border border-destructive/30 py-2.5 text-center text-sm font-semibold text-destructive"
                  >
                    Request More Info
                  </Link>
                </div>
              </div>
            </article>
          )
        })}
        {pending.length === 0 && <div className="hy-card p-10 text-center text-sm text-muted">Verification queue is clear.</div>}

        {reviewed.length > 0 && (
          <section>
            <h2 className="mb-3 font-bold text-ink">Recently reviewed</h2>
            <div className="space-y-2">
              {reviewed.map((application) => (
                <Link key={application.id} to={`/admin/applications/${application.id}`} className="hy-card flex items-center justify-between gap-3 p-4">
                  <span className="min-w-0 truncate font-semibold">{application.fullName}</span>
                  <span className="text-xs font-bold uppercase text-navy">{application.status}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
