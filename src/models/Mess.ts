import mongoose from 'mongoose'

const messSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Mess name is required'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: '',
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true,
  },
  messCode: {
    type: String,
    unique: true,
    uppercase: true,
  },
  mealFrequency: {
    type: Number,
    required: true,
    enum: [2, 3], // 2 meals (Lunch, Dinner) or 3 meals (Breakfast, Lunch, Dinner)
    default: 2,
  },
  mealDeadlines: {
    breakfast: {
      type: String,
      default: '10:00',
      validate: {
        validator: function(v: string) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)
        },
        message: 'Breakfast deadline must be in HH:MM format'
      }
    },
    lunch: {
      type: String,
      default: '14:00',
      validate: {
        validator: function(v: string) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)
        },
        message: 'Lunch deadline must be in HH:MM format'
      }
    },
    dinner: {
      type: String,
      default: '20:00',
      validate: {
        validator: function(v: string) {
          return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v)
        },
        message: 'Dinner deadline must be in HH:MM format'
      }
    }
  },
  adminIsActive: {
    type: Boolean,
    default: true, // Whether admin also eats meals from the mess
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  }],
  currentCycle: {
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  totalDepositedAmountCurrentCycle: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
})

// Generate unique mess code before saving
messSchema.pre('save', async function(next) {
  if (!this.messCode) {
    let code: string
    let isUnique = false
    
    while (!isUnique) {
      // Generate a 6-character alphanumeric code
      code = Math.random().toString(36).substring(2, 8).toUpperCase()
      
      // Check if this code already exists
      const existingMess = await this.constructor.findOne({ messCode: code })
      if (!existingMess) {
        isUnique = true
      }
    }
    
    this.messCode = code!
  }
  next()
})

// Prevent re-compilation during development
let Mess: mongoose.Model<any>
try {
  Mess = mongoose.model('Mess')
} catch (error) {
  Mess = mongoose.model('Mess', messSchema)
}

export default Mess
