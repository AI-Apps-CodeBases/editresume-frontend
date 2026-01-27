interface BillingFunnelCardProps {
  counts?: Record<string, number>
}

const funnelRows = [
  { key: 'checkout_session_created', label: 'Checkout Created' },
  { key: 'checkout_session_completed', label: 'Checkout Completed' },
  { key: 'checkout_session_expired', label: 'Checkout Expired' },
  { key: 'checkout_return_cancel', label: 'Returned Cancel' },
  { key: 'checkout_return_success', label: 'Returned Success' },
  { key: 'payment_intent_payment_failed', label: 'Payment Failed' },
  { key: 'invoice_payment_failed', label: 'Invoice Failed' },
  { key: 'invoice_paid', label: 'Invoice Paid' },
]

export function BillingFunnelCard({ counts }: BillingFunnelCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Billing Funnel (30 days)</h3>
        <span className="text-xs text-gray-400">Live from billing_events</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {funnelRows.map((row) => (
          <div key={row.key} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="text-xs text-gray-500">{row.label}</div>
            <div className="text-2xl font-semibold text-gray-900">
              {counts?.[row.key] ?? 0}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
