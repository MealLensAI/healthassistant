import { CalendarDays, Trash2, Video } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { practicePath } from '@/lib/care/practiceBase'
import { Button } from '@/components/care-ui/Button'
import { Avatar } from '@/components/care-ui/Primitives'
import { useApp } from '@/lib/care/context'
import { useCallMedia } from '@/lib/care/callMediaContext'
import { dietitianProfilePath, patientProfilePath } from '@/lib/care/profilePaths'
import { usePlanUsage } from '@/hooks/usePlanUsage'

export function AppointmentsPage({ role = 'patient' }: { role?: 'patient' | 'dietitian' }) {
  const { appointments, dietitians, users, currentUser, startCall, dispatch, cancelAppointment, openConversation } = useApp()
  const { ensureLocalMedia } = useCallMedia()
  const navigate = useNavigate()
  const [messagingId, setMessagingId] = useState<string | null>(null)
  const { entitlements, remaining, usage } = usePlanUsage()

  if (!currentUser) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Appointments</h1>
          <p className="text-sm text-muted">Loading your care calendar…</p>
        </div>
        <div className="hy-card p-10 text-center text-sm text-muted">Getting your appointments ready.</div>
      </div>
    )
  }

  const mine = appointments
    .filter((appointment) => appointment.status !== 'deleted')
    .filter((appointment) =>
      role === 'dietitian'
        ? dietitians.find((item) => item.id === appointment.dietitianId)?.userId === currentUser.id
        : appointment.patientId === currentUser.id,
    )
    .slice()
    .sort((a, b) => {
      const rank = (status: string) => (status === 'upcoming' ? 0 : status === 'completed' ? 1 : 2)
      const byStatus = rank(a.status) - rank(b.status)
      if (byStatus !== 0) return byStatus
      return `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)
    })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Appointments</h1>
          <p className="text-sm text-muted">Video consults and follow-up chats with your care team.</p>
        </div>
        {role === 'patient' && entitlements.marketplace_access ? (
          <div className="shrink-0 rounded-full border border-line bg-panel px-3 py-1.5 text-right">
            <p className="text-xs font-semibold text-ink">
              Consult {usage.consultations}/{entitlements.consultations}
            </p>
            <p className="text-[11px] font-medium text-muted">
              Follow-ups {usage.followUps}/{entitlements.follow_ups}
              {remaining.remainingTotal === 0 ? ' · none left' : ` · ${remaining.remainingTotal} left`}
            </p>
          </div>
        ) : null}
      </div>
      <div className="space-y-3">
        {mine.map((appointment) => {
          const dietitian = dietitians.find((item) => item.id === appointment.dietitianId)
          const patient = users.find((item) => item.id === appointment.patientId)
          const peer = role === 'dietitian' ? patient : dietitian
          const avatarTo =
            role === 'dietitian' && patient
              ? patientProfilePath(patient.id, currentUser.role, currentUser.id)
              : dietitian
                ? dietitianProfilePath(dietitian.id, currentUser.role)
                : undefined
          return (
            <article key={appointment.id} className="hy-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
              <Avatar
                src={role === 'dietitian' ? patient?.avatar : dietitian?.avatar}
                name={peer?.name ?? 'Care'}
                size={52}
                to={avatarTo}
              />
              <div className="flex-1">
                {avatarTo ? (
                  <Link to={avatarTo} className="font-bold text-ink hover:text-navy">
                    {peer?.name}
                  </Link>
                ) : (
                  <p className="font-bold text-ink">{peer?.name}</p>
                )}
                <p className="text-sm text-muted">{appointment.topic}</p>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                  <CalendarDays size={14} /> {appointment.date} · {appointment.time} · {appointment.type}
                </p>
              </div>
              <span className="rounded-full bg-navy-soft px-3 py-1 text-xs font-bold capitalize text-navy-deep">
                {appointment.status}
              </span>
              <div className="flex flex-wrap gap-2">
                {appointment.status === 'upcoming' && appointment.type === 'video' && dietitian ? (
                  <Button
                    size="sm"
                    onClick={async () => {
                      if (role === 'patient') {
                        if (!dietitian) return
                        const stream = await ensureLocalMedia()
                        if (stream) await startCall('live', dietitian.userId, dietitian.name, dietitian.avatar || '')
                        return
                      }
                      const peerUser = patient
                      if (!peerUser) return
                      const stream = await ensureLocalMedia()
                      if (stream) await startCall('live', peerUser.id, peerUser.name, peerUser.avatar)
                    }}
                  >
                    <Video size={14} /> Join
                  </Button>
                ) : null}
                {appointment.status === 'upcoming' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    loading={messagingId === appointment.id}
                    onClick={() => {
                      const dietitianUserId = dietitian?.userId
                      if (!dietitianUserId || !currentUser) return
                      setMessagingId(appointment.id)
                      const peerId = role === 'dietitian' ? appointment.patientId : dietitianUserId
                      const peerName = role === 'dietitian' ? (patient?.name || 'Patient') : (dietitian?.name || 'Dietitian')
                      void openConversation(peerId, peerName)
                        .then((conversationId) => {
                          if (!conversationId) return
                          navigate(role === 'dietitian' ? practicePath(`messages/${conversationId}`) : `/messages/${conversationId}`)
                        })
                        .finally(() => setMessagingId(null))
                    }}
                  >
                    Message
                  </Button>
                ) : null}
                {appointment.status === 'upcoming' ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch({ type: 'COMPLETE_APPOINTMENT', appointmentId: appointment.id })}
                  >
                    Complete
                  </Button>
                ) : null}
                <Button size="sm" variant="danger" onClick={() => cancelAppointment(appointment.id)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            </article>
          )
        })}
        {mine.length === 0 && (
          <div className="hy-card space-y-3 p-10 text-center text-sm text-muted">
            <p>No appointments yet.</p>
            {role === 'patient' ? (
              <button
                type="button"
                className="font-semibold text-navy hover:underline"
                onClick={() => navigate('/dietitians')}
              >
                Find a dietitian to book
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
