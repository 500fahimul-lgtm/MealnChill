import connectDB from '@/lib/mongodb'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  console.log(`[DBTest] Database test started at ${new Date().toISOString()}`)
  
  try {
    console.log(`[DBTest] Attempting MongoDB connection...`)
    const connectStart = Date.now()
    
    await connectDB()
    
    const connectDuration = Date.now() - connectStart
    console.log(`[DBTest] MongoDB connected successfully in ${connectDuration}ms`)
    
    // Try a simple database operation
    const mongoose = require('mongoose')
    const dbState = mongoose.connections[0].readyState
    const dbName = mongoose.connections[0].name
    
    console.log(`[DBTest] Database state: ${dbState}, DB name: ${dbName}`)
    
    const result = {
      status: 'success',
      timestamp: new Date().toISOString(),
      connection: {
        state: dbState,
        stateText: dbState === 1 ? 'Connected' : dbState === 0 ? 'Disconnected' : 'Connecting',
        database: dbName,
        host: mongoose.connections[0].host
      },
      timings: {
        connectionTime: connectDuration,
        totalTime: Date.now() - startTime
      }
    }
    
    console.log(`[DBTest] Database test completed successfully in ${result.timings.totalTime}ms`)
    
    return NextResponse.json(result)
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[DBTest] Database test failed after ${duration}ms:`, error)
    
    let errorDetails = 'Unknown error'
    if (error instanceof Error) {
      errorDetails = error.message
      console.error(`[DBTest] Error details:`, {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 300)
      })
    }
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: errorDetails,
      duration
    }, { status: 500 })
  }
}
