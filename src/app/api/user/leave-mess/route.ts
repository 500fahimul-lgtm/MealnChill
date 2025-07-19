import connectDB from '@/lib/mongodb'
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

    // Check if user is admin
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
    }

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
        title: 'Member Left Mess',
        message: `${currentUser.name} has left the mess.`,
        isRead: false
      })
    }

    // Generate a new token with updated user info (no messId)
    const newToken = jwt.sign(
      { 
        userId: currentUser._id,
        email: currentUser.email,
        messId: null,
        role: 'member'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return NextResponse.json({
      message: 'You have successfully left the mess. You can join another mess or create a new one.',
      token: newToken
    })

  } catch (error) {
    console.error('Error leaving mess:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
