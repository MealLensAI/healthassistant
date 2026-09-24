import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { Button } from '@/components/care-ui/Button'
import { useApp } from '@/lib/care/context'
import { readHealthAppUser } from '@/lib/care/embeddedAuth'

const STEPS = 3

export function DoctorOnboardingPage() {
  const { currentUser, registerAccount } = useApp()
  const navigate = useNavigate()
  const ha = typeof window !== 'undefined' ? readHealthAppUser() : null
  const [step, setStep] = useState(1)
  const [name, setName] = useState(ha?.name ?? '')
  const [email, setEmail] = useState(ha?.email ?? '')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!ha) return
    setName((current) => current || ha.name)
    setEmail((current) => current || ha.email)
  }, [ha])

  // Already synced as dietitian in the host app — go straight to registration docs.
  if (currentUser?.role === 'dietitian') {
    return <Navigate to="/dietitian/apply" replace />
  }
  if (currentUser?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }

  return (
    <OnboardingShell
      image="https://images.unsplash.com/photo-1579684385127-1f41f42f6ba5?auto=format&fit=crop&w=1600&q=80"
      kicker="Dietitian onboarding"
      headline="Join as a verified dietitian."
      support="Create your workspace, upload your license and degrees, then wait for admin approval. Patients only see you after you are approved."
      step={step}
      stepCount={STEPS}
    >
      {step === 1 && (
        <div className="space-y-5">
          <h1 className="font-display text-3xl font-extrabold text-ink">Let’s get you credentialed.</h1>
          <ul className="space-y-3 text-sm text-ink">
            <li className="rounded-lg bg-white p-4 ring-1 ring-line">1. Set up your specialist account</li>
            <li className="rounded-lg bg-white p-4 ring-1 ring-line">2. Upload license, degrees, and a photo</li>
            <li className="rounded-lg bg-white p-4 ring-1 ring-line">3. Admin reviews you before patients can find you</li>
          </ul>
          <Button className="w-full" onClick={() => setStep(2)}>
            Start onboarding
          </Button>
        </div>
      )}

      {step === 2 && (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            setStep(3)
          }}
        >
          <h1 className="font-display text-3xl font-extrabold text-ink">Your specialist profile</h1>
          <p className="text-sm text-muted">This is the name and contact patients will see after you are approved.</p>
          <label className="block text-sm font-semibold text-ink">
            Full name
            <input className="hy-input mt-1" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Email
            <input
              className="hy-input mt-1"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              readOnly={Boolean(ha?.email)}
            />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Phone
            <input className="hy-input mt-1" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Country
            <input className="hy-input mt-1" value={country} onChange={(event) => setCountry(event.target.value)} />
          </label>
          <div className="flex gap-3">
            <Button className="flex-1" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button className="flex-1" type="submit" disabled={!name.trim() || !email.trim()}>
              Continue
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <h1 className="font-display text-3xl font-extrabold text-ink">Documents come next</h1>
          <p className="text-sm text-muted">
            We’ll create your specialist workspace now. On the next screen you’ll upload your profile photo, practice
            license, and degrees for admin review.
          </p>
          <div className="flex gap-3">
            <Button className="flex-1" variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={busy}
              onClick={() => {
                if (busy) return
                setBusy(true)
                void registerAccount({ name, email, phone, country, role: 'dietitian' }).then((ok) => {
                  setBusy(false)
                  if (ok) navigate('/dietitian/apply')
                })
              }}
            >
              {busy ? 'Creating workspace…' : 'Create workspace'}
            </Button>
          </div>
        </div>
      )}
    </OnboardingShell>
  )
}
