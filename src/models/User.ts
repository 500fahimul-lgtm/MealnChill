import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
  },
  messId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mess',
    default: null,
  },
  role: {
    type: String,
    enum: ['member', 'admin'],
    default: 'member',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
})

// Prevent re-compilation during development
const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User
