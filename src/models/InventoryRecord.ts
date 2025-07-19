import mongoose from 'mongoose'

const inventoryRecordSchema = new mongoose.Schema({
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: true,
  },
  inventoryItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: true,
  },
  itemName: {
    type: String,
    required: true,
    trim: true,
  },
  action: {
    type: String,
    enum: ['ADD', 'UPDATE', 'REMOVE', 'DEDUCT'],
    required: true,
  },
  previousQuantity: {
    type: Number,
    default: 0,
  },
  newQuantity: {
    type: Number,
    required: true,
  },
  quantityChanged: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    enum: ['Fish', 'Chicken', 'Egg', 'Mutton', 'Vegetables', 'Rice', 'Spices', 'Oil', 'Other'],
    default: 'Other',
  },
  reason: {
    type: String,
    trim: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  performedByName: {
    type: String,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
})

// Index for efficient queries
inventoryRecordSchema.index({ messId: 1, timestamp: -1 })
inventoryRecordSchema.index({ inventoryItemId: 1, timestamp: -1 })

// Prevent re-compilation during development
let InventoryRecord: mongoose.Model<any>
try {
  InventoryRecord = mongoose.model('InventoryRecord')
} catch (error) {
  InventoryRecord = mongoose.model('InventoryRecord', inventoryRecordSchema)
}

export default InventoryRecord
