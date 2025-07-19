import connectDB from '@/lib/mongodb'
import Notification from '@/models/Notification'
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

    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'all'

    // Build query for notifications
    const query: any = {
      messId: user.messId,
      $or: [
        { recipientId: null }, // Notifications for all mess members
        { recipientId: userId } // Notifications specifically for this user
      ]
    }

    if (filter === 'unread') {
      query.isRead = false
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50) // Limit to latest 50 notifications

    return NextResponse.json({
      notifications: notifications.map(notification => ({
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: notification.isRead,
        priority: notification.priority,
        createdAt: notification.createdAt,
        relatedData: notification.relatedData
      }))
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
