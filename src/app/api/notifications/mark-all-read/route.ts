import connectDB from '@/lib/mongodb'
import Notification from '@/models/Notification'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
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

    // Mark all notifications as read for this user in this mess
    await Notification.updateMany(
      {
        messId: user.messId,
        $or: [
          { recipientId: null }, // General notifications
          { recipientId: userId } // User-specific notifications
        ],
        isRead: false
      },
      { isRead: true }
    )

    return NextResponse.json({
      message: 'All notifications marked as read'
    })
  } catch (error) {
    console.error('Mark all notifications as read error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
