import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { InventoryItem } from '../types.ts'
import type { EndingInventoryItem, InventoryFormData, EditFormData } from '../types/inventory'
import toast from 'react-hot-toast'

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

      setItems((data ?? []) as InventoryItem[])
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

      console.log('Inserting new item...')
      const { data, error } = await supabase
        .from('inventory')
        .insert(formData)
        .select()
        .single()

      console.log('Insert result:', { data, error })

      if (error) throw error

      setItems(prev => [...prev, data as InventoryItem])
      toast.success('Item added')
    } catch (error) {
      console.error('addItem error:', error)
      throw error
    }
  }

  const updateItem = async (id: string, updates: Partial<EditFormData>) => {
    const { error } = await supabase
      .from('inventory')
      .update(updates)
      .eq('id', id)

    if (error) throw error

    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, ...updates } : item
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