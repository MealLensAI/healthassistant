import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Logo } from '@/components/CareLogo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useApp } from '@/lib/care/context'
import { DEMO_ACCOUNTS, USERS } from '@/lib/care/data/mock'
import { apiEnabled } from '@/lib/care/api'

export function LoginPage() {
  const { currentUser, users, dietitians, login } = useApp()
  const accounts = useMemo(() => {
    const known = new Set<string>(USERS.map((item) => item.id))
    const extras = users
      .filter((user) => (user.role === 'dietitian' || user.role === 'patient') && !known.has(user.id))
      .map((user) => {
        if (user.role === 'patient') {
          return {
            userId: user.id,
            label: 'Patient',
            detail: `${user.name} — new patient workspace`,
          }
        }
        const listing = dietitians.find((item) => item.userId === user.id)
        const status = listing?.status ?? 'pending'
        return {
          userId: user.id,
          label: status === 'approved' ? 'Dietitian' : 'Applicant',
          detail: `${user.name} — ${status.replaceAll('_', ' ')} verification`,
        }
      })
    return [...DEMO_ACCOUNTS, ...extras]
  }, [users, dietitians])

  if (currentUser) {
    const home = currentUser.role === 'admin' ? '/admin' : currentUser.role === 'dietitian' ? '/dietitian' : '/'
    return <Navigate to={home} replace />
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1600&q=80"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0E3E77]/92 via-[#0E3E77]/72 to-[#082A54]/88" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <Logo inverse className="h-12" />
          <p className="font-display mt-8 max-w-xl text-[44px] font-extrabold leading-[1.1] text-white">
            Eat right for your condition, effortlessly.
          </p>
          <p className="mt-4 max-w-md text-base text-white/88">
            Connect with verified dietitians. Get meals you can actually cook — for the life you already have.
          </p>
        </div>
      </section>
      <section className="relative flex items-center justify-center bg-cream px-4 py-10 sm:px-6 sm:py-12">
        <ThemeToggle className="absolute right-4 top-4 sm:right-6 sm:top-6" />
        <div className="w-full max-w-md">
          <Logo className="h-12" />
          <h1 className="font-display mt-8 text-3xl font-extrabold text-ink">Welcome to MealLensAI</h1>
          <p className="mt-2 text-sm text-muted">
            {apiEnabled()
              ? 'Choose a workspace, or start onboarding. New specialists stay hidden until admin approves their documents.'
              : 'Choose a workspace. Scan the directory, book a consult, or review credentials — this demo stays on your device.'}
          </p>
          <div className="mt-8 space-y-3">
            {accounts.map((account) => {
              const user = users.find((item) => item.id === account.userId)
              if (!user) return null
              return (
                <button
                  key={account.userId}
                  onClick={() => login(account.userId)}
                  className="flex w-full items-center gap-4 rounded-lg border border-line bg-white p-4 text-left transition-colors hover:border-navy hover:bg-navy-soft"
                  data-testid={`login-${account.userId}`}
                >
                  <img src={user.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">{account.label}</span>
                    <span className="block text-xs text-muted">{account.detail}</span>
                  </span>
                  <ArrowRight size={16} className="text-navy" />
                </button>
              )
            })}
          </div>
          <div className="mt-8 flex items-center gap-2 rounded-lg bg-leaf-soft px-4 py-3 text-xs text-leaf-deep">
            <ShieldCheck size={16} />
            Credential checks, messaging, files, and video consults are available in this demo.
          </div>
          <Link
            to="/onboarding/patient"
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-navy px-4 py-3 text-sm font-semibold text-white hover:bg-navy-deep"
          >
            Join as a patient
          </Link>
          <Link
            to="/onboarding/doctor"
            className="mt-3 flex w-full items-center justify-center rounded-lg border border-navy bg-white px-4 py-3 text-sm font-semibold text-navy hover:bg-navy-soft"
          >
            Join as a dietitian
          </Link>
        </div>
      </section>
    </div>
  )
}
