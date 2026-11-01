import { CalendarDays, MessageSquare, Trash2, Video } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { VideoStage } from '@/components/calls/VideoStage'
import { Avatar, Modal } from '@/components/care-ui/Primitives'
import { Button } from '@/components/care-ui/Button'
import { useApp } from '@/lib/care/context'
import { accountAvatar } from '@/lib/care/accountAvatar'
import { conversationIdFor, withCallPeerAvatar } from '@/lib/care/calls'
import { timeSlotsFor, upcomingDays } from '@/lib/care/care'
import { dietitianProfilePath } from '@/lib/care/profilePaths'
import { usePlanUsage } from '@/hooks/usePlanUsage'

type Panel = 'book' | 'call'

function panelFromSearch(value: string | null): Panel {
  if (value === 'call') return 'call'
  return 'book'
}

export function CarePage() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const {
    dietitians,
    applications,
    users,
    currentUser,
    openConversation,
    bookAppointment,
    cancelAppointment,
    appointments,
    conversations,
    startCall,
    answerCall,
    endCall,
    activeCall,
  } = useApp()
  const dietitian = dietitians.find((item) => item.id === id && item.status === 'approved')
  const panel = panelFromSearch(params.get('tab') ?? (params.get('call') === '1' ? 'call' : null))
  const [selectedDay, setSelectedDay] = useState(upcomingDays()[0]?.iso ?? '')
  const [selectedTime, setSelectedTime] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [booking, setBooking] = useState(false)
  const [openingChat, setOpeningChat] = useState(false)
  const { canBook, nextKind } = usePlanUsage()

  const conversationId =
    currentUser && dietitian
      ? conversations.find(
          (item) =>
            item.participantIds.includes(currentUser.id) &&
            item.participantIds.includes(dietitian.userId) &&
            !String(item.id).startsWith('conv-'),
        )?.id ?? conversationIdFor(currentUser.id, dietitian.userId)
      : ''

  const days = useMemo(() => upcomingDays(), [])
  const slots = dietitian ? timeSlotsFor(dietitian.availability, selectedDay) : []

  // Chat tab used to be an embedded inbox — always send people to Messages instead.
  useEffect(() => {
    if (params.get('tab') !== 'chat' || !currentUser || !dietitian) return
    let cancelled = false
    setOpeningChat(true)
    void openConversation(dietitian.userId, dietitian.name)
      .then((id) => {
        if (cancelled) return
        if (id) navigate(`/messages/${id}`, { replace: true })
      })
      .finally(() => {
        if (!cancelled) setOpeningChat(false)
      })
    return () => {
      cancelled = true
    }
  }, [params, currentUser, dietitian, openConversation, navigate, conversationId])

  useEffect(() => {
    if (!currentUser || !dietitian) return
    void openConversation(dietitian.userId, dietitian.name)
  }, [currentUser, dietitian, openConversation])

  useEffect(() => {
    if (panel === 'call' && params.get('call') === '1' && dietitian && conversationId && !activeCall) {
      const next = new URLSearchParams(params)
      next.delete('call')
      next.set('tab', 'call')
      setParams(next, { replace: true })
      startCall(conversationId, dietitian.userId, dietitian.name, dietitian.avatar)
    }
  }, [panel, params, dietitian, conversationId, startCall, activeCall, setParams])

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

  const booked = appointments.filter(
    (item) => item.dietitianId === dietitian.id && item.patientId === currentUser.id && item.status === 'upcoming',
  )
  const inCall = activeCall?.peerId === dietitian.userId

  function setPanel(next: Panel) {
    const search = new URLSearchParams(params)
    search.delete('call')
    search.set('tab', next)
    setParams(search, { replace: true })
  }

  async function goToMessages() {
    if (!dietitian) return
    setOpeningChat(true)
    try {
      const threadId = await openConversation(dietitian.userId, dietitian.name)
      if (threadId) navigate(`/messages/${threadId}`)
    } finally {
      setOpeningChat(false)
    }
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
                variant="outline"
                loading={openingChat}
                onClick={() => void goToMessages()}
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
            <Button disabled={!selectedTime || !canBook} onClick={() => setConfirmOpen(true)}>
              Confirm
            </Button>
          </div>
          {!canBook ? (
            <p className="mt-2 text-sm text-muted">No consultation or follow-up calls left on this plan.</p>
          ) : null}
          {booked.length > 0 && (
            <div className="mt-5 max-w-xl rounded-xl bg-navy-soft p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-navy-deep">Upcoming appointments</p>
              {booked.slice(0, 3).map((item) => (
                <div key={item.id} className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-ink">
                    {item.date} · {item.time}
                  </p>
                  <Button
                    size="sm"
                    variant="danger"
                    className="h-7 px-2 text-xs"
                    onClick={() => cancelAppointment(item.id)}
                  >
                    <Trash2 size={12} /> Delete
                  </Button>
                </div>
              ))}
              <button className="mt-2 text-xs font-semibold text-navy" onClick={() => navigate('/appointments')}>
                View calendar
              </button>
            </div>
          )}
        </section>
      )}

      {panel === 'call' && !(activeCall && !activeCall.incoming) ? (
        <VideoStage
          call={inCall ? withCallPeerAvatar(activeCall, users, dietitians, applications) : null}
          selfAvatar={accountAvatar(currentUser, dietitians, applications)}
          selfName={currentUser.name}
          onEnd={endCall}
          onAnswer={answerCall}
          onStart={() => startCall(conversationId, dietitian.userId, dietitian.name, dietitian.avatar)}
        />
      ) : null}

      <Modal open={confirmOpen} title="Confirm appointment" onClose={() => setConfirmOpen(false)}>
        <p className="text-sm text-muted">
          Send {selectedDay} at {selectedTime} to {dietitian.name}? This is when the booking goes to your specialist.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Back
          </Button>
          <Button
            loading={booking}
            onClick={() => {
              if (!selectedTime || booking) return
              setBooking(true)
              void (async () => {
                const ok = await bookAppointment(
                  dietitian.id,
                  selectedDay,
                  selectedTime,
                  nextKind === 'follow_up'
                    ? `Follow-up with ${dietitian.name}`
                    : `Consultation with ${dietitian.name}`,
                  'video',
                )
                if (ok) {
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
