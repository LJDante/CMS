import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { SupplyRequest, SupplyRequestItem, InventoryItem } from '../types'
import toast from 'react-hot-toast'

export interface SupplyRequestWithItems extends SupplyRequest {
  items: (SupplyRequestItem & { inventory_item?: InventoryItem })[]
}

export function useSupplyRequests() {
  const [requests, setRequests] = useState<SupplyRequestWithItems[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('supply_requests')
        .select(`
          *,
          supply_request_items (
            *,
            inventory_item:inventory_id (
              id,
              name,
              category,
              unit
            )
          )
        `)
        .order('requested_at', { ascending: false })

      if (error) {
        console.error('Error loading supply requests:', error)
        throw error
      }

      const formattedRequests = (data ?? []).map(request => ({
        ...request,
        items: request.supply_request_items?.map((item: any) => ({
          ...item,
          inventory_item: item.inventory_item
        })) || []
      })) as SupplyRequestWithItems[]

      setRequests(formattedRequests)
    } catch (error) {
      console.error('Failed to load supply requests:', error)
      toast.error('Failed to load supply requests')
    } finally {
      setLoading(false)
    }
  }

  const updateRequestStatus = async (requestId: string, status: SupplyRequest['status']) => {
    console.log('updateRequestStatus called with:', { requestId, status })
    try {
      const updateData: any = { status }

      // If marking as fulfilled, set the fulfilled_at timestamp
      if (status === 'fulfilled') {
        updateData.fulfilled_at = new Date().toISOString()
        console.log('Setting fulfilled_at:', updateData.fulfilled_at)
      }

      console.log('Update data:', updateData)

      const { data, error } = await supabase
        .from('supply_requests')
        .update(updateData)
        .eq('id', requestId)
        .select()
        .single()

      console.log('Update result:', { data, error })

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      // If status is fulfilled, add items to inventory
      if (status === 'fulfilled') {
        console.log('Calling addItemsToInventory...')
        await addItemsToInventory(requestId)
      }

      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status, fulfilled_at: updateData.fulfilled_at } : r))
      toast.success(`Request ${status === 'fulfilled' ? 'marked as received' : `status updated to ${status}`}`)
    } catch (error) {
      console.error('updateRequestStatus error:', error)
      toast.error('Failed to update request status')
      throw error
    }
  }

  const addItemsToInventory = async (requestId: string) => {
    try {
      // Get the request items with current inventory quantities
      const { data: items, error } = await supabase
        .from('supply_request_items')
        .select(`
          inventory_id,
          quantity,
          inventory!inner (
            id,
            quantity_on_hand
          )
        `)
        .eq('request_id', requestId)

      if (error) {
        console.error('Error fetching request items:', error)
        throw error
      }

      // Update inventory quantities
      for (const item of items || []) {
        const currentQuantity = (item.inventory as any)?.quantity_on_hand || 0
        const newQuantity = currentQuantity + item.quantity

        const { error: updateError } = await supabase
          .from('inventory')
          .update({ quantity_on_hand: newQuantity })
          .eq('id', item.inventory_id)

        if (updateError) {
          console.error('Failed to update inventory for item:', item.inventory_id, updateError)
          // Continue with other items even if one fails
        }
      }

      toast.success(`Added ${items?.length || 0} items to inventory`)
    } catch (error) {
      console.error('Failed to add items to inventory:', error)
      toast.error('Failed to update inventory quantities')
    }
  }

  const createRequest = async (requestedBy: string, items: { inventory_id: string; quantity: number }[], notes?: string) => {
    try {
      console.log('Creating request with:', { requestedBy, items, notes })
      const { data: request, error: requestError } = await supabase
        .from('supply_requests')
        .insert({
          requested_by: requestedBy,
          notes
        })
        .select()
        .single()

      if (requestError) {
        console.error('Request creation error:', requestError)
        throw requestError
      }

      console.log('Request created:', request)

      // Add items to the request if provided
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          request_id: request.id,
          inventory_id: item.inventory_id,
          quantity: item.quantity
        }))

        const { error: itemsError } = await supabase
          .from('supply_request_items')
          .insert(itemsToInsert)

        if (itemsError) {
          console.error('Items creation error:', itemsError)
          // Don't throw here, request was created successfully
        }
      }

      await loadRequests() // Reload to get the new request with items
      toast.success('Supply request created')
    } catch (error) {
      console.error('Failed to create supply request:', error)
      toast.error('Failed to create supply request')
      throw error
    }
  }

  return {
    requests,
    loading,
    updateRequestStatus,
    createRequest,
    reload: loadRequests
  }
}