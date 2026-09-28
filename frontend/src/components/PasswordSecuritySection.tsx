import { useState } from 'react'
import { Button } from '@/components/care-ui/Button'
import { api } from '@/lib/api'
import { useApp } from '@/lib/care/context'

export function PasswordSecuritySection() {
  const { currentUser, toast } = useApp()
  const [password, setPassword] = useState({ current: '', next: '', confirm: '' })
  const [busy, setBusy] = useState(false)

  async function update(event: React.FormEvent) {
    event.preventDefault()
    if (password.next !== password.confirm) {
      toast('error', 'New passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const result = await api.post('/change-password', { current_password: password.current, new_password: password.next })
      if (result.status !== 'success') throw new Error(result.message || 'Could not update password.')
      setPassword({ current: '', next: '', confirm: '' })
      toast('success', 'Password updated. Please sign in again.')
      window.localStorage.removeItem('access_token')
      window.localStorage.removeItem('user_data')
      window.localStorage.removeItem('meallensai.session')
      window.location.assign('/login')
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Could not update password.')
    } finally { setBusy(false) }
  }

  async function sendReset() {
    if (!currentUser?.email) return
    setBusy(true)
    try {
      const result = await api.requestPasswordReset(currentUser.email)
      if (result.status !== 'success') throw new Error(result.message || 'Could not send password reset.')
      toast('success', 'Check your email for a password reset link.')
    } catch (error) {
      toast('error', error instanceof Error ? error.message : 'Could not send password reset.')
    } finally { setBusy(false) }
  }

  return <section className="hy-card p-5">
    <h2 className="font-bold text-ink">Password & security</h2>
    <p className="mt-1 text-sm text-muted">Change your password or request a reset by email.</p>
    <form onSubmit={(event) => void update(event)} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {(['current', 'next', 'confirm'] as const).map((key) => <label key={key} className={key === 'current' ? 'sm:col-span-2' : ''}>
          <span className="hy-label">{key === 'current' ? 'Current password' : key === 'next' ? 'New password' : 'Confirm new password'}</span>
          <input className="hy-input" type="password" autoComplete={key === 'current' ? 'current-password' : 'new-password'} required minLength={key === 'current' ? 1 : 8} value={password[key]} onChange={(event) => setPassword({ ...password, [key]: event.target.value })} />
        </label>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy}>Update password</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void sendReset()}>Send password reset</Button>
      </div>
    </form>
  </section>
}
