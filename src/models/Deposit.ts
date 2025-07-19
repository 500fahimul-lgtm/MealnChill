import mongoose from 'mongoose'

const depositSchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be positive'],
  },
  note: {
    type: String,
    trim: true,
    default: '',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
  },
  rejectionReason: {
    type: String,
    trim: true,
    default: '',
  },
  date: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
})

// Index for efficient querying
depositSchema.index({ messId: 1, status: 1, createdAt: -1 })
depositSchema.index({ userId: 1, messId: 1, createdAt: -1 })

// Prevent re-compilation during development
let Deposit: mongoose.Model<any>
try {
  Deposit = mongoose.model('Deposit')
} catch (error) {
  Deposit = mongoose.model('Deposit', depositSchema)
}

export default Deposit
