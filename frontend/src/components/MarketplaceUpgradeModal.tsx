import { useNavigate } from 'react-router-dom'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

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
  title = 'Upgrade to use the marketplace',
  message = 'Silver and Gold include a verified dietitian, appointments, and messages.',
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
      <DialogContent
        className="w-[min(24rem,calc(100vw-2rem))] gap-0 border-[#d7d2c8] bg-[#fcfaf8] p-6 text-[#092649] shadow-xl sm:rounded-2xl dark:border-[#3a465c] dark:bg-[#1b2433] dark:text-[#eef3f8]"
      >
        <DialogTitle className="pr-6 text-left text-[1.25rem] font-semibold leading-7 tracking-normal text-[#092649] dark:text-[#eef3f8]">
          {title}
        </DialogTitle>
        <DialogDescription className="mt-2 text-left text-[15px] leading-6 tracking-normal text-[#546478] dark:text-[#c5d0de]">
          {message}
        </DialogDescription>
        <p className="mt-4 text-left text-sm leading-6 text-[#092649] dark:text-[#eef3f8]">
          Silver is $20 / month. Gold is $50 for 3 months.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={goUpgrade}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#0e3e77] px-4 text-[15px] font-semibold text-white hover:bg-[#082a54] dark:bg-[#d7e6f8] dark:text-[#0a1a30] dark:hover:bg-white"
          >
            See plans
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-[#cfc8bb] bg-transparent px-4 text-[15px] font-medium text-[#092649] hover:bg-[#f3eee6] dark:border-[#4b5870] dark:text-[#eef3f8] dark:hover:bg-[#243044]"
          >
            Not now
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
