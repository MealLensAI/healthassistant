import { Paperclip, Send, Video } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { VideoStage } from '../../components/calls/VideoStage'
import { ChatAttachment } from '../../components/files/ChatAttachment'
import { Avatar } from '../../components/ui/Primitives'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context'
import { apiEnabled } from '../../lib/api'
import { useCallMedia } from '../../lib/callMedia'
import { dietitianReply } from '../../lib/care'
import { fileCategoryFromName, readLocalFile } from '../../lib/files'
import { peerProfilePath } from '../../lib/profilePaths'
import { cn, formatTime } from '../../lib/utils'
import type { Conversation } from '../../types'

export function MessagesPage({ role = 'patient' }: { role?: 'patient' | 'dietitian' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    currentUser,
    conversations,
    messages,
    users,
    dietitians,
    sendMessage,
    sendPeerMessage,
    startCall,
    answerCall,
    endCall,
    activeCall,
    uploadFile,
  } = useApp()
  const { ensureLocalMedia } = useCallMedia()
  const [draft, setDraft] = useState('')

  const mine = useMemo(
    () =>
      conversations
        .filter((conversation) => currentUser && conversation.participantIds.includes(currentUser.id))
        .sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
    [conversations, currentUser],
  )

  const active = mine.find((conversation) => conversation.id === id) ?? mine[0]
  const inboxTo = role === 'dietitian' ? '/dietitian/messages' : '/messages'

  // Deep-link the first thread on desktop so the 3-column layout matches the care product.
  useEffect(() => {
    if (!currentUser || id || mine.length === 0) return
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      navigate(role === 'dietitian' ? `/dietitian/messages/${mine[0].id}` : `/messages/${mine[0].id}`, {
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
  const thread = messages.filter((message) => message.conversationId === active?.id)
  const threadOpen = Boolean(id)
  const showThread = Boolean(active && peer)

  function go(conversationId: string) {
    navigate(role === 'dietitian' ? `/dietitian/messages/${conversationId}` : `/messages/${conversationId}`)
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
            return (
              <div
                key={conversation.id}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-panel ${
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

      <section className={cn('min-h-0 flex-col', threadOpen || showThread ? 'flex' : 'hidden lg:flex')}>
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
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => {
                  void ensureLocalMedia().finally(() => {
                    if (activeCall?.incoming && activeCall.peerId === peer.id) {
                      answerCall()
                      return
                    }
                    startCall(active.id, peer.id, peer.name, peer.avatar ?? '')
                  })
                }}
              >
                <Video size={14} /> {activeCall?.incoming && activeCall.peerId === peer.id ? 'Answer' : 'Video call'}
              </Button>
            </div>
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
                        mineMsg ? 'bg-navy text-white' : 'bg-white text-ink shadow-sm'
                      }`}
                    >
                      <p>{message.text}</p>
                      {message.attachments?.map((file) => (
                        <ChatAttachment key={`${file.name}-${file.size}`} file={file} mine={mineMsg} />
                      ))}
                      <p className={`mt-1 text-[10px] ${mineMsg ? 'text-white/70' : 'text-muted'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            <form
              className="flex shrink-0 items-center gap-2 border-t border-line p-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (!draft.trim()) return
                sendMessage(active.id, draft.trim())
                if (!apiEnabled() && role === 'patient' && peer) {
                  const firstName = peer.name.split(' ')[0] ?? peer.name
                  const outgoing = draft.trim()
                  window.setTimeout(() => {
                    sendPeerMessage(active.id, peer.id, dietitianReply(outgoing, firstName))
                  }, 700)
                }
                setDraft('')
              }}
            >
              <label className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-line text-muted hover:bg-panel">
                <Paperclip size={16} />
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file || !active || !peer) return
                    void readLocalFile(file).then((read) => {
                      sendMessage(active.id, `Shared a file: ${read.name}`, [read])
                      uploadFile({
                        name: read.name,
                        category: fileCategoryFromName(read.name, read.type),
                        size: read.size,
                        sharedWithId: peer.id,
                        url: read.url,
                      })
                    })
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
              <Button type="submit" aria-label="Send">
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
                call={activeCall?.peerId === peer.id ? activeCall : null}
                selfAvatar={currentUser.avatar}
                selfName={currentUser.name}
                compact
                onEnd={endCall}
                onAnswer={answerCall}
                onStart={() => {
                  if (!active) return
                  void ensureLocalMedia().finally(() => startCall(active.id, peer.id, peer.name, peer.avatar ?? ''))
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

function peerFor(
  conversation: Conversation,
  myId: string,
  users: { id: string; name: string; avatar: string; title?: string }[],
  dietitians: { userId: string; name: string; avatar: string; title: string }[],
) {
  const peerId = conversation.participantIds.find((id) => id !== myId)
  const user = users.find((item) => item.id === peerId)
  const dietitian = dietitians.find((item) => item.userId === peerId)
  if (user) return { id: user.id, name: user.name, avatar: user.avatar, title: user.title }
  if (dietitian) return { id: dietitian.userId, name: dietitian.name, avatar: dietitian.avatar, title: dietitian.title }
  return { id: peerId ?? '', name: 'Care team', avatar: '', title: '' }
}
