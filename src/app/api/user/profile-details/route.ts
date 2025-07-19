import connectDB from '@/lib/mongodb'
import MealAttendance from '@/models/MealAttendance'
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

    // Get user with mess details
    const user = await User.findById(userId).populate('messId')
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate personal meal statistics
    const currentDate = new Date()
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    
    const personalAttendance = await MealAttendance.find({
      userId: userId,
      messId: user.messId,
      date: { $gte: startOfMonth }
    })

    const totalMealsTaken = personalAttendance.filter(a => a.isMealOn && (!a.extraMealCount || a.extraMealCount === 0)).length
    const extraMealsConsumed = personalAttendance.reduce((sum, a) => sum + (a.extraMealCount || 0), 0)

    // Calculate mess-wide statistics
    const messAttendance = await MealAttendance.find({
      messId: user.messId,
      date: { $gte: startOfMonth }
    })

    const totalMealsMade = messAttendance.filter(a => a.isMealOn).length + 
                          messAttendance.reduce((sum, a) => sum + (a.extraMealCount || 0), 0)

    const profile = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      messName: user.messId?.name || 'No mess assigned',
      personalStats: {
        totalMealsTaken,
        extraMealsConsumed
      },
      messStats: {
        totalMealsMade
      }
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Get profile details error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
