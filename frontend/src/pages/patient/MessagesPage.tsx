import { Check, CheckCheck, Clock3, MoreHorizontal, Paperclip, RotateCcw, Send, Trash2, Video } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { VideoStage } from '@/components/calls/VideoStage'
import { ChatAttachment } from '@/components/files/ChatAttachment'
import { Avatar } from '@/components/care-ui/Primitives'
import { Button } from '@/components/care-ui/Button'
import { useApp } from '@/lib/care/context'
import { accountAvatar } from '@/lib/care/accountAvatar'
import { withCallPeerAvatar } from '@/lib/care/calls'
import { apiEnabled, uploadCareAsset } from '@/lib/care/api'
import { useCallMedia } from '@/lib/care/callMediaContext'
import { dietitianReply } from '@/lib/care/care'
import { peerProfilePath } from '@/lib/care/profilePaths'
import { practicePath } from '@/lib/care/practiceBase'
import { cn, fileSizeLabel, formatTime } from '@/lib/care/utils'
import type { Conversation, MessageDeliveryStatus } from '@/lib/care/types'

export function MessagesPage({ role = 'patient' }: { role?: 'patient' | 'dietitian' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    currentUser,
    conversations,
    messages,
    users,
    dietitians,
    applications,
    sendMessage,
    retryMessage,
    sendPeerMessage,
    startCall,
    answerCall,
    endCall,
    activeCall,
    markConversationRead,
    deleteConversation,
    toast,
  } = useApp()
  const { runWithLocalMedia, preparingCall } = useCallMedia()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [menuForId, setMenuForId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuForId) return
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuForId(null)
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [menuForId])

  const mine = useMemo(
    () =>
      conversations
        .filter((conversation) => currentUser && conversation.participantIds.includes(currentUser.id))
        .sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
    [conversations, currentUser],
  )

  const active = mine.find((conversation) => conversation.id === id) ?? mine[0]
  const inboxTo = role === 'dietitian' ? practicePath('messages') : '/messages'

  const activeId = active?.id
  const lastIncoming = messages.filter((message) => message.conversationId === active?.id && message.senderId !== currentUser?.id).slice(-1)[0]?.timestamp
  useEffect(() => {
    const markVisible = () => {
      if (activeId && document.visibilityState === 'visible' && (id || window.matchMedia('(min-width: 1024px)').matches)) markConversationRead(activeId)
    }
    markVisible()
    document.addEventListener('visibilitychange', markVisible)
    return () => document.removeEventListener('visibilitychange', markVisible)
  }, [activeId, lastIncoming, id, currentUser?.id, markConversationRead])

  // Deep-link the first thread on desktop so the 3-column layout matches the care product.
  useEffect(() => {
    if (!currentUser || id || mine.length === 0) return
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      navigate(role === 'dietitian' ? practicePath(`messages/${mine[0].id}`) : `/messages/${mine[0].id}`, {
        replace: true,
      })
    }
  }, [currentUser, id, mine, navigate, role])

  if (!currentUser) {
    return (
      <div className="grid min-h-[70vh] place-items-center rounded-lg border border-line bg-white">
        <p className="text-sm text-muted">Loading your conversations…</p>
      </div>
    )
  }

  const peer = active ? peerFor(active, currentUser.id, users, dietitians) : null
  const selfAvatar = accountAvatar(currentUser, dietitians, applications)
  const displayCall = withCallPeerAvatar(activeCall, users, dietitians, applications)
  const thread = messages.filter((message) => message.conversationId === active?.id)
  const threadOpen = Boolean(id)
  const showThread = Boolean(active && peer)

  function go(conversationId: string) {
    navigate(role === 'dietitian' ? practicePath(`messages/${conversationId}`) : `/messages/${conversationId}`)
  }

  return (
    <div className="grid h-[calc(100dvh-7.5rem)] min-h-[32rem] overflow-hidden rounded-lg border border-line bg-white lg:grid-cols-[260px_minmax(0,1fr)_280px]">
      <aside className={cn('flex min-h-0 flex-col border-b border-line lg:border-b-0 lg:border-r', threadOpen && 'hidden lg:flex')}>
        <div className="shrink-0 border-b border-line px-4 py-4">
          <h1 className="font-bold text-ink">Messages</h1>
          <p className="text-xs text-muted">Secure care conversations</p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {mine.map((conversation) => {
            const person = peerFor(conversation, currentUser.id, users, dietitians)
            const menuOpen = menuForId === conversation.id
            const deleting = deletingId === conversation.id
            return (
              <div
                key={conversation.id}
                className={`flex w-full items-center gap-2 px-3 py-3 text-left hover:bg-panel ${
                  active?.id === conversation.id ? 'bg-navy-soft' : ''
                }`}
              >
                <Avatar
                  src={person?.avatar}
                  name={person?.name ?? 'Care'}
                  size={40}
                  to={peerProfilePath({ currentUser, peerUserId: person?.id, dietitians, users })}
                />
                <button type="button" onClick={() => go(conversation.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-semibold text-ink">{person?.name}</span>
                  <span className="block truncate text-xs text-muted">{conversation.lastMessage}</span>
                </button>
                <div className="relative shrink-0" ref={menuOpen ? menuRef : undefined}>
                  <button
                    type="button"
                    aria-label={`Options for ${person?.name ?? 'conversation'}`}
                    aria-expanded={menuOpen}
                    className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-white hover:text-ink"
                    onClick={(event) => {
                      event.stopPropagation()
                      setMenuForId(menuOpen ? null : conversation.id)
                    }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {menuOpen ? (
                    <div className="absolute right-0 top-9 z-20 min-w-[10.5rem] overflow-hidden rounded-xl border border-line bg-white py-1 shadow-elevated">
                      <button
                        type="button"
                        disabled={deleting}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-panel disabled:opacity-50"
                        onClick={() => {
                          if (deleting) return
                          if (!window.confirm(`Delete chat with ${person?.name ?? 'this person'}? This removes the conversation for both of you.`)) return
                          setMenuForId(null)
                          setDeletingId(conversation.id)
                          void deleteConversation(conversation.id)
                            .then((ok) => {
                              if (!ok) return
                              if (active?.id === conversation.id) navigate(inboxTo, { replace: true })
                            })
                            .finally(() => setDeletingId(null))
                        }}
                      >
                        <Trash2 size={14} />
                        {deleting ? 'Deleting…' : 'Delete chat'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )
          })}
          {mine.length === 0 && (
            <p className="p-4 text-sm text-muted">
              No conversations yet. Open a dietitian and send a message or book a consult.
            </p>
          )}
        </div>
      </aside>

      <section className={cn('min-h-0 flex-col', threadOpen ? 'flex' : 'hidden lg:flex')}>
        {showThread && active && peer ? (
          <>
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3 py-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="text-sm font-semibold text-navy lg:hidden"
                  onClick={() => navigate(inboxTo)}
                >
                  ← Inbox
                </button>
                <Avatar
                  src={peer.avatar}
                  name={peer.name}
                  size={40}
                  to={peerProfilePath({ currentUser, peerUserId: peer.id, dietitians, users })}
                />
                <Link
                  to={peerProfilePath({ currentUser, peerUserId: peer.id, dietitians, users })}
                  className="min-w-0 hover:text-navy"
                >
                  <p className="font-bold text-ink">{peer.name}</p>
                  <p className="text-xs text-muted">{peer.title ?? 'MealLensAI care'}</p>
                </Link>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  className="shrink-0"
                  loading={preparingCall}
                  onClick={() => runWithLocalMedia(() => {
                    if (activeCall?.incoming && activeCall.peerId === peer.id) {
                      return answerCall()
                    }
                    return startCall(active.id, peer.id, peer.name, peer.avatar ?? '')
                  })}
                >
                  <Video size={14} /> {activeCall?.incoming && activeCall.peerId === peer.id ? 'Answer' : 'Video call'}
                </Button>
              </div>
            </div>
            {/* Incoming only — active calls use CallWindow (expand / minimize). */}
            {activeCall?.peerId === peer.id && activeCall.incoming ? (
              <div className="shrink-0 lg:hidden">
                <VideoStage call={displayCall} selfAvatar={selfAvatar} selfName={currentUser.name} compact onEnd={endCall} onAnswer={answerCall} />
              </div>
            ) : null}
            <div className="min-h-0 flex-1 space-y-3 overflow-auto bg-panel/60 p-4">
              {thread.map((message) => {
                const mineMsg = message.senderId === currentUser.id
                const sender = users.find((item) => item.id === message.senderId)
                const senderTo = peerProfilePath({
                  currentUser,
                  peerUserId: message.senderId,
                  dietitians,
                  users,
                })
                return (
                  <div key={message.id} className={`flex items-end gap-2 ${mineMsg ? 'justify-end' : 'justify-start'}`}>
                    {!mineMsg && (
                      <Avatar
                        src={sender?.avatar ?? peer.avatar}
                        name={sender?.name ?? peer.name}
                        size={32}
                        to={senderTo}
                      />
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        mineMsg ? 'bg-[#0E3E77] text-white' : 'bg-white text-ink shadow-sm'
                      }`}
                    >
                      <p>{message.text}</p>
                      {message.attachments?.map((file) => (
                        <ChatAttachment key={`${file.name}-${file.size}`} file={file} mine={mineMsg} />
                      ))}
                      <div className={`mt-1 flex items-center gap-1.5 text-[10px] ${mineMsg ? 'justify-end text-white/70' : 'text-muted'}`}>
                        <span>{formatTime(message.timestamp)}</span>
                        {mineMsg ? <MessageStatus status={message.status} onRetry={() => void retryMessage(message.id)} /> : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <form
              className="flex shrink-0 items-center gap-2 border-t border-line p-3"
              onSubmit={async (event) => {
                event.preventDefault()
                if (!draft.trim()) return
                if (sending) return
                const outgoing = draft.trim()
                setDraft('')
                // Fire-and-forget: bubble appears as pending immediately.
                void sendMessage(active.id, outgoing, undefined, peer?.id).catch(() => {
                  toast('error', 'Message failed to send. Tap Retry on the bubble.')
                })
                if (!apiEnabled() && role === 'patient' && peer) {
                  const firstName = peer.name.split(' ')[0] ?? peer.name
                  window.setTimeout(() => {
                    sendPeerMessage(active.id, peer.id, dietitianReply(outgoing, firstName))
                  }, 700)
                }
              }}
            >
              <label className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-line text-muted hover:bg-panel">
                <Paperclip size={16} />
                <input
                  type="file"
                  disabled={sending}
                  aria-label="Attach a file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file || !active || !peer) return
                    setSending(true)
                    void (apiEnabled()
                      ? uploadCareAsset(file, 'attachment').then((uploaded) => ({ name: uploaded.name, size: fileSizeLabel(uploaded.sizeBytes), type: uploaded.type, objectKey: uploaded.objectKey, bucket: uploaded.bucket, sizeBytes: uploaded.sizeBytes }))
                      : Promise.resolve({ name: file.name, size: fileSizeLabel(file.size), type: file.type, url: URL.createObjectURL(file), sizeBytes: file.size }))
                      .then((read) => sendMessage(active.id, `Shared a file: ${read.name}`, [read]))
                      .catch((error) => toast('error', error instanceof Error ? error.message : 'File could not be sent. Please try again.'))
                      .finally(() => setSending(false))
                    event.target.value = ''
                  }}
                />
              </label>
              <input
                className="hy-input min-w-0 flex-1"
                placeholder="Write a secure message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button type="submit" loading={sending} aria-label={sending ? "Sending" : "Send"}>
                <Send size={16} />
              </Button>
            </form>
          </>
        ) : (
          <div className="grid flex-1 place-items-center px-6 text-center text-sm text-muted">
            {mine.length === 0
              ? 'Find a dietitian and start a consult to open your first secure thread.'
              : 'Select a conversation'}
          </div>
        )}
      </section>

      <aside className="hidden min-h-0 flex-col border-l border-line lg:flex">
        <div className="shrink-0 p-4">
          <h2 className="font-bold text-ink">Live video</h2>
          <p className="mt-1 text-xs text-muted">Consult without leaving MealLensAI.</p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
          {peer ? (
            <>
              <VideoStage
                call={
                  activeCall?.peerId === peer.id && activeCall.incoming
                    ? displayCall
                    : null
                }
                selfAvatar={selfAvatar}
                selfName={currentUser.name}
                compact
                onEnd={endCall}
                onAnswer={answerCall}
                onStart={() => {
                  if (!active) return
                  return startCall(active.id, peer.id, peer.name, peer.avatar ?? '')
                }}
              />
              <Link
                to={peerProfilePath({ currentUser, peerUserId: peer.id, dietitians, users })}
                className="mt-3 block text-sm font-semibold text-ink hover:text-navy"
              >
                {peer.name}
              </Link>
              <p className="text-xs text-muted">{peer.title}</p>
            </>
          ) : (
            <div className="rounded-lg border border-line bg-panel p-6 text-sm text-muted">
              Pick a conversation to start a video consult here.
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function MessageStatus({
  status,
  onRetry,
}: {
  status?: MessageDeliveryStatus
  onRetry: () => void
}) {
  if (status === 'failed') {
    return (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 font-semibold text-white hover:bg-white/25"
      >
        <RotateCcw size={10} /> Retry
      </button>
    )
  }
  if (status === 'pending') return <Clock3 size={12} aria-label="Sending" />
  if (status === 'read') return <CheckCheck size={12} className="text-sky-300" aria-label="Read" />
  if (status === 'delivered') return <CheckCheck size={12} aria-label="Delivered" />
  return <Check size={12} aria-label="Sent" />
}

function peerFor(
  conversation: Conversation,
  myId: string,
  users: { id: string; name: string; avatar: string; title?: string }[],
  dietitians: { userId: string; name: string; avatar: string; title: string }[],
) {
  const peerId = conversation.participantIds.find((id) => id !== myId)
  const user = users.find((item) => item.id === peerId)
  const dietitian = dietitians.find((item) => item.userId === peerId)
  const avatar = user?.avatar || dietitian?.avatar || ''
  const name = user?.name || dietitian?.name || 'Care team'
  const title = user?.title || dietitian?.title || ''
  return { id: peerId ?? user?.id ?? dietitian?.userId ?? '', name, avatar, title }
}
