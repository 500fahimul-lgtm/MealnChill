import mongoose from 'mongoose'

const memberSettlementSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    required: true,
  },
  billingCycleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingCycle',
    required: true,
  },
  totalDepositsForCycle: {
    type: Number,
    required: true,
    default: 0,
  },
  totalMealsConsumedForCycle: {
    type: Number,
    required: true,
    default: 0,
  },
  calculatedIndividualMealCost: {
    type: Number,
    required: true,
    default: 0,
  },
  finalBalance: {
    type: Number,
    required: true,
    default: 0, // Positive = refund due, Negative = amount due
  },
  status: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded', 'pending_refund'],
    default: 'unpaid',
  },
  settledAt: {
    type: Date,
    required: false,
  },
  settledByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
}, {
  timestamps: true,
})

// Compound index to ensure unique settlement per user per billing cycle
memberSettlementSchema.index({ userId: 1, billingCycleId: 1 }, { unique: true })
memberSettlementSchema.index({ messId: 1, billingCycleId: 1, status: 1 })

// Prevent re-compilation during development
let MemberSettlement: mongoose.Model<any>
try {
  MemberSettlement = mongoose.model('MemberSettlement')
} catch (error) {
  MemberSettlement = mongoose.model('MemberSettlement', memberSettlementSchema)
}

export default MemberSettlement
