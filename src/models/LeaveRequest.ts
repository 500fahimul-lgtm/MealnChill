import mongoose from 'mongoose'

const leaveRequestSchema = new mongoose.Schema({
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
  reason: {
    type: String,
    trim: true,
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  },
  reviewedAt: {
    type: Date,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  adminNote: {
    type: String,
    trim: true,
    maxlength: 500,
  },
}, {
  timestamps: true,
})

// Compound index to ensure one pending request per user per mess
leaveRequestSchema.index({ userId: 1, messId: 1, status: 1 }, { 
  unique: true,
  partialFilterExpression: { status: 'pending' }
})

// Prevent re-compilation during development
const LeaveRequest = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema)

export default LeaveRequest
