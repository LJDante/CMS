import { Search, Plus, AlertCircle, Edit2, Trash2 } from 'lucide-react'
import type { InventoryItem, InventoryCategory } from '../../types'
import type { EditFormData } from '../../types/inventory'

interface InventoryTableProps {
  items: InventoryItem[]
  onEdit: (item: InventoryItem) => void
  onDelete: (id: string) => void
  selectedIds: Set<string>
  onToggleItem: (id: string) => void
  allVisibleSelected: boolean
  onToggleAll: () => void
}

export function InventoryTable({ items, onEdit, onDelete, selectedIds, onToggleItem, allVisibleSelected, onToggleAll }: InventoryTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 font-medium">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={onToggleAll}
                className="h-4 w-4 text-blue-600"
              />
            </th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">On hand</th>
            <th className="px-4 py-3 font-medium">Unit</th>
            <th className="px-4 py-3 font-medium">Reorder level</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isSelected = selectedIds.has(item.id)
            return (
              <tr
                key={item.id}
                className={`border-b border-slate-100 ${isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleItem(item.id)}
                    className="h-4 w-4 text-blue-600"
                  />
                </td>
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3 capitalize">{item.category}</td>
                <td className="px-4 py-3">
                  {item.quantity_on_hand}
                  {item.reorder_level && item.quantity_on_hand <= item.reorder_level && (
                    <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Low stock
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{item.unit}</td>
                <td className="px-4 py-3">{item.reorder_level ?? '—'}</td>
                <td className="px-4 py-3 flex gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="text-blue-600 hover:text-blue-700 transition-colors"
                    title="Edit stock"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(item.id)}
                    className="text-red-600 hover:text-red-700 transition-colors"
                    title="Delete item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {items.length === 0 && (
        <p className="py-10 text-center text-slate-500">No inventory items found.</p>
      )}
    </div>
  )
}

interface LowStockAlertProps {
  count: number
  showOnly: boolean
  onToggle: () => void
}

export function LowStockAlert({ count, showOnly, onToggle }: LowStockAlertProps) {
  if (count === 0) return null

  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-amber-900">
              {count} {count === 1 ? 'item' : 'items'} low in stock
            </h3>
            <p className="mt-1 text-sm text-amber-800">
              {count === 1
                ? 'This item has reached or fallen below its reorder level.'
                : 'These items have reached or fallen below their reorder levels.'}
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className={`whitespace-nowrap rounded px-3 py-1 text-sm font-medium transition-colors ${
            showOnly
              ? 'bg-amber-600 text-white'
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }`}
        >
          {showOnly ? 'Show All' : 'View Low Stock'}
        </button>
      </div>
    </div>
  )
}

interface SearchAndFilterProps {
  search: string
  onSearchChange: (value: string) => void
  category: InventoryCategory | 'all'
  onCategoryChange: (value: InventoryCategory | 'all') => void
}

export function SearchAndFilter({ search, onSearchChange, category, onCategoryChange }: SearchAndFilterProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input-field pl-10"
          placeholder="Search by item name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <select
        className="input-field w-auto"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value as InventoryCategory | 'all')}
      >
        <option value="all">All categories</option>
        <option value="medicine">Medicines</option>
        <option value="supply">Supplies</option>
        <option value="equipment">Equipment</option>
      </select>
    </div>
  )
}
