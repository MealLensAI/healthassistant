import { useState } from 'react'
import { SPECIALTIES } from '@/lib/care/data/mock'
import { Button } from '@/components/care-ui/Button'

export function SpecialtyPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (specialties: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const suggestions = SPECIALTIES.filter(
    (item) => !value.some((specialty) => specialty.toLowerCase() === item.toLowerCase()),
  )

  function add(raw: string) {
    const next = raw.trim()
    if (!next) return
    if (value.some((item) => item.toLowerCase() === next.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...value, next])
    setDraft('')
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {value.map((item) => (
          <button
            key={item}
            type="button"
            aria-label={`Remove ${item}`}
            onClick={() => onChange(value.filter((specialty) => specialty !== item))}
            className="rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-white"
          >
            {item} ×
          </button>
        ))}
        {value.length === 0 && <p className="text-sm text-muted">No specialties yet. Add your own or pick a suggestion.</p>}
      </div>
      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          add(draft)
        }}
      >
        <input
          className="hy-input"
          aria-label="Add a specialty"
          placeholder="Add your own specialty"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button type="submit">Add specialty</Button>
      </form>
      {suggestions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-muted">Suggestions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => add(item)}
                className="rounded-full bg-navy-soft px-3 py-1.5 text-xs font-semibold text-navy"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
