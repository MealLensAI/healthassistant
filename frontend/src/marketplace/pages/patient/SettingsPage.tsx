import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context'
import { DEMO_ACCOUNTS } from '../../data/mock'
import { useTheme } from '../../theme'
import type { PatientAccountSettings } from '../../types'

export function SettingsPage() {
  const {
    currentUser,
    users,
    login,
    logout,
    toast,
    patientSettings,
    savePatientSettings,
    deviceSessions,
    endSession,
    files,
    dietitians,
    setFileShare,
  } = useApp()
  const { theme, setTheme } = useTheme()
  if (!currentUser) return null

  const stored = patientSettings.find((item) => item.userId === currentUser.id)
  const isPatient = currentUser.role === 'patient'

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Settings</h1>
        <p className="text-sm text-muted">
          {isPatient
            ? 'Account, privacy, scheduling, and billing for your care workspace.'
            : 'Password, security, and demo role switching.'}
        </p>
      </div>

      <section className="hy-card p-5">
        <h2 className="font-bold text-ink">Appearance</h2>
        <p className="mt-1 text-sm text-muted">Switch the whole workspace between light and dark view. Your choice is saved on this device.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`rounded-xl border px-4 py-3 text-left ${
              theme === 'light' ? 'border-navy bg-navy-soft text-navy' : 'border-line bg-panel text-ink'
            }`}
          >
            <span className="block text-sm font-bold">Light view</span>
            <span className="mt-1 block text-xs text-muted">Cream background, navy text</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`rounded-xl border px-4 py-3 text-left ${
              theme === 'dark' ? 'border-navy bg-navy-soft text-navy' : 'border-line bg-panel text-ink'
            }`}
          >
            <span className="block text-sm font-bold">Dark view</span>
            <span className="mt-1 block text-xs text-muted">Night background, light text</span>
          </button>
        </div>
      </section>

      <section className="hy-card p-5">
        <h2 className="font-bold text-ink">Profile</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="hy-label">Name</span>
            <input className="hy-input" defaultValue={currentUser.name} readOnly />
          </label>
          <label>
            <span className="hy-label">Email</span>
            <input className="hy-input" defaultValue={currentUser.email} readOnly />
          </label>
          <label>
            <span className="hy-label">Role</span>
            <input className="hy-input capitalize" defaultValue={currentUser.role} readOnly />
          </label>
          <label>
            <span className="hy-label">Country</span>
            <input className="hy-input" defaultValue={currentUser.country ?? '—'} readOnly />
          </label>
        </div>
        {isPatient && (
          <Link to="/profile" className="mt-4 inline-block text-sm font-semibold text-navy">
            Open clinical patient profile
          </Link>
        )}
        {currentUser.role === 'dietitian' &&
          dietitians
            .filter((item) => item.userId === currentUser.id)
            .map((listing) => (
              <p key={listing.id} className="mt-4 text-sm text-muted">
                Patients still see your public listing, including reviews.{' '}
                <Link to={`/dietitian/dietitians/${listing.id}`} className="font-semibold text-navy">
                  View public profile
                </Link>
              </p>
            ))}
      </section>

      {currentUser.role !== 'patient' && <PasswordSecuritySection />}

      {isPatient && stored && (
        <PatientSettingsSections
          settings={stored}
          onSave={savePatientSettings}
          onResetPassword={() => toast('success', 'Password reset link sent to your email.')}
          sessions={deviceSessions.filter((item) => item.userId === currentUser.id)}
          onEndSession={endSession}
          sharedDietitians={dietitians.filter((dietitian) =>
            files.some((file) => file.ownerId === currentUser.id && file.sharedWithId === dietitian.userId),
          )}
          onShare={setFileShare}
          onExport={() => toast('success', 'Medical data export started. We will email a copy.')}
          onDelete={() => toast('info', 'Deletion request submitted. A clinician will confirm by email.')}
        />
      )}

      <section className="hy-card p-5">
        <h2 className="font-bold text-ink">Switch demo workspace</h2>
        <p className="mt-1 text-sm text-muted">Use this to review patient, dietitian, applicant, and admin flows.</p>
        <div className="mt-4 space-y-2">
          {DEMO_ACCOUNTS.map((account) => {
            const user = users.find((item) => item.id === account.userId)
            if (!user) return null
            return (
              <Button
                key={account.userId}
                variant={currentUser.id === user.id ? 'primary' : 'outline'}
                className="w-full justify-start"
                onClick={() => login(user.id)}
              >
                {account.label}: {user.name}
              </Button>
            )
          })}
        </div>
        <Button className="mt-4" variant="danger" onClick={logout}>
          Sign out
        </Button>
      </section>
    </div>
  )
}

