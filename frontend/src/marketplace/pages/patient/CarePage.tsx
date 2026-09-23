import { CalendarDays, FileText, MessageSquare, Paperclip, Send, Trash2, Video, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { VideoStage } from '../../components/calls/VideoStage'
import { ChatAttachment } from '../../components/files/ChatAttachment'
import { Avatar, Modal } from '../../components/ui/Primitives'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context'
import { apiEnabled } from '../../lib/api'
import { dietitianReply, timeSlotsFor, upcomingDays } from '../../lib/care'
import { fileCategoryFromName, readLocalFile } from '../../lib/files'
import { dietitianProfilePath } from '../../lib/profilePaths'
import { fileSizeLabel, formatTime } from '../../lib/utils'
import type { MessageAttachment } from '../../types'

type Panel = 'book' | 'chat' | 'call'

function panelFromSearch(value: string | null): Panel {
  if (value === 'chat' || value === 'call' || value === 'book') return value
  if (value === '1') return 'call'
  return 'book'
}

export function CarePage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const {
    dietitians,
    currentUser,
    openConversation,
    sendMessage,
    sendPeerMessage,
    bookAppointment,
    cancelAppointment,
    messages,
    appointments,
    conversations,
    startCall,
    answerCall,
    endCall,
    activeCall,
    uploadFile,
  } = useApp()
  const dietitian = dietitians.find((item) => item.id === id && item.status === 'approved')
  const panel = panelFromSearch(params.get('tab') ?? (params.get('call') === '1' ? 'call' : null))
  const [selectedDay, setSelectedDay] = useState(upcomingDays()[0]?.iso ?? '')
  const [selectedTime, setSelectedTime] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [booking, setBooking] = useState(false)
  const [draft, setDraft] = useState('')
  const [pendingFiles, setPendingFiles] = useState<MessageAttachment[]>([])

  const conversationId =
    currentUser && dietitian
      ? conversations.find(
          (item) =>
            item.participantIds.includes(currentUser.id) &&
            item.participantIds.includes(dietitian.userId),
        )?.id ?? `conv-${[currentUser.id, dietitian.userId].sort().join('-')}`
      : ''

  const days = useMemo(() => upcomingDays(), [])
  const slots = dietitian ? timeSlotsFor(dietitian.availability, selectedDay) : []

  useEffect(() => {
    if (!currentUser || !dietitian) return
    openConversation(dietitian.userId, dietitian.name)
  }, [currentUser, dietitian, openConversation])

  useEffect(() => {
    if (apiEnabled()) return
    if (!conversationId || !dietitian || !currentUser) return
    const thread = messages.filter((item) => item.conversationId === conversationId)
    if (thread.length > 0) return
    sendPeerMessage(
      conversationId,
      dietitian.userId,
      `Hi ${currentUser.name.split(' ')[0]} — ${dietitian.name.split(' ').slice(-1)[0]} here. Book a time, chat with me here, or start a video call whenever you’re ready.`,
    )
  }, [conversationId, dietitian, currentUser, messages, sendPeerMessage])

  useEffect(() => {
    if (panel === 'call' && params.get('call') === '1' && dietitian && conversationId && !activeCall) {
      startCall(conversationId, dietitian.userId, dietitian.name, dietitian.avatar)
    }
  }, [panel, params, dietitian, conversationId, startCall, activeCall])

  if (!dietitian || !currentUser) {
    return (
      <div className="hy-card p-10 text-center">
        <p className="font-semibold">This specialist isn’t available.</p>
        <Link to="/dietitians" className="mt-3 inline-block text-sm font-semibold text-navy">
          Back to home
        </Link>
      </div>
    )
  }

  const thread = messages.filter((item) => item.conversationId === conversationId)
  const booked = appointments.filter(
    (item) => item.dietitianId === dietitian.id && item.patientId === currentUser.id && item.status === 'upcoming',
  )
  const inCall = activeCall?.peerId === dietitian.userId
  const firstName = dietitian.name.split(' ')[0] ?? dietitian.name
  const dietitianUserId = dietitian.userId

  function setPanel(next: Panel) {
    const search = new URLSearchParams(params)
    search.delete('call')
    search.set('tab', next)
    setParams(search, { replace: true })
  }

  function sendChat(text: string, attachments?: MessageAttachment[]) {
    if (!conversationId) return
    const files = attachments ?? pendingFiles
    const body = text.trim() || (files.length ? `Shared ${files.map((file) => file.name).join(', ')}` : '')
    if (!body) return
    sendMessage(conversationId, body, files.length ? files : undefined)
    files.forEach((file) => {
      uploadFile({
        name: file.name,
        category: fileCategoryFromName(file.name, file.type),
        size: file.size,
        sharedWithId: dietitianUserId,
        url: file.url,
      })
    })
    setPendingFiles([])
    if (apiEnabled()) return
    window.setTimeout(() => {
      sendPeerMessage(conversationId, dietitianUserId, dietitianReply(body, firstName))
    }, 700)
  }

  return (
    <div className="space-y-4">
      <article className="overflow-hidden rounded-lg bg-white shadow-card">
        <div className="px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar
                src={dietitian.avatar}
                name={dietitian.name}
                size={72}
                to={dietitianProfilePath(dietitian.id, currentUser.role)}
              />
              <div>
                <Link to={`/dietitians/${dietitian.id}`} className="text-xl font-extrabold text-ink hover:text-navy sm:text-2xl">
                  {dietitian.name}
                </Link>
                <p className="mt-1 text-sm font-medium text-muted">
                  {dietitian.title} · {dietitian.country}
                </p>
                <p className="mt-2 text-sm text-muted">Book an appointment, send a message, or start a video call.</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col" role="tablist" aria-label="Consultation">
              <Button
                className="w-full justify-center sm:w-auto sm:min-w-[168px]"
                variant={panel === 'book' ? 'primary' : 'outline'}
                onClick={() => setPanel('book')}
              >
                <CalendarDays size={16} /> Book & consult
              </Button>
              <Button
                className="w-full justify-center sm:w-auto sm:min-w-[168px]"
                variant={panel === 'chat' ? 'primary' : 'outline'}
                onClick={() => setPanel('chat')}
              >
                <MessageSquare size={16} /> Chat
              </Button>
              <Button
                className="w-full justify-center sm:w-auto sm:min-w-[168px]"
                variant={panel === 'call' ? 'primary' : 'secondary'}
                onClick={() => setPanel('call')}
              >
                <Video size={16} /> Video call
              </Button>
            </div>
          </div>
        </div>
      </article>

      {panel === 'book' && (
        <section className="hy-card p-5 sm:p-6" aria-label="Book appointment">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <CalendarDays size={18} className="text-navy" /> Book appointment
          </h2>
          <p className="mt-1 text-sm text-muted">Pick a day, then a time, then confirm before it is sent to your specialist.</p>
          <div className="mt-4 flex gap-2 overflow-auto pb-1">
            {days.map((day) => (
              <button
                key={day.iso}
                onClick={() => {
                  setSelectedDay(day.iso)
                  setSelectedTime('')
                }}
                className={`min-w-[4.5rem] rounded-xl px-2 py-2 text-center text-xs font-semibold ${
                  selectedDay === day.iso ? 'bg-[#0E3E77] text-white' : 'bg-panel text-muted'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
          <div className="mt-4 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">
            {slots.map((time) => {
              const taken = booked.some((item) => item.date === selectedDay && item.time === time)
              const selected = selectedTime === time
              return (
                <button
                  key={time}
                  disabled={taken}
                  className={`rounded-xl border py-2 text-sm font-semibold ${
                    taken
                      ? 'cursor-not-allowed border-line bg-panel text-muted'
                      : selected
                        ? 'border-[#0E3E77] bg-[#0E3E77] text-white'
                        : 'border-line bg-white hover:border-navy hover:bg-navy-soft'
                  }`}
                  onClick={() => setSelectedTime(time)}
                >
                  {time}
                </button>
              )
            })}
            {slots.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-muted">No openings this day. Try another date.</p>
            )}
          </div>
          <div className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {selectedTime
                ? `Selected ${selectedDay} at ${selectedTime}. Confirm to send this to ${dietitian.name}.`
                : 'Select a time to continue.'}
            </p>
            <Button disabled={!selectedTime} onClick={() => setConfirmOpen(true)}>
              Confirm
            </Button>
          </div>
          {booked.length > 0 && (
            <div className="mt-5 max-w-xl rounded-xl bg-navy-soft p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-navy-deep">Upcoming appointments</p>
              {booked.slice(0, 3).map((item) => (
                <div key={item.id} className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">
                    {item.date} · {item.time}
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                    onClick={() => cancelAppointment(item.id)}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              ))}
              <button className="mt-2 text-xs font-semibold text-navy" onClick={() => navigate('/appointments')}>
                View calendar
              </button>
            </div>
          )}
        </section>
      )}

      {panel === 'chat' && (
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-lg border border-line bg-white" aria-label="Messages">
          <div className="border-b border-line px-4 py-3">
            <p className="font-bold text-ink">Message {dietitian.name}</p>
            <p className="text-xs text-muted">They reply in this thread.</p>
          </div>
          <div className="flex-1 space-y-3 overflow-auto bg-panel p-4">
            {thread.map((message) => {
              const mine = message.senderId === currentUser.id
              return (
                <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? 'bg-[#0E3E77] text-white' : 'bg-white text-ink shadow-sm'}`}>
                    {message.text ? <p>{message.text}</p> : null}
                    {message.attachments?.map((file) => (
                      <ChatAttachment key={`${file.name}-${file.size}`} file={file} mine={mine} />
                    ))}
                    <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-muted'}`}>{formatTime(message.timestamp)}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <form
            className="border-t border-line p-3"
            onSubmit={(event) => {
              event.preventDefault()
              sendChat(draft)
              setDraft('')
            }}
          >
            {pendingFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingFiles.map((file) => (
                  <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-1.5 rounded-full bg-navy-soft px-2.5 py-1 text-xs font-medium text-navy">
                    <FileText size={12} />
                    {file.name}
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => setPendingFiles((current) => current.filter((item) => item.name !== file.name))}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-line text-muted hover:bg-panel">
                <Paperclip size={16} />
                <input
                  type="file"
                  multiple
                  className="hidden"
                  aria-label="Attach file"
                  onChange={(event) => {
                    const chosen = Array.from(event.target.files ?? [])
                    if (chosen.length === 0) return
                    const placeholders = chosen.map((file) => ({
                      name: file.name,
                      size: fileSizeLabel(file.size),
                      type: file.type,
                    }))
                    setPendingFiles((current) => [...current, ...placeholders])
                    void Promise.all(chosen.map(readLocalFile)).then((read) => {
                      setPendingFiles((current) =>
                        current.map((item) => read.find((file) => file.name === item.name) ?? item),
                      )
                    })
                    event.target.value = ''
                  }}
                />
              </label>
              <input
                className="hy-input"
                placeholder={`Message ${firstName}…`}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button type="submit" aria-label="Send" disabled={!draft.trim() && pendingFiles.length === 0}>
                <Send size={16} />
              </Button>
            </div>
          </form>
        </section>
      )}

      {panel === 'call' && (
        <VideoStage
          call={inCall ? activeCall : null}
          selfAvatar={currentUser.avatar}
          selfName={currentUser.name}
          onEnd={endCall}
          onAnswer={answerCall}
          onStart={() => startCall(conversationId, dietitian.userId, dietitian.name, dietitian.avatar)}
        />
      )}

      <Modal open={confirmOpen} title="Confirm appointment" onClose={() => setConfirmOpen(false)}>
        <p className="text-sm text-muted">
          Send {selectedDay} at {selectedTime} to {dietitian.name}? This is when the booking goes to your specialist.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Back
          </Button>
          <Button
            disabled={booking}
            onClick={() => {
              if (!selectedTime || booking) return
              setBooking(true)
              void (async () => {
                const ok = await bookAppointment(
                  dietitian.id,
                  selectedDay,
                  selectedTime,
                  `Consult with ${dietitian.name}`,
                  'video',
                )
                if (ok) {
                  sendChat(`I’d like to book ${selectedDay} at ${selectedTime}.`, [])
                  setConfirmOpen(false)
                  setSelectedTime('')
                }
                setBooking(false)
              })()
            }}
          >
            {booking ? 'Booking…' : 'Confirm and send'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
