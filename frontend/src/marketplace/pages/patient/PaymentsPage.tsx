import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Section, TextField } from '../../components/ui/Form'
import { Modal } from '../../components/ui/Primitives'
import { useApp } from '../../context'
import { formatDate, formatMoney } from '../../lib/utils'

export function PaymentsPage() {
  const { currentUser, payments, paymentQuotes, paymentMethods, payQuote, addPaymentMethod } = useApp()
  const [payingQuote, setPayingQuote] = useState<string | null>(null)
  const [addingCard, setAddingCard] = useState(false)
  const [card, setCard] = useState({ brand: 'Visa', last4: '', exp: '' })

  if (!currentUser) return null

  const minePayments = payments.filter((item) => item.patientId === currentUser.id)
  const mineQuotes = paymentQuotes.filter((item) => item.patientId === currentUser.id)
  const methods = paymentMethods.filter((item) => item.patientId === currentUser.id)
  const paidTotal = minePayments.reduce((sum, item) => sum + item.amount, 0)
  const dueQuotes = mineQuotes.filter((item) => item.status === 'open')
  const dueTotal = dueQuotes.reduce((sum, item) => sum + item.amount, 0)
  const defaultMethod = methods.find((item) => item.isDefault) ?? methods[0]

  const rows = useMemo(
    () => [
      ...dueQuotes.map((quote) => ({
        id: quote.id,
        kind: 'due' as const,
        description: quote.title,
        date: '',
        amount: quote.amount,
        currency: quote.currency,
      })),
      ...minePayments.map((payment) => ({
        id: payment.id,
        kind: 'paid' as const,
        description: payment.description,
        date: payment.paidAt,
        amount: payment.amount,
        currency: payment.currency,
      })),
    ],
    [dueQuotes, minePayments],
  )

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <p className="hy-eyebrow">Billing</p>
        <h1 className="text-2xl font-extrabold text-ink">Payments</h1>
        <p className="mt-1 text-sm text-muted">
          You pay MealLensAI for care on the platform. Specialists are not paid directly from this page.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="hy-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Paid so far</p>
          <p className="mt-2 text-3xl font-extrabold text-[#0E3E77]" data-testid="total-paid">
            {formatMoney(paidTotal)}
          </p>
          <p className="mt-1 text-xs text-muted">
            {minePayments.length} paid invoice{minePayments.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="hy-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Amount due</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">{formatMoney(dueTotal)}</p>
          <p className="mt-1 text-xs text-muted">
            {dueQuotes.length} open invoice{dueQuotes.length === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <Section title="Saved payment methods" description="Cards, wallets, or an HSA where supported. Charges go to MealLensAI.">
        <div className="space-y-2">
          {methods.map((method) => (
            <div key={method.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-ink">
                  {method.label}
                  {method.last4 ? ` ···· ${method.last4}` : ''}
                </p>
                <p className="text-xs capitalize text-muted">
                  {method.kind}
                  {method.expiry ? ` · Exp ${method.expiry}` : ''}
                  {method.isDefault ? ' · Default' : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
        <Button className="mt-4" variant="outline" onClick={() => setAddingCard(true)}>
          Add payment method
        </Button>
      </Section>

      <Section title="Invoices & receipts" description="Platform invoices billed by MealLensAI. You are not paying the specialist directly.">
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium">{row.description}</td>
                  <td className="px-4 py-3 text-muted">{row.date ? formatDate(row.date) : 'Due now'}</td>
                  <td className="px-4 py-3 font-semibold">{formatMoney(row.amount, row.currency)}</td>
                  <td className="px-4 py-3 capitalize">{row.kind === 'due' ? 'due' : 'paid'}</td>
                  <td className="px-4 py-3 text-right">
                    {row.kind === 'due' ? (
                      <Button size="sm" onClick={() => setPayingQuote(row.id)}>
                        Pay {formatMoney(row.amount, row.currency)}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted">Receipt</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Modal open={Boolean(payingQuote)} title="Pay invoice" onClose={() => setPayingQuote(null)}>
        <p className="text-sm text-muted">
          Charge {defaultMethod ? `${defaultMethod.label}${defaultMethod.last4 ? ` ···· ${defaultMethod.last4}` : ''}` : 'your saved method'} to
          MealLensAI for this invoice.
        </p>
        <Button
          className="mt-4 w-full"
          onClick={() => {
            if (payingQuote && defaultMethod) payQuote(payingQuote, defaultMethod.id)
            setPayingQuote(null)
          }}
        >
          Confirm payment
        </Button>
      </Modal>

      <Modal open={addingCard} title="Add payment method" onClose={() => setAddingCard(false)}>
        <div className="grid gap-3">
          <TextField label="Brand" value={card.brand} onChange={(event) => setCard({ ...card, brand: event.target.value })} />
          <TextField
            label="Last 4 digits"
            maxLength={4}
            value={card.last4}
            onChange={(event) => setCard({ ...card, last4: event.target.value.replace(/\D/g, '').slice(0, 4) })}
          />
          <TextField label="Expiry" placeholder="MM/YY" value={card.exp} onChange={(event) => setCard({ ...card, exp: event.target.value })} />
          <Button
            onClick={() => {
              if (card.last4.length !== 4) return
              addPaymentMethod({
                label: card.brand,
                kind: 'card',
                last4: card.last4,
                expiry: card.exp,
                isDefault: methods.length === 0,
              })
              setAddingCard(false)
              setCard({ brand: 'Visa', last4: '', exp: '' })
            }}
          >
            Save card
          </Button>
        </div>
      </Modal>
    </div>
  )
}