function PasswordSecuritySection() {
  const { toast } = useApp()
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' })
  const [twoFactorSms, setTwoFactorSms] = useState(true)
  const [twoFactorApp, setTwoFactorApp] = useState(false)

  function sendReset() {
    toast('success', 'Password reset link sent to your email.')
  }

  function savePassword() {
    if (password.next.length < 8) {
      toast('error', 'New password must be at least 8 characters.')
      return
    }
    if (password.next !== password.confirm) {
      toast('error', 'New password and confirmation do not match.')
      return
    }
    setPassword({ current: '', next: '', confirm: '' })
    toast('success', 'Password updated.')
  }

  return (
    <section className="hy-card p-5">
      <h2 className="font-bold text-ink">Password & security</h2>
      <p className="mt-1 text-sm text-muted">Reset from email or set a new password here.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="hy-label">Current password</span>
          <input
            className="hy-input"
            type="password"
            value={password.current}
            onChange={(event) => setPassword({ ...password, current: event.target.value })}
          />
        </label>
        <label>
          <span className="hy-label">New password</span>
          <input
            className="hy-input"
            type="password"
            value={password.next}
            onChange={(event) => setPassword({ ...password, next: event.target.value })}
          />
        </label>
        <label>
          <span className="hy-label">Confirm new password</span>
          <input
            className="hy-input"
            type="password"
            value={password.confirm}
            onChange={(event) => setPassword({ ...password, confirm: event.target.value })}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={savePassword}>Update password</Button>
        <Button variant="outline" onClick={sendReset}>
          Send password reset
        </Button>
      </div>
      <div className="mt-5 space-y-1">
        <Toggle label="Two-factor authentication via SMS" checked={twoFactorSms} onChange={setTwoFactorSms} />
        <Toggle label="Authenticator app" checked={twoFactorApp} onChange={setTwoFactorApp} />
      </div>
    </section>
  )
}

