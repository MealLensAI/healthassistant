import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/care/theme'
import { cn } from '@/lib/care/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'relative grid h-10 w-10 place-items-center rounded-full border border-line text-ink hover:bg-panel',
        className,
      )}
      aria-label={`Switch to ${next} view`}
      title={`Switch to ${next} view`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
