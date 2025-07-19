import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return true
    }

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined')
    }

    const { connection } = await mongoose.connect(process.env.MONGODB_URI)

    if (connection.readyState === 1) {
      return true
    } else {
      throw new Error('Failed to connect to MongoDB')
    }
  } catch (error) {
    throw error
  }
}

export default connectDB
