import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
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
    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { message: 'Invalid or malformed token' },
        { status: 401 }
      )
    }
    const userId = decoded.userId

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is already in a mess
    if (user.messId) {
      return NextResponse.json(
        { message: 'You are already part of a mess' },
        { status: 400 }
      )
    }

    const { messCode } = await req.json()

    // Validate mess code
    if (!messCode) {
      return NextResponse.json(
        { message: 'Mess code is required' },
        { status: 400 }
      )
    }

    // Find mess by code
    const mess = await Mess.findOne({ 
      messCode: messCode.toUpperCase(),
      isActive: true 
    })

    if (!mess) {
      return NextResponse.json(
        { message: 'Invalid mess code. Please check and try again.' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMember = mess.members.find(
      (member: any) => member.userId.toString() === userId
    )

    if (existingMember) {
      if (existingMember.isActive) {
        return NextResponse.json(
          { message: 'You are already a member of this mess' },
          { status: 400 }
        )
      } else {
        // Check if this is a recent pending request (within last 24 hours) or an old left member
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const isRecentRequest = new Date(existingMember.joinedAt) > dayAgo
        
        if (isRecentRequest) {
          return NextResponse.json(
            { message: 'Your join request is already pending approval' },
            { status: 400 }
          )
        } else {
          // This is an old record from when user left, reactivate it as pending
          existingMember.joinedAt = new Date()
          existingMember.isActive = false // Keep as pending for admin approval
          await mess.save()
          
          // Notify admin(s) about join request
          const Notification = (await import('@/models/Notification')).default;
          const adminIds = mess.adminIds && mess.adminIds.length > 0 ? mess.adminIds : [mess.adminId];
          const notifications = adminIds.map((adminId: any) => ({
            messId: mess._id,
            recipientId: adminId,
            type: 'join_request',
            title: 'New Join Request',
            message: `${user.name || user.email} has requested to rejoin your mess.`,
            relatedData: { userId, userName: user.name || user.email },
            priority: 'medium',
          }));
          await Notification.insertMany(notifications);

          return NextResponse.json(
            {
              message: 'Join request sent. Waiting for admin approval.',
              waitingForApproval: true
            },
            { status: 200 }
          )
        }
      }
    }

    // Add user to mess members as pending (isActive: false)
    mess.members.push({
      userId: userId,
      joinedAt: new Date(),
      isActive: false
    })

    await mess.save()

    // Optionally, do not update user's messId yet, or set a pendingMessId field if you want to track

    // Notify admin(s) about join request
    const Notification = (await import('@/models/Notification')).default;
    const adminIds = mess.adminIds && mess.adminIds.length > 0 ? mess.adminIds : [mess.adminId];
    const notifications = adminIds.map((adminId: any) => ({
      messId: mess._id,
      recipientId: adminId,
      type: 'join_request',
      title: 'New Join Request',
      message: `${user.name || user.email} has requested to join your mess.`,
      relatedData: { userId, userName: user.name || user.email },
      priority: 'medium',
    }));
    await Notification.insertMany(notifications);

    return NextResponse.json(
      {
        message: 'Join request sent. Waiting for admin approval.',
        waitingForApproval: true
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Join mess error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
