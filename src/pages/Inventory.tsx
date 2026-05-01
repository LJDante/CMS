import { useState, useMemo } from 'react'
import { Download, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import type { InventoryItem, InventoryCategory } from '../types'
import { useInventoryData, useEndingInventory } from '../hooks'
import { exportToWord } from '../utils/documentGenerator'
import { InventoryTable, LowStockAlert, SearchAndFilter, EndingInventoryTable, AddItemForm, EditItemForm } from '../components/inventory'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { format } from 'date-fns'

export default function Inventory() {
  const { items, loading, addItem: addInventoryItem, updateItem: updateInventoryItem, deleteItem: deleteInventoryItem, deleteItems: deleteInventoryItems } = useInventoryData()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<InventoryCategory | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [showLowStockOnly, setShowLowStockOnly] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [endingMode, setEndingMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const { endingItems, updateItem, addItem, deleteItem } = useEndingInventory(items)
  const [signature, setSignature] = useState('')

  // Computed values
  const lowStockItems = useMemo(() =>
    items.filter(item => item.reorder_level && item.quantity_on_hand <= item.reorder_level),
    [items]
  )

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = category === 'all' || item.category === category
      const matchesLowStock = !showLowStockOnly || (item.reorder_level && item.quantity_on_hand <= item.reorder_level)
      return matchesSearch && matchesCategory && matchesLowStock
    })
  }, [items, search, category, showLowStockOnly])

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.has(item.id)),
    [items, selectedIds]
  )

  const isAllVisibleSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.has(item.id))

  const toggleSelectRow = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (isAllVisibleSelected) {
        filteredItems.forEach(item => next.delete(item.id))
      } else {
        filteredItems.forEach(item => next.add(item.id))
      }
      return next
    })
  }

  const handleBulkDeleteConfirm = async () => {
    const idsToDelete = Array.from(selectedIds)
    if (idsToDelete.length === 0) return

    setBulkDeleting(true)
    try {
      await deleteInventoryItems(idsToDelete)
      setSelectedIds(new Set())
      setShowBulkDeleteModal(false)
      toast.success(`${idsToDelete.length} item${idsToDelete.length !== 1 ? 's' : ''} deleted successfully`)
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete selected items')
    } finally {
      setBulkDeleting(false)
    }
  }

  // Event handlers
  const handleAddItem = async (formData: any) => {
    try {
      await addInventoryItem(formData)
      setShowForm(false)
    } catch (error) {
      console.error('Failed to add item:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add item')
    }
  }

  const handleEditItem = (item: InventoryItem) => {
    setEditingId(item.id)
  }

  const handleUpdateItem = async (updates: any) => {
    if (!editingId) return
    try {
      await updateInventoryItem(editingId, updates)
      setEditingId(null)
    } catch (error) {
      toast.error('Failed to update item')
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      await deleteInventoryItem(id)
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch (error) {
      toast.error('Failed to delete item')
    }
  }

  const handleExport = async () => {
    try {
      await exportToWord(endingItems, signature)
      toast.success('Document exported successfully')
    } catch (error) {
      toast.error('Failed to export document')
    }
  }

  const formatTimestamp = (value: any) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2}$/.test(value)) {
      return format(new Date(value), 'MMMM d, yyyy h:mm a')
    }
    return value
  }

  const exportToExcel = () => {
    const data = items.map(i => {
      const obj = {
        'Name': i.name,
        'Category': i.category,
        'Unit': i.unit,
        'Quantity on Hand': i.quantity_on_hand,
        'Reorder Level': i.reorder_level || '',
        'Expiration Date': i.expiration_date || '',
        'Remarks': i.remarks || '',
        'Created At': i.created_at
      }
      return Object.fromEntries(Object.entries(obj).map(([k, val]) => [k, formatTimestamp(val)]))
    })

    const ws = XLSX.utils.json_to_sheet(data)

    // Format quantity columns as text to preserve leading zeros
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let row = 1; row <= range.e.r; row++) {
      // Quantity on Hand column (assuming it's column D, index 3)
      const qtyCell = ws[XLSX.utils.encode_cell({ r: row, c: 3 })]
      if (qtyCell && qtyCell.v !== undefined) {
        qtyCell.t = 's' // Force as string/text
        qtyCell.v = String(qtyCell.v)
      }

      // Reorder Level column (assuming it's column E, index 4)
      const reorderCell = ws[XLSX.utils.encode_cell({ r: row, c: 4 })]
      if (reorderCell && reorderCell.v !== undefined && reorderCell.v !== '') {
        reorderCell.t = 's' // Force as string/text
        reorderCell.v = String(reorderCell.v)
      }
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory')
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, 'inventory.xlsx')
    toast.success('Excel file exported successfully')
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading inventory...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {endingMode ? 'Ending Inventory Report' : 'Inventory'}
          </h1>
          <p className="mt-1 text-slate-500">
            {endingMode
              ? 'Manage and export the ending inventory for SY 2025-2026'
              : 'Track medicines, supplies, and equipment stored in the clinic.'
            }
          </p>
        </div>
        <div className="flex gap-2">
          {endingMode ? (
            <>
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => setEndingMode(false)}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Inventory
              </button>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                Export to Word
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={() => {
                  setShowForm(true)
                }}
              >
                <Plus className="h-4 w-4" />
                Add item
              </button>
              <button
                onClick={exportToExcel}
                className="inline-flex items-center gap-2 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export to Excel
              </button>
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => setEndingMode(true)}
              >
                Ending Inventory
              </button>
            </>
          )}
        </div>
      </div>

      {/* Low Stock Alert - only show in regular mode */}
      {!endingMode && (
        <LowStockAlert
          count={lowStockItems.length}
          showOnly={showLowStockOnly}
          onToggle={() => setShowLowStockOnly(!showLowStockOnly)}
        />
      )}

      {/* Search and Filter - only show in regular mode */}
      {!endingMode && (
        <div className="mt-6">
          <SearchAndFilter
            search={search}
            onSearchChange={setSearch}
            category={category}
            onCategoryChange={setCategory}
          />
        </div>
      )}

      {!endingMode && selectedIds.size > 0 && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">{selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected</p>
          <button
            type="button"
            onClick={() => setShowBulkDeleteModal(true)}
            disabled={bulkDeleting}
            className="inline-flex items-center justify-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:bg-red-300"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected ({selectedIds.size})
          </button>
        </div>
      )}

      {/* Tables */}
      <div className="mt-6">
        {endingMode ? (
          <EndingInventoryTable
            items={endingItems}
            onUpdate={updateItem}
            onAdd={addItem}
            onDelete={deleteItem}
            signature={signature}
            onSignatureChange={setSignature}
          />
        ) : (
          <InventoryTable
            items={filteredItems}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            selectedIds={selectedIds}
            onToggleItem={toggleSelectRow}
            allVisibleSelected={isAllVisibleSelected}
            onToggleAll={toggleSelectAll}
          />
        )}
      </div>

      {/* Forms */}
      {showForm && (
        <>
          <AddItemForm
            onSubmit={handleAddItem}
            onCancel={() => setShowForm(false)}
          />
        </>
      )}

      {editingId && (
        <EditItemForm
          initialData={{
            quantity_on_hand: items.find(i => i.id === editingId)?.quantity_on_hand || 0,
            reorder_level: items.find(i => i.id === editingId)?.reorder_level || 0
          }}
          onSubmit={handleUpdateItem}
          onCancel={() => setEditingId(null)}
        />
      )}

      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Confirm delete selected items</h2>
                <p className="mt-2 text-sm text-slate-600">
                  This action cannot be undone. Please confirm you want to delete the selected items.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Selected items ({selectedItems.length})</p>
              <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm text-slate-700">
                {selectedItems.map(item => (
                  <li key={item.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">{item.name}</li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowBulkDeleteModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirm}
                disabled={bulkDeleting}
                className="inline-flex items-center justify-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {bulkDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

