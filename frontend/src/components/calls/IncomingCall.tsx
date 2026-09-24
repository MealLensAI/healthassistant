import { Phone, PhoneOff } from 'lucide-react'
import { useCallMedia } from '@/lib/care/callMedia'
import { Avatar } from '@/components/care-ui/Primitives'

export function IncomingCall({
  peerName,
  peerAvatar,
  onAnswer,
  onDecline,
}: {
  peerName: string
  peerAvatar: string
  onAnswer: () => void
  onDecline: () => void
}) {
  const { ensureLocalMedia } = useCallMedia()
  return (
    <div
      className="fixed inset-x-4 top-20 z-[60] mx-auto max-w-sm overflow-hidden rounded-2xl border border-navy-soft bg-white shadow-elevated sm:left-auto sm:right-6 sm:top-24"
      role="alertdialog"
      aria-label={`Incoming video call from ${peerName}`}
    >
      <div className="flex items-center gap-3 bg-navy px-4 py-3 text-white">
        <Avatar src={peerAvatar} name={peerName} size={44} />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Incoming video call</p>
          <p className="truncate font-bold">{peerName}</p>
        </div>
      </div>
      <div className="flex gap-2 p-3">
        <button
          type="button"
          onClick={() => {
            void ensureLocalMedia().finally(() => onAnswer())
          }}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#397F5E] px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <Phone size={16} /> Answer
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-destructive px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          <PhoneOff size={16} /> Decline
        </button>
      </div>
    </div>
  )
}
