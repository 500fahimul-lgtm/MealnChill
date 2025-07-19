import InventoryRecord from '@/models/InventoryRecord'
import User from '@/models/User'

interface LogInventoryChangeParams {
  messId: string
  inventoryItemId: string
  itemName: string
  action: 'ADD' | 'UPDATE' | 'REMOVE' | 'DEDUCT'
  previousQuantity: number
  newQuantity: number
  unit: string
  category?: string
  reason?: string
  performedBy: string
}

export async function logInventoryChange({
  messId,
  inventoryItemId,
  itemName,
  action,
  previousQuantity,
  newQuantity,
  unit,
  category,
  reason,
  performedBy
}: LogInventoryChangeParams) {
  try {
    // Get user name
    const user = await User.findById(performedBy).select('name').lean()
    const performedByName = (user as any)?.name || 'Unknown User'

    // Calculate quantity changed
    const quantityChanged = newQuantity - previousQuantity

    const record = new InventoryRecord({
      messId,
      inventoryItemId,
      itemName,
      action,
      previousQuantity,
      newQuantity,
      quantityChanged,
      unit,
      category: category || 'Other',
      reason,
      performedBy,
      performedByName,
      timestamp: new Date()
    })

    await record.save()
    return record
  } catch (error) {
    // Don't throw error to prevent main operation failure
    return null
  }
}
