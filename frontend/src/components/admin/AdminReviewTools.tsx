import { FileSearch, ScanSearch } from 'lucide-react'
import { Button } from '@/components/care-ui/Button'

export function AdminReviewTools({
  onDocumentCheck,
  onTextAnalysis,
  onApprove,
}: {
  onDocumentCheck: () => void
  onTextAnalysis: () => void
  onApprove: () => void
}) {
  return (
    <aside className="rounded-2xl bg-navy-soft p-5">
      <h2 className="text-[15px] font-bold text-ink">Admin Review & Decision Tools</h2>
      <div className="mt-4 space-y-2.5">
        <ToolButton icon={FileSearch} label="Document Check" onClick={onDocumentCheck} />
        <ToolButton icon={ScanSearch} label="Text Analysis" onClick={onTextAnalysis} />
        <Button className="h-11 w-full" onClick={onApprove} data-testid="approve-application">
          Approve and Update status
        </Button>
      </div>
    </aside>
  )
}

function ToolButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof FileSearch
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl bg-white px-3 py-3 text-left text-sm font-medium text-ink hover:bg-panel"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-leaf-soft text-leaf">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      {label}
    </button>
  )
}
