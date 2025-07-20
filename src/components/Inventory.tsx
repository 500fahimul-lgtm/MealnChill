'use client'

import {
  Add,
  Category,
  CheckCircle,
  Close,
  Delete,
  Edit,
  History,
  HourglassTop,
  Info,
  Inventory2,
  Person,
  Save,
  Scale,
  Schedule,
  TrendingDown,
  TrendingUp,
  Warning
} from '@mui/icons-material'
import { useEffect, useState } from 'react'

interface InventoryItem {
  _id: string
  itemName: string
  category: string
  quantity: number
  unit: string
  lowStockThreshold: number
  lastUpdated: string
  updatedByUserId: string
}

interface InventoryRecord {
  _id: string
  itemName: string
  action: 'ADD' | 'UPDATE' | 'REMOVE' | 'DEDUCT'
  previousQuantity: number
  newQuantity: number
  quantityChanged: number
  unit: string
  category: string
  reason?: string
  performedByName: string
  timestamp: string
}

interface InventoryProps {
  messId: string
  isAdmin: boolean
}

export default function Inventory({ messId, isAdmin }: InventoryProps) {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddStock, setShowAddStock] = useState(false)
  const [showEditStock, setShowEditStock] = useState(false)
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showRecords, setShowRecords] = useState(false)
  const [records, setRecords] = useState<InventoryRecord[]>([])
  const [recordsLoading, setRecordsLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [restockQuantity, setRestockQuantity] = useState('')
  const [stockForm, setStockForm] = useState({
    itemName: '',
    category: 'Other',
    quantity: '',
    unit: 'kg',
    lowStockThreshold: '10'
  })
  const [editForm, setEditForm] = useState({
    id: '',
    itemName: '',
    quantity: '',
    unit: '',
    category: '',
    lowStockThreshold: '10',
    originalQuantity: 0
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')

  const commonUnits = ['kg', 'pieces', 'liters', 'grams', 'bottles', 'packets']
  const categoryOptions = ['', 'Fish', 'Chicken', 'Egg', 'Mutton', 'Vegetables', 'Rice', 'Spices', 'Oil', 'Other']
  const categories = ['Fish', 'Chicken', 'Egg', 'Mutton', 'Vegetables', 'Rice', 'Spices', 'Oil', 'Other']

  const fetchInventory = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setItems(data.inventory || [])
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchRecords = async () => {
    setRecordsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/inventory/records', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRecords(data.records || [])
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setRecordsLoading(false)
    }
  }

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stockForm.itemName.trim() || !stockForm.quantity || parseFloat(stockForm.quantity) < 0) return

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemName: stockForm.itemName.trim(),
          quantity: parseFloat(stockForm.quantity),
          unit: stockForm.unit.trim(),
          category: stockForm.category || undefined,
          lowStockThreshold: parseFloat(stockForm.lowStockThreshold) || 10
        })
      })

      if (response.ok) {
        setMessage('Stock updated successfully')
        setStockForm({ itemName: '', quantity: '', unit: 'kg', category: 'Other', lowStockThreshold: '10' })
        setShowAddStock(false)
        await fetchInventory()
      } else {
        const error = await response.json()
        setMessage(error.message || 'Failed to update stock')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEditItem = (item: InventoryItem) => {
    setEditForm({
      id: item._id,
      itemName: item.itemName,
      quantity: item.quantity.toString(),
      unit: item.unit,
      category: item.category,
      lowStockThreshold: item.lowStockThreshold.toString(),
      originalQuantity: item.quantity
    })
    setShowEditStock(true)
  }

  const handleRestockItem = (item: InventoryItem) => {
    setSelectedItem(item)
    setRestockQuantity('')
    setShowRestockModal(true)
  }

  const handleDeleteItem = (item: InventoryItem) => {
    setSelectedItem(item)
    setShowDeleteModal(true)
  }

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || !restockQuantity) return

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemName: selectedItem.itemName,
          quantity: parseFloat(restockQuantity),
          unit: selectedItem.unit,
          category: selectedItem.category
        })
      })

      if (response.ok) {
        const result = await response.json()
        setMessage(`Successfully restocked ${restockQuantity} ${selectedItem.unit} of ${selectedItem.itemName}!`)
        setRestockQuantity('')
        setSelectedItem(null)
        setShowRestockModal(false)
        await fetchInventory()
      } else {
        const error = await response.json()
        setMessage(error.message || 'Failed to restock item')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/inventory?id=${selectedItem._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      })

      if (response.ok) {
        const result = await response.json()
        setMessage(`Successfully deleted ${selectedItem.itemName} from inventory!`)
        setSelectedItem(null)
        setShowDeleteModal(false)
        await fetchInventory()
      } else {
        const error = await response.json()
        setMessage(error.message || 'Failed to delete item')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.quantity || parseFloat(editForm.quantity) < 0) return

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/inventory', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editForm.id,
          quantity: parseFloat(editForm.quantity),
          lowStockThreshold: parseFloat(editForm.lowStockThreshold) || 10
        })
      })

      if (response.ok) {
        setMessage('Inventory updated successfully')
        setEditForm({
          id: '',
          itemName: '',
          quantity: '',
          unit: '',
          category: '',
          lowStockThreshold: '10',
          originalQuantity: 0
        })
        setShowEditStock(false)
        await fetchInventory()
      } else {
        const error = await response.json()
        setMessage(error.message || 'Failed to update inventory')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStockStatusColor = (quantity: number, threshold: number) => {
    if (quantity <= threshold) return 'text-red-600 bg-red-50'
    if (quantity <= threshold * 2) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const getStockStatusIcon = (quantity: number, threshold: number) => {
    if (quantity <= threshold) return <Warning className="text-red-600" />
    return <CheckCircle className="text-green-600" />
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded-lg mb-6"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
          <Inventory2 className="mr-3 text-primary-600" />
          Inventory Management
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              setShowRecords(true)
              fetchRecords()
            }}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center font-medium"
          >
            <History className="mr-2" />
            Records
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowAddStock(true)}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center font-medium"
            >
              <Add className="mr-2" />
              Add/Update Stock
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-300 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-blue-800 font-medium flex items-center">
              <Info className="mr-2 text-blue-600" />
              {message}
            </p>
            <button
              onClick={() => setMessage('')}
              className="text-blue-600 hover:text-blue-800 text-xl ml-4"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Inventory Items */}
      {items.length === 0 ? (
        <div className="text-center py-16">
          <Inventory2 className="text-gray-300 mx-auto mb-6" style={{ fontSize: '6rem' }} />
          <h4 className="text-2xl font-bold text-gray-700 mb-3">No inventory items yet</h4>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {isAdmin ? 'Start managing your inventory by adding your first item. Track quantities and get low stock alerts.' : 'No items in stock currently. Contact your admin for updates.'}
          </p>
          {isAdmin && (
            <button
              onClick={() => setShowAddStock(true)}
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              <Add className="mr-2" />
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {items.map((item) => (
            <div 
              key={item._id} 
              className={`relative border-2 rounded-xl p-4 sm:p-6 transition-all duration-200 hover:shadow-lg group ${getStockStatusColor(item.quantity, item.lowStockThreshold)} border-current backdrop-blur-sm`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg sm:text-xl leading-tight">{item.itemName}</h4>
                  {isAdmin && (
                    <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        <Edit className="mr-1" style={{ fontSize: '0.75rem' }} />
                        Admin Actions
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-3xl opacity-80">
                  {getStockStatusIcon(item.quantity, item.lowStockThreshold)}
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-3xl sm:text-4xl font-bold text-gray-900">
                  {item.quantity} 
                  <span className="text-lg sm:text-xl font-normal text-gray-600 ml-1">{item.unit}</span>
                </div>
                {item.category && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Category className="mr-1" style={{ fontSize: '0.875rem' }} /> {item.category}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-xs sm:text-sm text-gray-600 space-y-1 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Schedule className="mr-2 text-gray-500" style={{ fontSize: '1rem' }} />
                    Last updated: {new Date(item.lastUpdated).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Admin Action Buttons */}
              {isAdmin && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditItem(item)
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center justify-center transition-colors"
                      title="Edit item details"
                    >
                      <Edit className="mr-1" style={{ fontSize: '0.75rem' }} />
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRestockItem(item)
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center justify-center transition-colors"
                      title="Add more stock"
                    >
                      <Add className="mr-1" style={{ fontSize: '0.75rem' }} />
                      Restock
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteItem(item)
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded-lg text-xs font-medium flex items-center justify-center transition-colors"
                      title="Delete this item"
                    >
                      <Delete className="mr-1" style={{ fontSize: '0.75rem' }} />
                      Delete
                    </button>
                  </div>
                </div>
              )}

              {item.quantity <= item.lowStockThreshold && (
                <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-xs sm:text-sm text-red-800">
                  <div className="flex items-center">
                    <Warning className="mr-2 text-red-600" />
                    <div>
                      <strong>Low Stock Alert!</strong>
                      <div className="text-red-600 mt-1">Stock is at or below {item.lowStockThreshold} {item.unit}. Consider restocking soon.</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Update Stock Modal */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <Inventory2 className="mr-3 text-primary-600" />
                Add/Update Stock
              </h4>
              <button
                onClick={() => {
                  setShowAddStock(false)
                  setStockForm({ itemName: '', quantity: '', unit: 'kg', category: 'Other', lowStockThreshold: '10' })
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                <Close className="text-gray-400 hover:text-gray-600 cursor-pointer" />
              </button>
            </div>
            
            <form onSubmit={handleAddStock} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={stockForm.itemName}
                  onChange={(e) => setStockForm(prev => ({ ...prev, itemName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  placeholder="e.g., Rice, Chicken, Cooking Oil"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <Info className="mr-1 text-gray-400" style={{ fontSize: '0.875rem' }} />
                  If item exists, quantity will be added to current stock
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Quantity to Add *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  placeholder="Enter quantity"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Unit of Measurement *
                </label>
                <select
                  value={stockForm.unit}
                  onChange={(e) => setStockForm(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                  required
                >
                  {commonUnits.map(unit => (
                    <option key={unit} value={unit} className="text-gray-900">{unit}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <Scale className="mr-1 text-gray-400" style={{ fontSize: '0.875rem' }} />
                  Choose the unit that matches your item (e.g., kg for rice, pieces for eggs)
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Category (Optional)
                </label>
                <select
                  value={stockForm.category}
                  onChange={(e) => setStockForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                >
                  {categoryOptions.map(category => (
                    <option key={category} value={category} className="text-gray-900">{category}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <Category className="mr-1 text-gray-400" style={{ fontSize: '0.875rem' }} />
                  Helps organize and categorize your inventory items
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={stockForm.lowStockThreshold}
                  onChange={(e) => setStockForm(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  placeholder="10"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <Warning className="mr-1 text-gray-400" style={{ fontSize: '0.875rem' }} />
                  You'll get alerts when stock goes below this level
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStock(false)
                    setStockForm({ itemName: '', quantity: '', unit: 'kg', category: 'Other', lowStockThreshold: '10' })
                  }}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-medium flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <HourglassTop className="mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2" />
                      Update Stock
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
          </div>
        )}

      {/* Edit Stock Modal */}
      {showEditStock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <Inventory2 className="mr-3 text-blue-600" />
                Edit {editForm.itemName}
              </h4>
              <button
                onClick={() => {
                  setShowEditStock(false)
                  setEditForm({
                    id: '',
                    itemName: '',
                    quantity: '',
                    unit: '',
                    category: '',
                    lowStockThreshold: '10',
                    originalQuantity: 0
                  })
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                <Close />
              </button>
            </div>
            
            <form onSubmit={handleUpdateStock} className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Info className="mr-2 text-blue-600" />
                  <span className="font-bold text-blue-800">Current Stock Information</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                  <div>
                    <span className="font-medium">Item:</span> {editForm.itemName}
                  </div>
                  <div>
                    <span className="font-medium">Unit:</span> {editForm.unit}
                  </div>
                  <div>
                    <span className="font-medium">Category:</span> {editForm.category}
                  </div>
                  <div>
                    <span className="font-medium">Current Quantity:</span> {editForm.originalQuantity} {editForm.unit}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  New Quantity *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Enter new quantity"
                  required
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <Info className="mr-1 text-gray-400" style={{ fontSize: '0.875rem' }} />
                  This will replace the current quantity completely
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editForm.lowStockThreshold}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lowStockThreshold: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Enter low stock threshold"
                />
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <Info className="mr-1 text-gray-400" style={{ fontSize: '0.875rem' }} />
                  You'll be alerted when stock falls below this threshold
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditStock(false)
                    setEditForm({
                      id: '',
                      itemName: '',
                      quantity: '',
                      unit: '',
                      category: '',
                      lowStockThreshold: '10',
                      originalQuantity: 0
                    })
                  }}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-medium flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <HourglassTop className="mr-2" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2" />
                      Update Stock
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Records Modal */}
      {showRecords && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h4 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <History className="mr-3 text-blue-600" />
                Inventory Records
              </h4>
              <button
                onClick={() => setShowRecords(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                <Close />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {recordsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-pulse space-y-4 w-full">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                    ))}
                  </div>
                </div>
              ) : records.length === 0 ? (
                <div className="text-center py-12">
                  <History className="text-gray-300 mx-auto mb-4" style={{ fontSize: '4rem' }} />
                  <h5 className="text-xl font-bold text-gray-700 mb-2">No Records Found</h5>
                  <p className="text-gray-500">No inventory changes have been recorded yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {records.map((record) => (
                    <div key={record._id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                              record.action === 'ADD' ? 'bg-green-100 text-green-800' :
                              record.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                              record.action === 'REMOVE' ? 'bg-red-100 text-red-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {record.action === 'ADD' && <TrendingUp className="inline mr-1" style={{ fontSize: '0.875rem' }} />}
                              {record.action === 'UPDATE' && <History className="inline mr-1" style={{ fontSize: '0.875rem' }} />}
                              {record.action === 'REMOVE' && <TrendingDown className="inline mr-1" style={{ fontSize: '0.875rem' }} />}
                              {record.action === 'DEDUCT' && <TrendingDown className="inline mr-1" style={{ fontSize: '0.875rem' }} />}
                              {record.action}
                            </div>
                            <h6 className="font-bold text-gray-900">{record.itemName}</h6>
                            {record.category && (
                              <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs">
                                {record.category}
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex items-center gap-4">
                              <span>
                                <strong>Change:</strong> {record.previousQuantity} → {record.newQuantity} {record.unit}
                              </span>
                              <span className={`font-medium ${
                                record.quantityChanged > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ({record.quantityChanged > 0 ? '+' : ''}{record.quantityChanged} {record.unit})
                              </span>
                            </div>
                            {record.reason && (
                              <div>
                                <strong>Reason:</strong> {record.reason}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <Person className="mr-1" style={{ fontSize: '0.875rem' }} />
                                {record.performedByName}
                              </span>
                              <span className="flex items-center">
                                <Schedule className="mr-1" style={{ fontSize: '0.875rem' }} />
                                {new Date(record.timestamp).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t p-4">
              <button
                onClick={() => setShowRecords(false)}
                className="w-full sm:w-auto px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <Add className="mr-3 text-green-600" />
                Restock {selectedItem.itemName}
              </h4>
              <button
                onClick={() => {
                  setShowRestockModal(false)
                  setSelectedItem(null)
                  setRestockQuantity('')
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                <Close />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-2">
                <Info className="mr-2 text-blue-600" />
                <span className="font-bold text-blue-800">Current Stock</span>
              </div>
              <div className="text-sm text-blue-700">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="font-medium">Item:</span> {selectedItem.itemName}</div>
                  <div><span className="font-medium">Current:</span> {selectedItem.quantity} {selectedItem.unit}</div>
                  <div><span className="font-medium">Unit:</span> {selectedItem.unit}</div>
                  <div><span className="font-medium">Category:</span> {selectedItem.category}</div>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleRestock} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Quantity to Add *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={restockQuantity}
                  onChange={(e) => setRestockQuantity(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder={`Enter ${selectedItem.unit} to add`}
                  required
                />
                {restockQuantity && (
                  <p className="text-sm text-green-600 mt-2 flex items-center">
                    <Info className="mr-1" style={{ fontSize: '0.875rem' }} />
                    New total will be: {selectedItem.quantity + parseFloat(restockQuantity || '0')} {selectedItem.unit}
                  </p>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h5 className="text-sm font-bold text-green-800 mb-2 flex items-center">
                  <Add className="mr-2 text-green-600" />
                  Restock Operation
                </h5>
                <p className="text-xs text-green-700">
                  This will add the specified quantity to your existing stock. The operation will be logged in inventory records for tracking.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRestockModal(false)
                    setSelectedItem(null)
                    setRestockQuantity('')
                  }}
                  className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !restockQuantity}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-medium flex items-center justify-center"
                >
                  {isProcessing ? (
                    <>
                      <HourglassTop className="mr-2" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Add className="mr-2" />
                      Add Stock
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
                <Delete className="mr-3 text-red-600" />
                Delete Item
              </h4>
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedItem(null)
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                <Close />
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-3">
                <Warning className="mr-2 text-red-600" />
                <span className="font-bold text-red-800">Confirm Deletion</span>
              </div>
              <p className="text-red-700 mb-4">
                Are you sure you want to delete this item from inventory? This action cannot be undone.
              </p>
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="font-medium">Item:</span> {selectedItem.itemName}</div>
                  <div><span className="font-medium">Stock:</span> {selectedItem.quantity} {selectedItem.unit}</div>
                  <div><span className="font-medium">Category:</span> {selectedItem.category}</div>
                  <div><span className="font-medium">Value Loss:</span> {selectedItem.quantity} {selectedItem.unit}</div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-xs text-yellow-700">
                <strong>Note:</strong> This deletion will be logged in inventory records for audit purposes.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedItem(null)
                }}
                className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isProcessing}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-medium flex items-center justify-center"
              >
                {isProcessing ? (
                  <>
                    <HourglassTop className="mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Delete className="mr-2" />
                    Delete Item
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}