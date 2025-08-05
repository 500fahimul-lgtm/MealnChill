import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      console.log(`[MongoDB] Using existing connection (state: ${mongoose.connections[0].readyState})`)
      return true
    }

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined')
    }

    console.log(`[MongoDB] Attempting connection...`)
    const startTime = Date.now()
    
    const { connection } = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      socketTimeoutMS: 45000, // 45 second socket timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain a minimum of 2 socket connections
    })

    const duration = Date.now() - startTime
    console.log(`[MongoDB] Connected successfully in ${duration}ms (state: ${connection.readyState})`)

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
