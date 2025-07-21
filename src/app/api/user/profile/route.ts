import connectDB from '@/lib/mongodb'
import Deposit from '@/models/Deposit'
import MealAttendance from '@/models/MealAttendance'
import Mess from '@/models/Mess'
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

    // Find user with mess details
    const user = await User.findById(userId)

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
        // Check if user is admin using the isAdmin field from user model
        isAdmin = user.isAdmin || false
        
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

    return NextResponse.json(
      { user: userData },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get user profile error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
