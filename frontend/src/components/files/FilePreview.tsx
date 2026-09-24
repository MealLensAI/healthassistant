import { FileText } from 'lucide-react'
import type { PatientFile } from '@/lib/care/types'
import { isImageFile } from '@/lib/care/patients'
import { formatDate } from '@/lib/care/utils'

export function FilePreview({ file, patientName }: { file: PatientFile; patientName?: string }) {
  if (isImageFile(file) && file.url) {
    return (
      <figure className="overflow-hidden rounded-2xl border border-line bg-panel">
        <img src={file.url} alt={file.name} className="max-h-[28rem] w-full object-contain bg-card" />
        <figcaption className="px-4 py-3 text-sm">
          <p className="font-semibold text-ink">{file.name}</p>
          <p className="text-xs text-muted">
            {file.category} · {file.size} · {formatDate(file.uploadedAt)}
            {patientName ? ` · ${patientName}` : ''}
          </p>
        </figcaption>
      </figure>
    )
  }

  return (
    <article className="rounded-2xl border border-line bg-gradient-to-br from-card to-navy-soft p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy-soft text-navy">
          <FileText size={20} />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-navy">{file.category}</p>
          <h3 className="mt-1 text-lg font-extrabold text-ink">{file.name}</h3>
          <p className="mt-1 text-sm text-muted">
            {file.size} · uploaded {formatDate(file.uploadedAt)}
            {patientName ? ` · ${patientName}` : ''}
          </p>
        </div>
      </div>
      <div className="mt-5 space-y-2 rounded-xl bg-card/80 p-4 text-sm leading-relaxed text-muted">
        {file.url ? (
          <a href={file.url} target="_blank" rel="noreferrer" className="font-semibold text-navy hover:underline">
            Open file
          </a>
        ) : null}
        {file.category === 'labs' && (
          <p>
            Lab report on file for this consult. Values and clinician notes are available to the care team inside MealLensAI.
          </p>
        )}
        {file.category === 'diary' && (
          <p>
            Food diary shared with the care team. Use this alongside the clinical snapshot before the next visit.
          </p>
        )}
        {file.category === 'photo' && <p>Photo attached to this patient record.</p>}
        {file.category === 'other' && <p>Supporting document attached to this patient record.</p>}
      </div>
    </article>
  )
}
