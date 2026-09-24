import { Download, Eye, FileText } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { downloadNamedFile, isImageFileName } from '@/lib/care/documents'
import { Button } from '@/components/care-ui/Button'
import { Modal } from '@/components/care-ui/Primitives'

export function DocumentFileCard({
  name,
  fileName,
  kind,
  url,
  holderName,
  preview,
  compact = false,
}: {
  name: string
  fileName: string
  kind: string
  url?: string
  holderName: string
  preview?: ReactNode
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const isPhoto = kind === 'photo' || isImageFileName(fileName)

  return (
    <article className={compact ? 'rounded-xl border border-line bg-panel px-3 py-2' : 'rounded-2xl border border-line bg-panel p-4'}>
      {compact ? (
        <div className="flex items-center gap-3">
          {isPhoto && url ? (
            <button type="button" className="h-10 w-10 shrink-0 overflow-hidden rounded-lg" onClick={() => setOpen(true)}>
              <img src={url} alt={`${holderName} ${name}`} className="h-full w-full object-cover" />
            </button>
          ) : (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-navy-soft text-navy">
              <FileText size={16} />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-ink">{name}</p>
            <p className="truncate text-[11px] text-muted">{fileName}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              <Eye size={14} /> View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadNamedFile(fileName, { url, title: name, holder: holderName })}
            >
              <Download size={14} /> Download
            </Button>
          </div>
        </div>
      ) : (
        <>
          {isPhoto && url ? (
            <button type="button" className="mb-3 block w-full overflow-hidden rounded-xl" onClick={() => setOpen(true)}>
              <img src={url} alt={`${holderName} ${name}`} className="h-28 w-full object-cover" />
            </button>
          ) : (
            <div className="mb-3 grid h-28 place-items-center rounded-xl bg-navy-soft text-navy">
              <FileText size={28} />
            </div>
          )}
          <p className="text-sm font-bold text-ink">{name}</p>
          <p className="truncate text-xs text-muted">{fileName}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              <Eye size={14} /> View
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadNamedFile(fileName, { url, title: name, holder: holderName })}
            >
              <Download size={14} /> Download
            </Button>
          </div>
        </>
      )}
      <Modal open={open} title={name} onClose={() => setOpen(false)} wide>
        {isPhoto && url ? (
          <img src={url} alt={`${holderName} ${name}`} className="max-h-[70vh] w-full rounded-2xl object-contain bg-panel" />
        ) : (
          preview ?? (
            <div className="rounded-2xl border border-line bg-panel p-6">
              <p className="font-bold text-ink">{name}</p>
              <p className="mt-1 text-sm text-muted">{fileName}</p>
              <p className="mt-4 text-sm leading-relaxed text-muted">
                Credential file for {holderName}. Download a copy to keep it with the review notes.
              </p>
            </div>
          )
        )}
      </Modal>
    </article>
  )
}
