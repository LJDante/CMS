// Types for ending inventory management
export interface EndingInventoryItem {
  quantity: number
  description: string
  remarks: string
}

export interface InventoryFormData {
  name: string
  category: InventoryCategory
  unit: string
  quantity_on_hand: number
  reorder_level: number
  remarks: string
}

export interface EditFormData {
  quantity_on_hand: number
  reorder_level: number
}