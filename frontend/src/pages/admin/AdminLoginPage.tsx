import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/CareLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { adminLoginOnServer, apiEnabled, fetchServerState, mergeServerState, setSessionUserId } from '@/lib/care/api'
import { useApp } from '@/lib/care/context'
import type { User } from '@/lib/care/types'
import { USERS } from '@/lib/care/data/mock'

type Props = {
  onSignedIn?: () => void
}

export function AdminLoginPage({ onSignedIn }: Props) {
  const { dispatch } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (!apiEnabled()) {
        // Offline / mock: accept any credentials that match the seeded admin email when VITE_USE_API=false.
        const seed = USERS.find((item) => item.role === 'admin') as User | undefined
        if (!seed || email.trim().toLowerCase() !== seed.email.toLowerCase()) {
          throw new Error('Incorrect email or password')
        }
        setSessionUserId(seed.id)
        dispatch({ type: 'LOGIN', user: seed })
        onSignedIn?.()
        return
      }

      const result = await adminLoginOnServer(email.trim(), password)
      const server = await fetchServerState()
      const hydrated = mergeServerState(
        {
          ...(server as never),
          toasts: [],
          activeCall: null,
          currentUser: null,
        },
        { ...server, currentUser: result.user as never },
      )
      dispatch({
        type: 'HYDRATE',
        state: { ...hydrated, currentUser: result.user as never },
      })
      onSignedIn?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect email or password')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="marketplace-root grid min-h-dvh place-items-center bg-cream px-4 py-10 text-left">
      <ThemeToggle className="absolute right-4 top-4 sm:right-6 sm:top-6" />
      <div className="w-full max-w-md">
        <Logo className="h-10" />
        <h1 className="font-display mt-8 text-3xl font-extrabold text-ink">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Enter the email and password configured for the MealLensAI verification console.
        </p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block space-y-1.5">
            <span className="hy-label">Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="hy-input w-full"
              placeholder="admin@meallensai.com"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="hy-label">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="hy-input w-full"
              placeholder="••••••••"
            />
          </label>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center rounded-lg bg-navy px-4 py-3 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <Link to="/food-for-you" className="mt-6 inline-block text-sm font-semibold text-navy">
          Back to app
        </Link>
      </div>
    </div>
  )
}
