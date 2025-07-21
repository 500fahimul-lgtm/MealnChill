import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
import NotificationModel from '@/models/Notification'
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

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.messId) {
      return NextResponse.json({ message: 'Unauthorized. Invalid token or no mess association.' }, { status: 403 })
    }

    // Check if user is admin - check both isAdmin field and role field for backward compatibility
    const isUserAdmin = decoded.isAdmin === true || decoded.role === 'admin'
    if (!isUserAdmin) {
      return NextResponse.json({ message: 'Unauthorized. Only admins can add members.' }, { status: 403 })
    }

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    // Check if user exists in the system
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (!existingUser) {
      return NextResponse.json({ 
        message: 'User with this email is not registered in the system. Please ask them to register first.' 
      }, { status: 404 })
    }

    // Check if user is already a member of this mess
    if (existingUser.messId && existingUser.messId.toString() === decoded.messId) {
      return NextResponse.json({ 
        message: 'This user is already a member of your mess' 
      }, { status: 400 })
    }

    // Check if user is already a member of another mess
    if (existingUser.messId) {
      const otherMess = await Mess.findById(existingUser.messId)
      return NextResponse.json({ 
        message: `This user is already a member of "${otherMess?.name || 'another mess'}". They must leave that mess first.` 
      }, { status: 400 })
    }

    // Add user to current mess
    await User.findByIdAndUpdate(existingUser._id, {
      messId: decoded.messId,
      joinedAt: new Date()
    })

    // Get mess info for notification
    const mess = await Mess.findById(decoded.messId)

    // Create notification for the new member
    await NotificationModel.create({
      messId: decoded.messId,
      recipientId: existingUser._id,
      type: 'general',
      title: 'Added to Mess',
      message: `You have been added to ${mess?.name || 'a mess'} by an admin. Welcome!`,
      isRead: false
    })

    return NextResponse.json({ 
      message: `${existingUser.name} has been successfully added to your mess` 
    })

  } catch (error) {
    console.error('Error adding member:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
