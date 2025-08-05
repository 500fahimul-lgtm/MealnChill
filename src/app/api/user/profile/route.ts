import connectDB from '@/lib/mongodb'
import Deposit from '@/models/Deposit'
import MealAttendance from '@/models/MealAttendance'
import Mess from '@/models/Mess'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const startTime = Date.now()
  console.log(`[UserProfile] GET request started at ${new Date().toISOString()}`)
  
  try {
    // Enhanced connection with timeout
    console.log(`[UserProfile] Attempting database connection...`)
    const connectStart = Date.now()
    await connectDB()
    console.log(`[UserProfile] Database connected in ${Date.now() - connectStart}ms`)

    // Get token from Authorization header
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.log(`[UserProfile] No token provided`)
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      )
    }

    // Verify token with enhanced error handling
    let decoded: any
    try {
      console.log(`[UserProfile] Verifying JWT token...`)
      decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any
      console.log(`[UserProfile] Token verified for user: ${decoded.userId}`)
    } catch (jwtError) {
      console.error(`[UserProfile] JWT verification failed:`, jwtError)
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 401 }
      )
    }
    
    const userId = decoded.userId

    // Find user with mess details
    console.log(`[UserProfile] Finding user: ${userId}`)
    const userStart = Date.now()
    const user = await User.findById(userId).maxTimeMS(5000)
    console.log(`[UserProfile] User query completed in ${Date.now() - userStart}ms`)

    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    let messData = null
    let isAdmin = false
    let isMember = false

    if (user.messId) {
      const mess = await Mess.findById(user.messId)
      if (mess) {
        // Check if user is admin (support both single and multiple admin fields)
        if (mess.adminId && mess.adminId.toString() === userId) {
          isAdmin = true;
        }
        if (Array.isArray(mess.adminIds) && mess.adminIds.some((id: any) => id.toString() === userId)) {
          isAdmin = true;
        }
        
        // Check if user is an active member (in the members array)
        isMember = mess.members.some((member: any) =>
          member.userId.toString() === userId && member.isActive
        )

        messData = {
          id: mess._id,
          name: mess.name,
          messCode: mess.messCode,
          mealFrequency: mess.mealFrequency,
          adminIsActive: mess.adminIsActive,
          isAdmin,
          isMember
        }
      }
    }

    // Calculate total meals taken and total money paid
    let totalMealsTaken = 0
    let totalMoneyPaid = 0

    if (user.messId) {
      // Calculate total meals taken (count records where isMealOn: true + extraMealCount)
      const mealAttendanceRecords = await MealAttendance.find({
        userId: userId,
        messId: user.messId,
        isMealOn: true
      })

      totalMealsTaken = mealAttendanceRecords.reduce((total, record) => {
        return total + 1 + (record.extraMealCount || 0) // 1 for the main meal + extra meals
      }, 0)

      // Calculate total money paid (sum of approved deposits)
      const approvedDeposits = await Deposit.find({
        userId: userId,
        messId: user.messId,
        status: 'approved'
      })

      totalMoneyPaid = approvedDeposits.reduce((total, deposit) => {
        return total + deposit.amount
      }, 0)
    }

    // Prepare user data
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      isAdmin,
      isMember,
      role: user.role,
      totalMealsTaken,
      totalMoneyPaid,
      messName: messData?.name || '',
      messCode: messData?.messCode || '',
      joinedAt: user.joinedAt || user.createdAt,
      messId: user.messId,
      mess: messData
    }

    console.log(`[UserProfile] Successfully processed user data in ${Date.now() - startTime}ms`)
    return NextResponse.json(
      { user: userData },
      { status: 200 }
    )
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[UserProfile] Error after ${duration}ms:`, error)
    
    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error(`[UserProfile] Error name: ${error.name}`)
      console.error(`[UserProfile] Error message: ${error.message}`)
      console.error(`[UserProfile] Error stack: ${error.stack?.substring(0, 500)}`)
    }
    
    // Check for specific MongoDB errors
    let errorMessage = 'Internal server error'
    let statusCode = 500
    
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        errorMessage = 'Database operation timed out - server may be overloaded'
        console.error(`[UserProfile] Database timeout detected`)
      } else if (error.message.includes('connection') || error.message.includes('CONNECTION')) {
        errorMessage = 'Database connection failed - please try again'
        console.error(`[UserProfile] Database connection error detected`)
      } else if (error.message.includes('JWT') || error.message.includes('token')) {
        errorMessage = 'Authentication error'
        statusCode = 401
        console.error(`[UserProfile] JWT/Token error detected`)
      }
    }
    
    return NextResponse.json(
      { 
        message: errorMessage,
        debug: process.env.NODE_ENV === 'development' ? {
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        } : undefined
      },
      { status: statusCode }
    )
  }
}
