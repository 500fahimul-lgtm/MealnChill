import mongoose from 'mongoose'

const billingCycleSchema = new mongoose.Schema({
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true, // e.g., "July 2025"
  },
  finalTotalExpenses: {
    type: Number,
    default: 0,
  },
  finalTotalMealsPrepared: {
    type: Number,
    default: 0,
  },
  finalCostPerMeal: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'finalized'],
    default: 'active',
  },
  finalizedAt: {
    type: Date,
    required: false,
  },
  finalizedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
}, {
  timestamps: true,
})

// Index for efficient querying
billingCycleSchema.index({ messId: 1, status: 1, startDate: -1 })

// Prevent re-compilation during development
let BillingCycle: mongoose.Model<any>
try {
  BillingCycle = mongoose.model('BillingCycle')
} catch (error) {
  BillingCycle = mongoose.model('BillingCycle', billingCycleSchema)
}

export default BillingCycle
