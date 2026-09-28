import { useAttachmentUrl } from '@/lib/care/useAttachmentUrl'
import { Download, FileText } from 'lucide-react'
import { isImageAttachment } from '@/lib/care/files'
import type { MessageAttachment } from '@/lib/care/types'
import { cn } from '@/lib/care/utils'

export function ChatAttachment({ file, mine }: { file: MessageAttachment; mine?: boolean }) {
  const attachmentUrl = useAttachmentUrl(file)
  const canOpen = Boolean(attachmentUrl)

  if (isImageAttachment(file) && canOpen) {
    return (
      <a href={attachmentUrl} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl" download={file.name}>
        <img src={attachmentUrl} alt={file.name} className="max-h-48 w-full object-cover" />
        <span className={cn('mt-1 block truncate text-[11px]', mine ? 'text-white/80' : 'text-muted')}>
          {file.name} · {file.size}
        </span>
      </a>
    )
  }

  return (
    <a
      href={attachmentUrl || undefined}
      download={canOpen ? file.name : undefined}
      target={canOpen ? '_blank' : undefined}
      rel="noreferrer"
      className={cn(
        'mt-2 flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs',
        mine ? 'bg-white/15' : 'bg-panel',
        canOpen ? 'hover:opacity-90' : 'pointer-events-none opacity-60',
      )}
    >
      <FileText size={14} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{file.name}</span>
        <span className={mine ? 'text-white/70' : 'text-muted'}>{file.size}</span>
      </span>
      {canOpen ? <Download size={14} className="shrink-0 opacity-80" /> : null}
    </a>
  )
}
