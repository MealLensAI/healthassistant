import { CalendarDays, Trash2, Video } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { practicePath } from '@/lib/care/practiceBase'
import { Button } from '@/components/care-ui/Button'
import { Avatar } from '@/components/care-ui/Primitives'
import { useApp } from '@/lib/care/context'
import { useCallMedia } from '@/lib/care/callMedia'
import { dietitianProfilePath, patientProfilePath } from '@/lib/care/profilePaths'

export function AppointmentsPage({ role = 'patient' }: { role?: 'patient' | 'dietitian' }) {
  const { appointments, dietitians, users, currentUser, startCall, dispatch, cancelAppointment } = useApp()
  const { ensureLocalMedia } = useCallMedia()
  const navigate = useNavigate()

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
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Appointments</h1>
        <p className="text-sm text-muted">Video consults and follow-up chats with your care team.</p>
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
              {appointment.status === 'upcoming' && (
                <div className="flex flex-wrap gap-2">
                  {appointment.type === 'video' && dietitian && (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (role === 'patient') {
                          void ensureLocalMedia().finally(() => navigate(`/care/${dietitian.id}?call=1`))
                          return
                        }
                        const peerUser = patient
                        if (!peerUser) return
                        void ensureLocalMedia().finally(() => startCall('live', peerUser.id, peerUser.name, peerUser.avatar))
                      }}
                    >
                      <Video size={14} /> Join
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const dietitianUserId = dietitian?.userId
                      if (!dietitianUserId) return
                      const conversationId = `conv-${[appointment.patientId, dietitianUserId].sort().join('-')}`
                      navigate(role === 'dietitian' ? practicePath(`messages/${conversationId}`) : `/messages/${conversationId}`)
                    }}
                  >
                    Message
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dispatch({ type: 'COMPLETE_APPOINTMENT', appointmentId: appointment.id })}
                  >
                    Complete
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => cancelAppointment(appointment.id)}>
                    <Trash2 size={14} /> Delete
                  </Button>
                </div>
              )}
            </article>
          )
        })}
        {mine.length === 0 && (
          <div className="hy-card space-y-3 p-10 text-center text-sm text-muted">
            <p>No appointments yet.</p>
            <button
              type="button"
              className="font-semibold text-navy hover:underline"
              onClick={() => navigate('/dietitians')}
            >
              Find a dietitian to book
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
