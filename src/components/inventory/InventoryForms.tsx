import { useState } from 'react'
import type { InventoryCategory } from '../../types'
import type { InventoryFormData, EditFormData } from '../../types/inventory'

interface AddItemFormProps {
  onSubmit: (data: InventoryFormData) => Promise<void>
  onCancel: () => void
}

export function AddItemForm({ onSubmit, onCancel }: AddItemFormProps) {
  const [form, setForm] = useState<InventoryFormData>({
    name: '',
    category: 'medicine',
    unit: '',
    quantity_on_hand: 0,
    reorder_level: 0,
    remarks: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
    setForm({
      name: '',
      category: 'medicine',
      unit: '',
      quantity_on_hand: 0,
      reorder_level: 0,
      remarks: ''
    })
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-800">Add inventory item</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Category</label>
              <select
                className="input-field"
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value as InventoryCategory }))}
              >
                <option value="medicine">Medicine</option>
                <option value="supply">Supply</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Unit</label>
              <input
                className="input-field"
                value={form.unit}
                onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="e.g. tablet, bottle"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Quantity on hand</label>
              <input
                type="number"
                className="input-field"
                value={form.quantity_on_hand}
                onChange={(e) => setForm(f => ({ ...f, quantity_on_hand: Number(e.target.value) || 0 }))}
                min={0}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Reorder level</label>
              <input
                type="number"
                className="input-field"
                value={form.reorder_level}
                onChange={(e) => setForm(f => ({ ...f, reorder_level: Number(e.target.value) || 0 }))}
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Remarks</label>
            <input
              className="input-field"
              value={form.remarks}
              onChange={(e) => setForm(f => ({ ...f, remarks: e.target.value }))}
              placeholder="Optional remarks"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save item
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface EditItemFormProps {
  initialData: EditFormData
  onSubmit: (data: EditFormData) => Promise<void>
  onCancel: () => void
}

export function EditItemForm({ initialData, onSubmit, onCancel }: EditItemFormProps) {
  const [form, setForm] = useState<EditFormData>(initialData)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-800">Edit stock levels</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Quantity on hand</label>
            <input
              type="number"
              className="input-field"
              value={form.quantity_on_hand}
              onChange={(e) => setForm(f => ({ ...f, quantity_on_hand: Number(e.target.value) || 0 }))}
              min={0}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Reorder level</label>
            <input
              type="number"
              className="input-field"
              value={form.reorder_level}
              onChange={(e) => setForm(f => ({ ...f, reorder_level: Number(e.target.value) || 0 }))}
              min={0}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Update stock
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