function PatientSettingsSections({
  settings,
  onSave,
  onResetPassword,
  sessions,
  onEndSession,
  sharedDietitians,
  onShare,
  onExport,
  onDelete,
}: {
  settings: PatientAccountSettings
  onSave: (settings: PatientAccountSettings) => void
  onResetPassword: () => void
  sessions: { id: string; device: string; location: string; lastActive: string; current: boolean }[]
  onEndSession: (id: string) => void
  sharedDietitians: { userId: string; name: string }[]
  onShare: (dietitianUserId: string, granted: boolean) => void
  onExport: () => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState(settings)

  function patch(partial: Partial<PatientAccountSettings>) {
    setDraft((current) => ({ ...current, ...partial }))
  }

  return (
    <>
      <section className="hy-card p-5">
        <h2 className="font-bold text-ink">Account & security</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="hy-label">Email</span>
            <input className="hy-input" value={draft.email} onChange={(event) => patch({ email: event.target.value })} />
          </label>
          <label>
            <span className="hy-label">Phone</span>
            <input className="hy-input" value={draft.phone} onChange={(event) => patch({ phone: event.target.value })} />
          </label>
        </div>
        <div className="mt-4 space-y-1">
          <Toggle label="Two-factor authentication via SMS" checked={draft.twoFactorSms} onChange={(twoFactorSms) => patch({ twoFactorSms })} />
          <Toggle label="Authenticator app" checked={draft.twoFactorApp} onChange={(twoFactorApp) => patch({ twoFactorApp })} />
        </div>
        <Button className="mt-4" variant="outline" onClick={onResetPassword}>
          Send password reset
        </Button>
        <div className="mt-5">
          <h3 className="text-sm font-bold text-ink">Active sessions</h3>
          <ul className="mt-2 space-y-2">
            {sessions.map((session) => (
              <li key={session.id} className="flex items-center justify-between rounded-xl bg-panel px-3 py-3 text-sm">
                <span>
                  <span className="block font-semibold">{session.device}</span>
                  <span className="text-xs text-muted">
                    {session.location} · {session.lastActive}
                  </span>
                </span>
                {session.current ? (
                  <span className="text-xs font-semibold text-navy">This device</span>
                ) : (
                  <button className="text-xs font-semibold text-destructive" onClick={() => onEndSession(session.id)}>
                    Log out
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="hy-card p-5">
        <h2 className="font-bold text-ink">Time zone & scheduling</h2>
        <label className="mt-4 block">
          <span className="hy-label">Primary time zone</span>
          <select className="hy-input" value={draft.timeZone} onChange={(event) => patch({ timeZone: event.target.value })}>
            <option value="Europe/London">Europe/London</option>
            <option value="America/New_York">America/New_York</option>
            <option value="America/Los_Angeles">America/Los_Angeles</option>
            <option value="America/Toronto">America/Toronto</option>
            <option value="Europe/Rome">Europe/Rome</option>
            <option value="Asia/Kolkata">Asia/Kolkata</option>
          </select>
        </label>
        <div className="mt-3 space-y-1">
          <Toggle label="Remind me 24 hours before a call" checked={draft.remind24h} onChange={(remind24h) => patch({ remind24h })} />
          <Toggle label="Remind me 1 hour before a call" checked={draft.remind1h} onChange={(remind1h) => patch({ remind1h })} />
        </div>
      </section>

      <section className="hy-card p-5">
        <h2 className="font-bold text-ink">Notifications & communication</h2>
        <p className="mt-1 text-sm text-muted">Channels for chat, appointment confirmations, and document uploads.</p>
        <div className="mt-3 space-y-1">
          <Toggle label="Push" checked={draft.notifyPush} onChange={(notifyPush) => patch({ notifyPush })} />
          <Toggle label="Email" checked={draft.notifyEmail} onChange={(notifyEmail) => patch({ notifyEmail })} />
          <Toggle label="SMS" checked={draft.notifySms} onChange={(notifySms) => patch({ notifySms })} />
          <Toggle label="Do not disturb quiet hours" checked={draft.quietHours} onChange={(quietHours) => patch({ quietHours })} />
        </div>
        {draft.quietHours && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label>
              <span className="hy-label">Quiet from</span>
              <input className="hy-input" type="time" value={draft.quietFrom} onChange={(event) => patch({ quietFrom: event.target.value })} />
            </label>
            <label>
              <span className="hy-label">Quiet to</span>
              <input className="hy-input" type="time" value={draft.quietTo} onChange={(event) => patch({ quietTo: event.target.value })} />
            </label>
          </div>
        )}
      </section>

      <section className="hy-card p-5">
        <h2 className="font-bold text-ink">Privacy & health data permissions</h2>
        <p className="mt-1 text-sm text-muted">Grant or revoke temporary file access for consulting dietitians.</p>
        <ul className="mt-3 space-y-2">
          {sharedDietitians.map((dietitian) => (
            <li key={dietitian.userId} className="flex items-center justify-between rounded-xl bg-panel px-3 py-3 text-sm">
              <span className="font-semibold">{dietitian.name}</span>
              <button className="text-xs font-semibold text-destructive" onClick={() => onShare(dietitian.userId, false)}>
                Revoke file access
              </button>
            </li>
          ))}
          {sharedDietitians.length === 0 && <li className="text-sm text-muted">No dietitian currently has file access.</li>}
        </ul>
        <div className="mt-4 space-y-1">
          <Toggle label="Blur video background by default" checked={draft.blurBackground} onChange={(blurBackground) => patch({ blurBackground })} />
          <Toggle label="Camera on when a call starts" checked={draft.cameraDefaultOn} onChange={(cameraDefaultOn) => patch({ cameraDefaultOn })} />
          <Toggle label="Microphone on when a call starts" checked={draft.micDefaultOn} onChange={(micDefaultOn) => patch({ micDefaultOn })} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport}>
            Export medical data
          </Button>
          <Button variant="danger" onClick={onDelete}>
            Request account deletion
          </Button>
        </div>
      </section>

      <Button onClick={() => onSave(draft)}>Save settings</Button>
    </>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-[#0E3E77]' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </label>
  )
}
