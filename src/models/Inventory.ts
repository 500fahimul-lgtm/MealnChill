import mongoose from 'mongoose'

const inventorySchema = new mongoose.Schema({
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: true,
  },
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
  },
  category: {
    type: String,
    enum: ['Fish', 'Chicken', 'Egg', 'Mutton', 'Vegetables', 'Rice', 'Spices', 'Oil', 'Other'],
    default: 'Other',
    trim: true,
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0, 'Quantity cannot be negative'],
    default: 0,
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true,
    lowercase: true,
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: [0, 'Low stock threshold cannot be negative'],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  updatedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
})

// Compound index to ensure unique item per mess
inventorySchema.index({ messId: 1, itemName: 1, unit: 1 }, { unique: true })

// Update lastUpdated on save
inventorySchema.pre('save', function(next) {
  this.lastUpdated = new Date()
  next()
})

// Prevent re-compilation during development
let Inventory: mongoose.Model<any>
try {
  Inventory = mongoose.model('Inventory')
} catch (error) {
  Inventory = mongoose.model('Inventory', inventorySchema)
}

export default Inventory
