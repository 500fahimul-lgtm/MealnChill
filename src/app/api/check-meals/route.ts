import connectDB from '@/lib/mongodb'
import MealRoutine from '@/models/MealRoutine'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    // Get token from Authorization header
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any
    const userId = decoded.userId

    // Get user and mess info
    const user = await User.findById(userId).populate('messId')
    if (!user || !user.messId) {
      return NextResponse.json(
        { message: 'User not found or not part of a mess' },
        { status: 404 }
      )
    }

    // Get all meal routines for the mess
    const routines = await MealRoutine.find({
      messId: user.messId._id,
      isActive: true
    }).sort({ date: -1 }).limit(10)

    // Get current time in Bangladesh timezone (GMT+6)
    const now = new Date()
    const bdTime = new Date(now.getTime() + (6 * 60 * 60 * 1000)) // Add 6 hours for BD
    const todayStr = bdTime.toISOString().split('T')[0]
    const normalizedToday = new Date(bdTime.getFullYear(), bdTime.getMonth(), bdTime.getDate())
    
    console.log('Check-meals date debug (BD timezone):', {
      serverTimeUTC: now.toISOString(),
      bdTime: bdTime.toISOString(),
      todayStr,
      normalizedToday: normalizedToday.toISOString(),
      normalizedTodayString: normalizedToday.toDateString()
    })

    // Get today's routines specifically
    const todaysRoutines = await MealRoutine.find({
      messId: user.messId._id,
      date: normalizedToday,
      isActive: true
    })

    return NextResponse.json({
      success: true,
      messId: user.messId._id.toString(),
      today: todayStr,
      normalizedToday: normalizedToday.toISOString(),
      totalRoutines: routines.length,
      recentRoutines: routines.map(r => ({
        id: r._id.toString(),
        date: r.date.toISOString().split('T')[0],
        mealSlot: r.mealSlot,
        mealName: r.mealName,
        isActive: r.isActive,
        isMealPrepared: r.isMealPrepared
      })),
      todaysRoutines: todaysRoutines.map(r => ({
        id: r._id.toString(),
        date: r.date.toISOString().split('T')[0],
        mealSlot: r.mealSlot,
        mealName: r.mealName,
        isActive: r.isActive,
        isMealPrepared: r.isMealPrepared
      })),
      instructions: "If no routines exist, go to Meal Routine section and add meal plans for today"
    })
  } catch (error) {
    console.error('Check meals error:', error)
    return NextResponse.json(
      { message: 'Internal server error', error: String(error) },
      { status: 500 }
    )
  }
}
