import { CreditCard, Lock, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type MarketplaceUpgradeModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  message?: string
  fromPath?: string
}

export default function MarketplaceUpgradeModal({
  open,
  onOpenChange,
  title = 'Upgrade to have access to this',
  message = 'Marketplace access requires a Silver or Gold plan.',
  fromPath = '/dietitians',
}: MarketplaceUpgradeModalProps) {
  const navigate = useNavigate()

  const goUpgrade = () => {
    onOpenChange(false)
    navigate('/payment', {
      state: {
        from: fromPath,
        reason: 'marketplace_plan_required',
        message,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-ink">
            <Lock className="h-5 w-5 text-navy" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted">
            {message}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl border border-line bg-navy-soft/40 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles className="h-4 w-4 text-navy" />
            Silver and Gold unlock
          </p>
          <ul className="space-y-1 text-sm text-muted">
            <li>A verified marketplace dietitian</li>
            <li>Consultation and follow-up bookings</li>
            <li>Appointments, messages, and health files</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button type="button" className="w-full bg-navy text-white hover:bg-navy/90" onClick={goUpgrade}>
            <CreditCard className="mr-2 h-4 w-4" />
            Upgrade to have access
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
