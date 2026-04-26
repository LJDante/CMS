import { Plus, Trash2 } from 'lucide-react'
import type { EndingInventoryItem } from '../../types/inventory'

interface EndingInventoryTableProps {
  items: EndingInventoryItem[]
  onUpdate: (index: number, field: keyof EndingInventoryItem, value: string | number) => void
  onAdd: () => void
  onDelete: (index: number) => void
  signature?: string
  onSignatureChange?: (signature: string) => void
}

export function EndingInventoryTable({ items, onUpdate, onAdd, onDelete, signature, onSignatureChange }: EndingInventoryTableProps) {
  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium">Quantity</th>
              <th className="px-4 py-3 font-medium">Description/S</th>
              <th className="px-4 py-3 font-medium">Remarks</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b border-slate-100">
                <td className="px-4 py-3">
                  <input
                    type="number"
                    className="input-field w-full"
                    value={item.quantity}
                    onChange={(e) => onUpdate(index, 'quantity', Number(e.target.value) || 0)}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    className="input-field w-full"
                    value={item.description}
                    onChange={(e) => onUpdate(index, 'description', e.target.value)}
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    className="input-field w-full"
                    value={item.remarks}
                    onChange={(e) => onUpdate(index, 'remarks', e.target.value)}
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => onDelete(index)}
                    className="text-red-600 hover:text-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <p className="py-10 text-center text-slate-500">No ending inventory items.</p>
        )}
      </div>

      <div className="mt-6 p-4 border border-slate-200 rounded-xl bg-white">
        <button className="btn-secondary flex items-center gap-2" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {/* E-Signature Section */}
      <div className="mt-6 p-6 border border-slate-200 rounded-xl bg-white">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">E-Signature</h3>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Electronic Signature
          </label>
          <input
            type="text"
            className="input-field w-full"
            placeholder="Type your full name as electronic signature"
            value={signature || ''}
            onChange={(e) => onSignatureChange?.(e.target.value)}
          />
          <p className="text-xs text-slate-500 mt-1">
            By typing your name, you certify that the information above is accurate and complete.
          </p>
        </div>
      </div>
    </>
  )
}
