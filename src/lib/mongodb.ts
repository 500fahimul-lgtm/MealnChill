import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return true
    }

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined')
    }

    const { connection } = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain a minimum of 2 socket connections
    })

    if (connection.readyState === 1) {
      return true
    } else {
      throw new Error('Failed to connect to MongoDB')
    }
  } catch (error) {
    console.error(`[MongoDB] Connection failed:`, error)
    throw error
  }
}

export default connectDB
