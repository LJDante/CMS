import React from 'react'
import { AlertTriangle, Settings2 } from 'lucide-react'
import { format } from 'date-fns'
import type { InventoryItem } from '../../types'

interface ExpiryWarningBannerProps {
  expiringItems: InventoryItem[]
  warningDays: number
  showExpiringOnly: boolean
  onToggleExpiringOnly: () => void
  onOpenSettings: () => void
}

export function ExpiryWarningBanner({
  expiringItems,
  warningDays,
  showExpiringOnly,
  onToggleExpiringOnly,
  onOpenSettings,
}: ExpiryWarningBannerProps) {
  if (expiringItems.length === 0) return null

  return (
    <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 items-start gap-3">
          <span className="text-xl" aria-hidden>
            ⚠️
          </span>
          <div className="min-w-0">
            <h3 className="font-semibold text-amber-950">
              {expiringItems.length} item{expiringItems.length !== 1 ? 's' : ''} expiring within {warningDays} day
              {warningDays !== 1 ? 's' : ''}. Please review your inventory.
            </h3>
            <ul className="mt-3 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-amber-900">
              {expiringItems.map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.name}</span>
                  {item.expiration_date ? (
                    <span className="text-amber-800"> — expires {format(new Date(item.expiration_date + 'T12:00:00'), 'MMM d, yyyy')}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-medium text-amber-900 shadow-sm hover:bg-amber-100"
          >
            <Settings2 className="h-4 w-4" />
            Expiry settings
          </button>
          <button
            type="button"
            onClick={onToggleExpiringOnly}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              showExpiringOnly ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900 hover:bg-amber-300'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            {showExpiringOnly ? 'Show all items' : 'View expiring only'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ExpirySettingsModalProps {
  open: boolean
  initialDays: number
  saving: boolean
  onClose: () => void
  onSave: (days: number) => Promise<void>
}

export function ExpirySettingsModal({ open, initialDays, saving, onClose, onSave }: ExpirySettingsModalProps) {
  const [input, setInput] = React.useState(String(initialDays))

  React.useEffect(() => {
    if (open) setInput(String(initialDays))
  }, [open, initialDays])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = parseInt(input, 10)
    if (Number.isNaN(n) || n < 0) return
    await onSave(Math.min(3650, n))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8" onClick={() => !saving && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-slate-900">Expiry notification</h2>
        <p className="mt-1 text-sm text-slate-600">All clinic roles can change this threshold. It applies to everyone.</p>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Notify me when items expire within</span>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={3650}
                className="input-field w-28"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={saving}
              />
              <span className="text-sm text-slate-600">days</span>
            </div>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
