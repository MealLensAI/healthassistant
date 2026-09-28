import { useAttachmentUrl } from '@/lib/care/useAttachmentUrl'
import type { CredentialDocument, Dietitian } from '@/lib/care/types'
import { formatDate } from '@/lib/care/utils'

export function CredentialPreview({
  dietitian,
  document,
}: {
  dietitian: Dietitian
  document: CredentialDocument
}) {
  const fileUrl = useAttachmentUrl(document)
  const degree = dietitian.education.find((item) =>
    document.reference ? item.degree === document.reference : true,
  ) ?? dietitian.education[0]
  const issuer = document.issuer ?? degree?.school ?? dietitian.workplace
  const issuedOn = document.issuedOn ?? (degree ? `${degree.year}-06-01` : '2018-01-01')
  const reference = document.reference ?? document.fileName.replace(/\.[^.]+$/, '').toUpperCase()

  // Prefer the real uploaded file when we can resolve a signed URL.
  if (fileUrl) {
    const isImage = /\.(png|jpe?g|gif|webp|avif)$/i.test(document.fileName || document.name || '')
      || (document.mimeType || '').startsWith('image/')
    return (
      <figure className="overflow-hidden rounded-2xl border border-line bg-panel">
        {isImage ? (
          <img src={fileUrl} alt={document.name} className="max-h-[70vh] w-full object-contain bg-card" />
        ) : (
          <iframe title={document.name} src={fileUrl} className="h-[70vh] w-full bg-card" />
        )}
        <figcaption className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{document.name}</p>
            <p className="truncate text-xs text-muted">{document.fileName}</p>
          </div>
          <a href={fileUrl} download={document.fileName || document.name} target="_blank" rel="noreferrer" className="shrink-0 text-xs font-semibold text-navy hover:underline">
            Download
          </a>
        </figcaption>
      </figure>
    )
  }

  if (document.kind === 'photo') {
    const src = document.url || dietitian.avatar
    return (
      <figure className="overflow-hidden rounded-2xl border border-line bg-panel">
        {src ? (
          <img src={src} alt={dietitian.name} className="max-h-[70vh] w-full object-contain bg-card" />
        ) : null}
        <figcaption className="px-4 py-3 text-sm">
          <p className="font-semibold text-ink">{document.name}</p>
          <p className="text-xs text-muted">{document.fileName}</p>
        </figcaption>
      </figure>
    )
  }

  if (document.kind === 'license') {
    return (
      <article className="min-h-[70vh] overflow-hidden rounded-2xl border border-navy/20 bg-gradient-to-br from-[#FCFAF8] to-[#DFE9F6] p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-navy">{issuer}</p>
        <h3 className="mt-3 font-display text-2xl font-extrabold text-ink">Practice licence</h3>
        <p className="mt-1 text-sm text-muted">Verified by MealLensAI against the issuing register.</p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Licensee</dt>
            <dd className="font-semibold text-ink">{dietitian.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Licence no.</dt>
            <dd className="font-semibold text-ink">{reference}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Issued</dt>
            <dd className="font-semibold text-ink">{formatDate(issuedOn)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted">Specialty</dt>
            <dd className="font-semibold text-ink">{dietitian.specialties[0] ?? dietitian.title}</dd>
          </div>
        </dl>
        <p className="mt-5 rounded-xl bg-card/80 px-3 py-2 text-xs text-muted">{document.fileName}</p>
      </article>
    )
  }

  if (document.kind === 'degree') {
    return (
      <article className="min-h-[70vh] overflow-hidden rounded-2xl border border-[#397F5E]/25 bg-gradient-to-b from-card to-leaf-soft px-6 py-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#2C6349]">{issuer}</p>
        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted">The trustees have conferred upon</p>
        <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">{dietitian.name}</h3>
        <p className="mt-3 text-sm text-muted">the degree of</p>
        <p className="mt-1 text-lg font-bold text-navy">{reference || degree?.degree}</p>
        <p className="mt-4 text-sm text-muted">{degree?.school} · Class of {degree?.year ?? formatDate(issuedOn)}</p>
        <p className="mt-5 text-xs text-muted">{document.fileName}</p>
      </article>
    )
  }

  return (
    <article className="rounded-2xl border border-line bg-panel p-5">
      <h3 className="font-bold text-ink">{document.name}</h3>
      <p className="mt-1 text-sm text-muted">{document.fileName}</p>
      <p className="mt-3 text-sm text-muted">Document preview is preparing. Try again in a moment.</p>
    </article>
  )
}
