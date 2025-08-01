import connectDB from '@/lib/mongodb'
import LeaveRequest from '@/models/LeaveRequest'
import Mess from '@/models/Mess'
import Notification from '@/models/Notification'
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
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    const currentUserId = decoded.userId
    const { reason } = await request.json()

    // Get current user to check their actual mess status
    const currentUser = await User.findById(currentUserId)
    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (!currentUser.messId) {
      return NextResponse.json({ message: 'You are not in any mess' }, { status: 400 })
    }

    // Get mess info
    const mess = await Mess.findById(currentUser.messId)
    if (!mess) {
      return NextResponse.json({ message: 'Mess not found' }, { status: 404 })
    }

    // Check if user is admin - admins can leave immediately if there are other admins
    if (currentUser.isAdmin) {
      // Check if there are other admins
      const totalAdmins = await User.countDocuments({ 
        messId: currentUser.messId, 
        isAdmin: true 
      })

      if (totalAdmins <= 1) {
        return NextResponse.json({ 
          message: 'Cannot leave mess. You are the only admin. Please transfer admin rights to another member first or delete the mess.' 
        }, { status: 400 })
      }

      // Admin can leave immediately if there are other admins
      return await processImmediateLeave(currentUser, mess, currentUserId)
    }

    // For regular members, check if there's already a pending request
    const existingRequest = await LeaveRequest.findOne({
      userId: currentUserId,
      messId: currentUser.messId,
      status: 'pending'
    })

    if (existingRequest) {
      return NextResponse.json({ 
        message: 'You already have a pending leave request. Please wait for admin approval.' 
      }, { status: 400 })
    }

    // Create new leave request
    const leaveRequest = new LeaveRequest({
      userId: currentUserId,
      messId: currentUser.messId,
      reason: reason?.trim() || '',
      status: 'pending'
    })

    await leaveRequest.save()

    // Notify all admins about the leave request
    const admins = await User.find({
      messId: currentUser.messId,
      isAdmin: true
    })

    for (const admin of admins) {
      await Notification.create({
        messId: currentUser.messId,
        userId: admin._id,
        type: 'leave_request',
        title: 'Leave Request Submitted',
        message: `${currentUser.name} has requested to leave the mess.${reason ? ` Reason: ${reason}` : ''}`,
        isRead: false,
        relatedData: {
          leaveRequestId: leaveRequest._id,
          requestingUserId: currentUserId,
          requestingUserName: currentUser.name
        }
      })
    }

    return NextResponse.json({
      message: 'Leave request submitted successfully. Please wait for admin approval.',
      requestId: leaveRequest._id
    })

  } catch (error) {
    console.error('Error creating leave request:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// Helper function for immediate leave (for admins)
async function processImmediateLeave(currentUser: any, mess: any, currentUserId: string) {
  try {
    // If leaving admin was the main admin, assign it to another admin
    if (mess.adminId && mess.adminId.toString() === currentUserId) {
      const anotherAdmin = await User.findOne({
        messId: currentUser.messId,
        isAdmin: true,
        _id: { $ne: currentUserId }
      })

      if (anotherAdmin) {
        mess.adminId = anotherAdmin._id
        await mess.save()
      }
    }

    // Remove from adminIds array if it exists
    if (Array.isArray(mess.adminIds)) {
      mess.adminIds = mess.adminIds.filter((id: any) => id.toString() !== currentUserId)
      await mess.save()
    }

    // Remove user from mess members array
    mess.members = mess.members.filter((member: any) => member.userId.toString() !== currentUserId)
    await mess.save()

    // Remove user from mess
    await User.findByIdAndUpdate(currentUserId, { 
      messId: null, 
      isAdmin: false 
    })

    // Create notification for remaining admins
    const remainingAdmins = await User.find({
      messId: currentUser.messId,
      isAdmin: true
    })

    for (const admin of remainingAdmins) {
      await Notification.create({
        messId: currentUser.messId,
        userId: admin._id,
        type: 'member_left',
        title: 'Admin Left Mess',
        message: `${currentUser.name} (Admin) has left the mess.`,
        isRead: false
      })
    }

    // Generate a new token with updated user info (no messId)
    const newToken = jwt.sign(
      { 
        userId: currentUser._id,
        email: currentUser.email,
        messId: null,
        isAdmin: false
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      message: 'You have successfully left the mess. You can join another mess or create a new one.',
      token: newToken
    })

  } catch (error) {
    console.error('Error processing immediate leave:', error)
    throw error
  }
}
