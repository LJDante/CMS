import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { SupplyRequest, InventoryItem } from '../types'
import { format } from 'date-fns'
import { Plus, Eye, X, Minus, Plus as PlusIcon, Trash2, FileText } from 'lucide-react'
import { SUPPLY_REQUEST_STATUS_OPTIONS } from '../constants'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useSupplyRequests, type SupplyRequestWithItems } from '../hooks/useSupplyRequests'
import { useInventoryData } from '../hooks/useInventory'
import RequisitionFormEditor from '../components/RequisitionFormEditor'

export default function Requests() {
  const { profile } = useAuth()
  const { requests, loading, updateRequestStatus, createRequest, reload } = useSupplyRequests()
  const { items: inventoryItems, loading: inventoryLoading } = useInventoryData()
  const [showForm, setShowForm] = useState(false)
  const [notes, setNotes] = useState('')
  const [selectedItems, setSelectedItems] = useState<Array<{ inventory_id: string; quantity: number; inventory_item?: InventoryItem }>>([])
  const [updating, setUpdating] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState<Record<string, boolean>>({})
  const [showRequisitionEditor, setShowRequisitionEditor] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<SupplyRequestWithItems | null>(null)

  const handleStatusChange = async (requestId: string, newStatus: SupplyRequest['status']) => {
    try {
      setUpdating((s) => ({ ...s, [requestId]: true }))
      await updateRequestStatus(requestId, newStatus)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to update request status', err)
    } finally {
      setUpdating((s) => ({ ...s, [requestId]: false }))
    }
  }

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this supply request? This action cannot be undone.')) {
      return
    }

    try {
      setDeleting((s) => ({ ...s, [requestId]: true }))

      // Delete the request items first (cascade should handle this, but let's be explicit)
      const { error: itemsError } = await supabase
        .from('supply_request_items')
        .delete()
        .eq('request_id', requestId)

      if (itemsError) {
        console.error('Error deleting request items:', itemsError)
        throw itemsError
      }

      // Delete the request
      const { error: requestError } = await supabase
        .from('supply_requests')
        .delete()
        .eq('id', requestId)

      if (requestError) {
        console.error('Error deleting request:', requestError)
        throw requestError
      }

      // Update local state
      await reload()
      toast.success('Supply request deleted successfully')
    } catch (err) {
      console.error('Failed to delete request:', err)
      toast.error('Failed to delete supply request')
    } finally {
      setDeleting((s) => ({ ...s, [requestId]: false }))
    }
  }

  const handleGenerateRequisition = (request: SupplyRequestWithItems) => {
    setSelectedRequest(request)
    setShowRequisitionEditor(true)
  }

  const getDisplayNotes = (notes?: string | null) => {
    const text = notes?.trim() ?? ''
    if (!text) return '—'

    const match = text.match(/\bNotes:\s*([\s\S]*)$/i)
    if (match) {
      const extracted = match[1].trim()
      return extracted || '—'
    }

    return text
  }

  const formatRequestItems = (items?: SupplyRequestWithItems['items']) => {
    if (!items || items.length === 0) {
      return 'No items specified'
    }
    return items
      .map((item) => {
        const name = item.inventory_item?.name || 'Unknown item'
        const unit = item.inventory_item?.unit ? ` ${item.inventory_item.unit}` : ''
        return `${name} - ${item.quantity}${unit}`
      })
      .join(', ')
  }

  const addItem = (inventoryId: string) => {
    const item = inventoryItems.find(i => i.id === inventoryId)
    if (!item) return

    const existing = selectedItems.find(si => si.inventory_id === inventoryId)
    if (existing) {
      setSelectedItems(prev => prev.map(si =>
        si.inventory_id === inventoryId
          ? { ...si, quantity: si.quantity + 1 }
          : si
      ))
    } else {
      setSelectedItems(prev => [...prev, {
        inventory_id: inventoryId,
        quantity: 1,
        inventory_item: item
      }])
    }
  }

  const removeItem = (inventoryId: string) => {
    setSelectedItems(prev => prev.filter(si => si.inventory_id !== inventoryId))
  }

  const updateQuantity = (inventoryId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(inventoryId)
      return
    }
    setSelectedItems(prev => prev.map(si =>
      si.inventory_id === inventoryId
        ? { ...si, quantity }
        : si
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) {
      toast.error('You must be logged in to create a request')
      return
    }
    if (selectedItems.length === 0) {
      toast.error('Please select at least one item to request')
      return
    }
    try {
      const itemsToSubmit = selectedItems.map(item => ({
        inventory_id: item.inventory_id,
        quantity: item.quantity
      }))
      await createRequest(profile.id, itemsToSubmit, notes)
      setNotes('')
      setSelectedItems([])
      setShowForm(false)
    } catch (error) {
      // Error is handled in the hook
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Supply requests</h1>
        </div>
        <button 
          className="btn-primary flex items-center gap-2" 
          onClick={() => setShowForm(true)}
          disabled={!profile}
        >
          <Plus className="h-4 w-4" />
          New request
        </button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium">Requested at</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-gray-50">
                <td className="px-4 py-3">
                  {r.requested_at ? format(new Date(r.requested_at), 'PPp') : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-700">
                    {formatRequestItems((r as SupplyRequestWithItems).items)}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize">
                  {(profile?.role === 'clinic_staff' || profile?.role === 'clinic_nurse' || profile?.role === 'clinic_admin' || profile?.role === 'clinic_doctor') ? (
                    <select
                      className="input-field w-44"
                      value={r.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value as SupplyRequest['status']
                        await handleStatusChange(r.id, newStatus)
                      }}
                      disabled={!!updating[r.id]}
                    >
                      {SUPPLY_REQUEST_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    r.status
                  )}
                  {r.fulfilled_at && (
                    <div className="text-xs text-slate-500 mt-1">
                      Received: {format(new Date(r.fulfilled_at), 'PPp')}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">{getDisplayNotes(r.notes)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerateRequisition(r)}
                      className="btn-secondary text-sm px-3 py-1 flex items-center gap-1"
                      title="Generate Requisition Form"
                    >
                      <FileText className="h-4 w-4" />
                      Generate Form
                    </button>
                    {r.status === 'approved' && (profile?.role === 'clinic_staff' || profile?.role === 'clinic_nurse' || profile?.role === 'clinic_admin' || profile?.role === 'clinic_doctor') && (
                      <button
                        onClick={() => handleStatusChange(r.id, 'fulfilled')}
                        disabled={!!updating[r.id]}
                        className="btn-primary text-sm px-3 py-1"
                      >
                        {updating[r.id] ? 'Processing...' : 'Mark as Received'}
                      </button>
                    )}
                    {(r.status === 'pending' || r.status === 'approved') && (profile?.role === 'clinic_staff' || profile?.role === 'clinic_nurse' || profile?.role === 'clinic_admin' || profile?.role === 'clinic_doctor') && (
                      <button
                        onClick={() => handleDeleteRequest(r.id)}
                        disabled={!!deleting[r.id]}
                        className="btn-danger text-sm px-3 py-1 flex items-center gap-1"
                      >
                        {deleting[r.id] ? 'Deleting...' : <><Trash2 className="h-4 w-4" /> Delete</>}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && (
          <p className="py-10 text-center text-slate-500">No supply requests yet.</p>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">New Supply Request</h2>
            {!profile && (
              <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
                You must be logged in to create a request.
              </div>
            )}
            <form onSubmit={handleSubmit}>
              {/* Item Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Items to Request</label>
                <div className="mb-3">
                  <select
                    className="w-full p-2 border border-gray-300 rounded"
                    onChange={(e) => {
                      if (e.target.value) {
                        addItem(e.target.value)
                        e.target.value = ''
                      }
                    }}
                    disabled={inventoryLoading}
                  >
                    <option value="">Choose an item...</option>
                    {inventoryItems
                      .filter(item => !selectedItems.find(si => si.inventory_id === item.id))
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.category}) - {item.quantity_on_hand} {item.unit} available
                        </option>
                      ))}
                  </select>
                </div>

                {/* Selected Items */}
                {selectedItems.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Selected Items:</h3>
                    {selectedItems.map((item) => (
                      <div key={item.inventory_id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <span className="font-medium">{item.inventory_item?.name}</span>
                          <span className="text-sm text-gray-600 ml-2">
                            ({item.inventory_item?.category})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.inventory_id, item.quantity - 1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.inventory_id, parseInt(e.target.value) || 1)}
                            className="w-16 text-center p-1 border border-gray-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.inventory_id, item.quantity + 1)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.inventory_id)}
                            className="p-1 hover:bg-red-200 text-red-600 rounded"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Additional Notes (Optional)</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information or special instructions..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  onClick={() => {
                    setShowForm(false)
                    setSelectedItems([])
                    setNotes('')
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={selectedItems.length === 0}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRequisitionEditor && selectedRequest && (
        <RequisitionFormEditor
          request={selectedRequest}
          onClose={() => {
            setShowRequisitionEditor(false)
            setSelectedRequest(null)
          }}
        />
      )}
    </div>
  )
}

