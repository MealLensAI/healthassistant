import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { OnboardingShell } from '@/components/onboarding/OnboardingShell'
import { Button } from '@/components/care-ui/Button'
import { useApp } from '@/lib/care/context'
import { CONDITIONS } from '@/lib/care/data/mock'

const STEPS = 3

export function PatientOnboardingPage() {
  const { currentUser, registerAccount } = useApp()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('')
  const [condition, setCondition] = useState('')
  const [allergies, setAllergies] = useState('')
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)

  if (currentUser) {
    const home = currentUser.role === 'admin' ? '/admin' : currentUser.role === 'dietitian' ? '/dietitian' : '/'
    return <Navigate to={home} replace />
  }

  return (
    <OnboardingShell
      image="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1600&q=80"
      kicker="Patient onboarding"
      headline="Eat right for your condition, effortlessly."
      support="Tell us a little about you. We’ll match you with verified dietitians and keep your health snapshot ready for care."
      step={step}
      stepCount={STEPS}
    >
      {step === 1 && (
        <div className="space-y-5">
          <h1 className="font-display text-3xl font-extrabold text-ink">Welcome. Let’s set up your care.</h1>
          <ul className="space-y-3 text-sm text-ink">
            <li className="rounded-lg bg-white p-4 ring-1 ring-line">1. Create your patient workspace</li>
            <li className="rounded-lg bg-white p-4 ring-1 ring-line">2. Share the condition you want help with</li>
            <li className="rounded-lg bg-white p-4 ring-1 ring-line">3. Find a verified dietitian and start care</li>
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
          <h1 className="font-display text-3xl font-extrabold text-ink">About you</h1>
          <p className="text-sm text-muted">Your dietitian will see this on your chart.</p>
          <label className="block text-sm font-semibold text-ink">
            Full name
            <input className="hy-input mt-1" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="block text-sm font-semibold text-ink">
            Email
            <input className="hy-input mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
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
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (busy) return
            setBusy(true)
            void registerAccount({ name, email, phone, country, role: 'patient', condition, allergies, goal }).then((ok) => {
              setBusy(false)
              if (ok) navigate('/dietitians')
            })
          }}
        >
          <h1 className="font-display text-3xl font-extrabold text-ink">Your health snapshot</h1>
          <p className="text-sm text-muted">You can add more detail later in your profile.</p>
          <label className="block text-sm font-semibold text-ink">
            Main condition
            <select className="hy-input mt-1" value={condition} onChange={(event) => setCondition(event.target.value)}>
              <option value="">Choose one</option>
              {CONDITIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-ink">
            Allergies
            <input
              className="hy-input mt-1"
              value={allergies}
              onChange={(event) => setAllergies(event.target.value)}
              placeholder="Peanuts, shellfish"
            />
          </label>
          <label className="block text-sm font-semibold text-ink">
            What do you want help with?
            <input
              className="hy-input mt-1"
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="Steady blood sugar, easier meals, weight"
            />
          </label>
          <div className="flex gap-3">
            <Button className="flex-1" variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button className="flex-1" type="submit" disabled={busy}>
              {busy ? 'Creating workspace…' : 'Finish onboarding'}
            </Button>
          </div>
        </form>
      )}
    </OnboardingShell>
  )
}
