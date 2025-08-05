import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  console.log(`[Health] Health check started at ${new Date().toISOString()}`)
  
  try {
    // Basic environment check
    const hasMongoUri = !!process.env.MONGODB_URI
    const hasJwtSecret = !!process.env.JWT_SECRET
    const nodeEnv = process.env.NODE_ENV || 'unknown'
    
    console.log(`[Health] Environment check - MongoDB: ${hasMongoUri}, JWT: ${hasJwtSecret}, Node: ${nodeEnv}`)
    
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: nodeEnv,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      config: {
        hasMongoUri,
        hasJwtSecret,
        mongoUriPrefix: process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'missing'
      },
      duration: Date.now() - startTime
    }
    
    console.log(`[Health] Health check completed successfully in ${healthData.duration}ms`)
    
    return NextResponse.json(healthData)
  } catch (error) {
    console.error(`[Health] Health check failed:`, error)
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime
    }, { status: 500 })
  }
}
