import mongoose from 'mongoose'

const mealRoutineSchema = new mongoose.Schema({
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
  mealName: {
    type: String,
    required: [true, 'Meal name is required'],
    trim: true,
  },
  // Meal description
  mealDescription: {
    type: String,
    trim: true,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isMealPrepared: {
    type: Boolean,
    default: false, // Default to false, admin needs to mark as prepared
  },
}, {
  timestamps: true,
})

// Compound index to ensure unique meal per date and slot for each mess
mealRoutineSchema.index({ messId: 1, date: 1, mealSlot: 1 }, { unique: true })

// Prevent re-compilation during development
let MealRoutine: mongoose.Model<any>
try {
  MealRoutine = mongoose.model('MealRoutine')
} catch (error) {
  MealRoutine = mongoose.model('MealRoutine', mealRoutineSchema)
}

export default MealRoutine
