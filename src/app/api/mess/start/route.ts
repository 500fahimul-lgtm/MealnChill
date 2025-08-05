import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
import Notification from '@/models/Notification'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const userId = decoded.userId

    // Get user to check admin status
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ message: 'Only admins can start the mess' }, { status: 403 })
    }

    const messId = user.messId
    if (!messId) {
      return NextResponse.json({ message: 'User is not part of any mess' }, { status: 400 })
    }

    // Get the mess
    const mess = await Mess.findById(messId)
    if (!mess) {
      return NextResponse.json({ message: 'Mess not found' }, { status: 404 })
    }

    // Check if user is admin of this mess
    if (mess.adminId.toString() !== userId && !mess.adminIds.some((id: any) => id.toString() === userId)) {
      return NextResponse.json({ message: 'You are not an admin of this mess' }, { status: 403 })
    }

    // Check if mess is already started
    if (mess.isStarted || mess.messStatus === 'started') {
      return NextResponse.json({ message: 'Mess has already been started' }, { status: 400 })
    }

    // Check if mess was previously ended
    if (mess.messStatus === 'ended') {
      return NextResponse.json({ message: 'This mess has been ended and cannot be restarted' }, { status: 400 })
    }

    // Start the mess
    mess.isStarted = true
    mess.startedAt = new Date()
    mess.messStatus = 'started'
    
    // Update current cycle start date to mess start time
    mess.currentCycle.startDate = new Date()
    mess.currentCycle.isActive = true

    await mess.save()

    // Create notification for all members
    try {
      const notification = new Notification({
        messId: messId,
        type: 'mess_management',
        title: 'Mess Started!',
        message: `${mess.name} has been officially started by the admin. All meal calculations and tracking are now active.`,
        priority: 'high',
        relatedData: {
          messName: mess.name,
          startedAt: mess.startedAt,
          startedBy: user.name
        }
      })
      await notification.save()
    } catch (notificationError) {
      console.error('Error creating notification for mess start:', notificationError)
      // Don't fail the main operation if notification creation fails
    }


    return NextResponse.json({
      message: 'Mess started successfully',
      mess: {
        id: mess._id,
        name: mess.name,
        messCode: mess.messCode,
        isStarted: mess.isStarted,
        startedAt: mess.startedAt,
        messStatus: mess.messStatus
      }
    })

  } catch (error) {
    console.error('Error starting mess:', error)
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
