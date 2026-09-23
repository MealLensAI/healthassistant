import { Link } from 'react-router-dom'
import type { Dietitian } from '../../types'
import { Button } from '../ui/Button'
import { Avatar, Pill, Stars } from '../ui/Primitives'

export function DietitianCard({ dietitian, className }: { dietitian: Dietitian; className?: string }) {
  return (
    <article className={`hy-card flex h-full flex-col p-4 ${className ?? ''}`} data-testid={`dietitian-card-${dietitian.id}`}>
      <div className="flex items-start gap-2.5">
        <Avatar src={dietitian.avatar} name={dietitian.name} size={44} to={`/dietitians/${dietitian.id}`} />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-ink">{dietitian.name}</h3>
          <p className="truncate text-[11px] font-medium text-navy">{dietitian.title}</p>
          <p className="truncate text-[11px] text-muted">{dietitian.country}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">{dietitian.bio}</p>
      <div className="mt-3 flex flex-wrap gap-1">
        {dietitian.specialties.slice(0, 2).map((item) => (
          <Pill key={item}>{item}</Pill>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-ink">
        <Stars value={dietitian.rating} size={12} />
        {dietitian.rating.toFixed(1)} ({dietitian.reviewCount})
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <Link to={`/care/${dietitian.id}?tab=book`}>
          <Button className="w-full" size="sm">Start consultation</Button>
        </Link>
        <Link to={`/dietitians/${dietitian.id}`} className="text-center text-xs font-semibold text-navy hover:underline">
          View full profile
        </Link>
      </div>
    </article>
  )
}

export function DietitianRow({ dietitian }: { dietitian: Dietitian }) {
  return (
    <article className="hy-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center" data-testid={`dietitian-row-${dietitian.id}`}>
      <Avatar src={dietitian.avatar} name={dietitian.name} size={64} to={`/dietitians/${dietitian.id}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-ink">{dietitian.name}</h3>
          {dietitian.verified && <span className="text-xs font-semibold text-navy">Verified</span>}
        </div>
        <p className="text-sm text-muted">
          {dietitian.title} · {dietitian.country}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {dietitian.specialties.map((item) => (
            <Pill key={item} tone="slate">
              {item}
            </Pill>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
          <Stars value={dietitian.rating} />
          {dietitian.rating.toFixed(1)} ({dietitian.reviewCount})
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:w-40">
        <Link to={`/care/${dietitian.id}?tab=book`}>
          <Button className="w-full">Start consultation</Button>
        </Link>
        <Link
          to={`/dietitians/${dietitian.id}`}
          className="rounded-xl border border-line py-2 text-center text-sm font-semibold text-navy hover:bg-navy-soft"
        >
          View profile
        </Link>
      </div>
    </article>
  )
}

