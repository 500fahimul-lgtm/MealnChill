import mongoose from 'mongoose'

const expenseSchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative'],
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  enteredByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  billingCycleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingCycle',
    required: false, // Will be set when cycle is finalized
  },
}, {
  timestamps: true,
})

// Index for efficient querying
expenseSchema.index({ messId: 1, date: -1 })
expenseSchema.index({ messId: 1, billingCycleId: 1 })

// Prevent re-compilation during development
let Expense: mongoose.Model<any>
try {
  Expense = mongoose.model('Expense')
} catch (error) {
  Expense = mongoose.model('Expense', expenseSchema)
}

export default Expense
