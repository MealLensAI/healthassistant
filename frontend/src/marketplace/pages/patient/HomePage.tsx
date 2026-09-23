import { LayoutGrid, List } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DietitianCard, DietitianRow } from '../../components/dietitians/Cards'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context'
import { CONDITIONS, COUNTRIES, SPECIALTIES } from '../../data/mock'
import { filterDietitians } from '../../lib/domain'
import { cn } from '../../lib/utils'

type DirectoryView = 'list' | 'cards'

export function HomePage() {
  const { dietitians } = useApp()
  const [params, setParams] = useSearchParams()
  const [view, setView] = useState<DirectoryView>('cards')

  const query = params.get('q') ?? ''
  const country = params.get('country') ?? 'all'
  const specialty = params.get('specialty') ?? 'all'
  const condition = params.get('condition') ?? 'all'

  const filters = useMemo(
    () => ({ query, country, specialty, condition }),
    [query, country, specialty, condition],
  )
  const results = useMemo(() => filterDietitians(dietitians, filters), [dietitians, filters])

  function update(key: string, value: string) {
    const next = new URLSearchParams(params)
    const paramKey = key === 'query' ? 'q' : key
    if (!value || value === 'all') next.delete(paramKey)
    else next.set(paramKey, value)
    setParams(next, { replace: true })
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg bg-white shadow-card">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="hy-eyebrow">Food for you</p>
            <h1 className="font-display mt-3 max-w-xl text-3xl font-extrabold leading-[1.15] text-ink sm:text-4xl lg:text-[2.75rem]">
              Eat right for your condition, effortlessly.
            </h1>
            <p className="mt-3 max-w-lg text-base text-muted">
              Find a verified dietitian, book a time, and get meals that fit diabetes, IBS, and the ingredients you already have.
            </p>
            <form
              className="mt-6 flex h-12 max-w-xl items-center rounded-md border border-line bg-white pr-1"
              onSubmit={(event) => {
                event.preventDefault()
                document.getElementById('find-dietitians')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              <input
                value={query}
                onChange={(event) => update('query', event.target.value)}
                className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 text-sm text-ink outline-none placeholder:text-muted"
                placeholder="Search dietitian, country, or condition"
                aria-label="Search dietitians"
              />
              <Button type="submit" className="h-10 w-10 shrink-0 !p-0" aria-label="Search">
                →
              </Button>
            </form>
          </div>
          <div className="relative min-h-56">
            <img
              src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=80"
              alt="Fresh salad"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-[#0E3E77]/35 to-transparent" />
          </div>
        </div>
      </section>

      <section id="find-dietitians" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Find a dietitian</h2>
            <p className="text-sm text-muted">
              {results.length} verified specialist{results.length === 1 ? '' : 's'} ready for care.
            </p>
          </div>
          <div className="flex rounded-lg border border-line bg-white p-1" role="tablist" aria-label="Directory view">
            {(
              [
                ['list', 'List', List],
                ['cards', 'Cards', LayoutGrid],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                onClick={() => setView(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold',
                  view === key ? 'bg-[#0E3E77] text-white' : 'text-muted hover:text-ink',
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="hy-card grid gap-3 p-4 md:grid-cols-3">
          <select
            className="hy-input"
            value={country}
            onChange={(event) => update('country', event.target.value)}
            aria-label="Country"
          >
            <option value="all">All countries</option>
            {COUNTRIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            className="hy-input"
            value={specialty}
            onChange={(event) => update('specialty', event.target.value)}
            aria-label="Specialty"
          >
            <option value="all">All specialties</option>
            {SPECIALTIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            className="hy-input"
            value={condition}
            onChange={(event) => update('condition', event.target.value)}
            aria-label="Condition"
          >
            <option value="all">All conditions</option>
            {CONDITIONS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        {results.length === 0 ? (
          <div className="hy-card p-10 text-center text-sm text-muted">
            No dietitians match those filters.
            <div className="mt-3">
              <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                Clear filters
              </Button>
            </div>
          </div>
        ) : view === 'list' ? (
          <div className="space-y-3">
            {results.map((dietitian) => (
              <DietitianRow key={dietitian.id} dietitian={dietitian} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {results.slice(0, 5).map((dietitian) => (
              <DietitianCard key={dietitian.id} dietitian={dietitian} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
