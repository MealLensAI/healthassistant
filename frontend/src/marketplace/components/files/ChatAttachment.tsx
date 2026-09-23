import { FileText } from 'lucide-react'
import { isImageAttachment } from '../../lib/files'
import type { MessageAttachment } from '../../types'
import { cn } from '../../lib/utils'

export function ChatAttachment({ file, mine }: { file: MessageAttachment; mine?: boolean }) {
  if (isImageAttachment(file) && file.url) {
    return (
      <a href={file.url} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl">
        <img src={file.url} alt={file.name} className="max-h-48 w-full object-cover" />
        <span className={cn('mt-1 block truncate text-[11px]', mine ? 'text-white/80' : 'text-muted')}>
          {file.name} · {file.size}
        </span>
      </a>
    )
  }

  return (
    <a
      href={file.url || undefined}
      download={file.url ? file.name : undefined}
      target={file.url ? '_blank' : undefined}
      rel="noreferrer"
      className={cn(
        'mt-2 flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs',
        mine ? 'bg-white/15' : 'bg-panel',
        file.url ? 'hover:opacity-90' : 'pointer-events-none',
      )}
    >
      <FileText size={14} className="shrink-0" />
      <span className="min-w-0">
        <span className="block truncate font-semibold">{file.name}</span>
        <span className={mine ? 'text-white/70' : 'text-muted'}>{file.size}</span>
      </span>
    </a>
  )
}
