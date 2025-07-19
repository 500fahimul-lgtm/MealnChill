import mongoose from 'mongoose'

const mealAttendanceSchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true,
  },
  mealSlot: {
    type: String,
    required: true,
    enum: ['breakfast', 'lunch', 'dinner'],
  },
  isMealOn: {
    type: Boolean,
    default: true, // Default to "Meal On"
  },
  extraMealCount: {
    type: Number,
    default: 0, // Number of extra meals (0 means no extra meals)
    min: 0,
    max: 10 // Reasonable limit
  },
}, {
  timestamps: true,
})

// Compound index to ensure unique attendance per user, date, and meal slot
mealAttendanceSchema.index({ userId: 1, messId: 1, date: 1, mealSlot: 1 }, { unique: true })

// Prevent re-compilation during development
let MealAttendance: mongoose.Model<any>
try {
  MealAttendance = mongoose.model('MealAttendance')
} catch (error) {
  MealAttendance = mongoose.model('MealAttendance', mealAttendanceSchema)
}

export default MealAttendance
