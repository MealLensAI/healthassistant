import { Link } from 'react-router-dom'
import { Avatar, Pill, Stars } from '../../components/ui/Primitives'
import { useApp } from '../../context'

export function AdminDietitiansPage() {
  const { dietitians } = useApp()
  const approved = dietitians.filter((item) => item.status === 'approved')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Approved Dietitians</h1>
        <p className="text-sm text-muted">Live profiles currently visible in patient discovery. Open a photo to see the full record and files.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {approved.map((dietitian) => (
          <article key={dietitian.id} className="hy-card flex flex-col gap-4 p-4 sm:flex-row">
            <Avatar src={dietitian.avatar} name={dietitian.name} size={72} to={`/admin/dietitians/${dietitian.id}`} />
            <div className="min-w-0">
              <Link to={`/admin/dietitians/${dietitian.id}`} className="font-bold text-ink hover:text-navy">
                {dietitian.name}
              </Link>
              <p className="text-sm text-muted">
                {dietitian.country} · {dietitian.title}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {dietitian.specialties.slice(0, 3).map((item) => (
                  <Pill key={item}>{item}</Pill>
                ))}
              </div>
              <div className="mt-2 text-xs">
                <Stars value={dietitian.rating} />
              </div>
              <Link to={`/admin/dietitians/${dietitian.id}`} className="mt-2 inline-block text-sm font-semibold text-navy">
                View record and files
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
