import connectDB from '@/lib/mongodb'
import Deposit from '@/models/Deposit'
import MealAttendance from '@/models/MealAttendance'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

const verifyToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return decoded
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.messId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Get all members of the mess
    const members = await User.find({ messId: decoded.messId })
      .select('name email phone isAdmin joinedAt')
      .sort({ joinedAt: 1 })
      .lean()

    // Get additional stats for each member
    const membersWithStats = await Promise.all(
      members.map(async (member) => {
        // Get total meals taken since joining (all time)
        const totalMealsTaken = await MealAttendance.aggregate([
          {
            $match: {
              messId: decoded.messId,
              userId: member._id
            }
          },
          {
            $group: {
              _id: null,
              totalMeals: { $sum: { $add: ['$breakfast', '$lunch', '$dinner'] } }
            }
          }
        ])

        // Get total money paid till now (all approved deposits)
        const totalMoneyPaid = await Deposit.aggregate([
          {
            $match: {
              messId: decoded.messId,
              userId: member._id,
              status: 'approved'
            }
          },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' }
            }
          }
        ])

        return {
          id: (member._id as any).toString(),
          name: member.name,
          email: member.email,
          phone: member.phone,
          totalMealsTaken: totalMealsTaken[0]?.totalMeals || 0,
          totalMoneyPaid: totalMoneyPaid[0]?.totalAmount || 0,
          role: member.isAdmin ? 'admin' : 'member',
          joinedAt: member.joinedAt
        }
      })
    )

    return NextResponse.json({ 
      members: membersWithStats,
      totalMembers: membersWithStats.length 
    })
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.messId || !decoded.isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = await request.json()

    // Check if user exists and belongs to the mess
    const user = await User.findOne({ _id: userId, messId: decoded.messId })
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Cannot remove admin
    if (user.isAdmin) {
      return NextResponse.json({ message: 'Cannot remove admin user' }, { status: 400 })
    }

    // Remove user from mess (set messId to null)
    await User.findByIdAndUpdate(userId, { messId: null })

    return NextResponse.json({ message: 'Member removed successfully' })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
