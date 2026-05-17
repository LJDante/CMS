import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { InventoryItem } from '../types.ts'
import type { EndingInventoryItem, InventoryFormData, EditFormData } from '../types/inventory'
import { parseInventoryInteger } from '../utils/inventoryHelpers'
import toast from 'react-hot-toast'

function normalizeInventoryFormData(formData: InventoryFormData): InventoryFormData {
  return {
    ...formData,
    quantity_on_hand: parseInventoryInteger(formData.quantity_on_hand),
    reorder_level: parseInventoryInteger(formData.reorder_level),
  }
}

function normalizeEditFormData(updates: Partial<EditFormData>): Partial<EditFormData> {
  const normalized: Partial<EditFormData> = { ...updates }
  if (updates.quantity_on_hand !== undefined) {
    normalized.quantity_on_hand = parseInventoryInteger(updates.quantity_on_hand)
  }
  if (updates.reorder_level !== undefined) {
    normalized.reorder_level = parseInventoryInteger(updates.reorder_level)
  }
  return normalized
}

// Hook for managing inventory data
export function useInventoryData() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('name')

      if (error) throw error

      setItems(
        ((data ?? []) as InventoryItem[]).map((item) => ({
          ...item,
          quantity_on_hand: parseInventoryInteger(item.quantity_on_hand),
          reorder_level:
            item.reorder_level != null ? parseInventoryInteger(item.reorder_level) : item.reorder_level,
        }))
      )
    } catch (error) {
      toast.error('Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }

  const addItem = async (formData: InventoryFormData) => {
    console.log('addItem called with:', formData)
    try {
      // Check for duplicates
      console.log('Checking for duplicates...')
      const { data: existing } = await supabase
        .from('inventory')
        .select('id')
        .eq('name', formData.name)
        .eq('category', formData.category)
        .maybeSingle()

      console.log('Duplicate check result:', existing)

      if (existing) {
        throw new Error('An item with this name and category already exists.')
      }

      const payload = normalizeInventoryFormData(formData)
      console.log('Inserting new item...', payload)
      const { data, error } = await supabase
        .from('inventory')
        .insert(payload)
        .select()
        .single()

      console.log('Insert result:', { data, error })

      if (error) throw error

      const inserted = data as InventoryItem
      setItems(prev => [
        ...prev,
        {
          ...inserted,
          quantity_on_hand: parseInventoryInteger(inserted.quantity_on_hand),
          reorder_level:
            inserted.reorder_level != null
              ? parseInventoryInteger(inserted.reorder_level)
              : inserted.reorder_level,
        },
      ])
      toast.success('Item added')
    } catch (error) {
      console.error('addItem error:', error)
      throw error
    }
  }

  const updateItem = async (id: string, updates: Partial<EditFormData>) => {
    const payload = normalizeEditFormData(updates)
    const { error } = await supabase
      .from('inventory')
      .update(payload)
      .eq('id', id)

    if (error) throw error

    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, ...payload } : item
      )
    )
    toast.success('Item updated')
  }

  const deleteItem = async (id: string) => {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('id', id)

    if (error) throw error

    setItems(prev => prev.filter(item => item.id !== id))
    toast.success('Item deleted')
  }

  const deleteItems = async (ids: string[]) => {
    if (ids.length === 0) return

    const { error } = await supabase
      .from('inventory')
      .delete()
      .in('id', ids)

    if (error) throw error

    setItems(prev => prev.filter(item => !ids.includes(item.id)))
  }

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    deleteItems,
    refresh: loadInventory
  }
}

// Hook for ending inventory management
export function useEndingInventory(items: InventoryItem[]) {
  const [endingItems, setEndingItems] = useState<EndingInventoryItem[]>([])

  useEffect(() => {
    setEndingItems(
      items.map(item => ({
        quantity: item.quantity_on_hand,
        description: item.name,
        remarks: item.remarks || ''
      }))
    )
  }, [items])

  const updateItem = (index: number, field: keyof EndingInventoryItem, value: string | number) => {
    setEndingItems(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    )
  }

  const addItem = () => {
    setEndingItems(prev => [...prev, { quantity: 0, description: '', remarks: '' }])
  }

  const deleteItem = (index: number) => {
    setEndingItems(prev => prev.filter((_, i) => i !== index))
  }

  return {
    endingItems,
    updateItem,
    addItem,
    deleteItem
  }
}