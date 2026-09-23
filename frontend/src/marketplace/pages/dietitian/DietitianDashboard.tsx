import { Link } from 'react-router-dom'
import { Avatar, Pill } from '../../components/ui/Primitives'
import { useApp } from '../../context'
import { patientChartPath, peerProfilePath } from '../../lib/profilePaths'
import { DietitianProfilePage } from '../patient/DietitianProfilePage'

export function DietitianDashboard() {
  const { currentUser, dietitians, appointments, conversations, messages, users } = useApp()
  if (!currentUser) return null

  const me = dietitians.find((item) => item.userId === currentUser.id)
  const myAppointments = appointments.filter((item) => item.dietitianId === me?.id && item.status === 'upcoming')
  const myConversations = conversations
    .filter((item) => item.participantIds.includes(currentUser.id))
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .slice(0, 4)

  return (
    <div className="space-y-5">
      <DietitianProfilePage />

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="hy-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ink">Patient Appointments</h2>
            <Link to="/dietitian/appointments" className="text-sm font-semibold text-navy">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {myAppointments.map((appointment) => {
              const patient = users.find((item) => item.id === appointment.patientId)
              return (
                <div key={appointment.id} className="flex items-center gap-3 rounded-xl bg-panel p-3">
                  <Avatar src={patient?.avatar} name={patient?.name ?? 'Patient'} size={40} to={patient ? patientChartPath(patient.id, currentUser.role) : undefined} />
                  <Link to={patientChartPath(appointment.patientId, currentUser.role)} className="min-w-0 hover:text-navy">
                    <p className="text-sm font-semibold text-ink">{patient?.name}</p>
                    <p className="text-xs text-muted">
                      {appointment.date} · {appointment.time} · {appointment.topic}
                    </p>
                  </Link>
                </div>
              )
            })}
            {myAppointments.length === 0 && <p className="text-sm text-muted">No upcoming appointments.</p>}
          </div>
        </section>

        <section className="hy-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-ink">Internal platform messages</h2>
            <Link to="/dietitian/messages" className="text-sm font-semibold text-navy">
              Open inbox
            </Link>
          </div>
          <div className="space-y-3">
            {myConversations.map((conversation) => {
              const last = messages.filter((item) => item.conversationId === conversation.id).at(-1)
              const sender = users.find((item) => item.id === last?.senderId)
              const peer = users.find((item) => conversation.participantIds.includes(item.id) && item.id !== currentUser.id)
              const from = sender && sender.id !== currentUser.id ? sender : peer
              const chartTo = from
                ? peerProfilePath({ currentUser, peerUserId: from.id, dietitians, users })
                : undefined
              return (
                <div key={conversation.id} className="flex items-center gap-3 rounded-xl bg-panel p-3 hover:bg-navy-soft">
                  <Avatar src={from?.avatar} name={from?.name ?? 'Patient'} size={40} to={chartTo} />
                  <Link to={`/dietitian/messages/${conversation.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{from?.name ?? 'Patient'}</p>
                    <p className="truncate text-sm text-ink">{last?.text ?? conversation.lastMessage}</p>
                    <p className="text-xs text-muted">{(last?.timestamp ?? conversation.lastAt).slice(0, 16).replace('T', ' ')}</p>
                  </Link>
                </div>
              )
            })}
            {myConversations.length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
          </div>
        </section>
      </div>

      <section className="hy-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ink">Availability setup</h2>
          <Link to="/dietitian/availability" className="text-sm font-semibold text-navy">
            Edit calendar
          </Link>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {me?.availability.map((slot) => (
            <div key={slot.day} className="rounded-xl bg-panel p-3">
              <p className="text-sm font-bold text-ink">{slot.day}</p>
              <p className="text-xs text-muted">{slot.enabled ? `${slot.start} – ${slot.end}` : 'Unavailable'}</p>
            </div>
          ))}
        </div>
        {me && (
          <div className="mt-4 flex flex-wrap gap-2">
            {me.specialties.map((item) => (
              <Pill key={item}>{item}</Pill>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
