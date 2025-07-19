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
    if (!decoded || !decoded.messId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    // Verify current user is admin (check token first, then database)
    const isAdminFromToken = decoded.role === 'admin'
    const currentUser = await User.findById(decoded.userId)
    if (!currentUser || (!isAdminFromToken && currentUser.role !== 'admin')) {
      return NextResponse.json({ message: 'Admin privileges required' }, { status: 403 })
    }

    const { targetUserId, action } = await request.json()

    if (!['transfer', 'promote', 'demote'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
    }

    // Verify target user exists and belongs to the mess
    const targetUser = await User.findOne({ _id: targetUserId, messId: decoded.messId })
    if (!targetUser) {
      return NextResponse.json({ message: 'Target user not found in this mess' }, { status: 404 })
    }

    // Get the mess
    const mess = await Mess.findById(decoded.messId)
    if (!mess) {
      return NextResponse.json({ message: 'Mess not found' }, { status: 404 })
    }

    const currentAdminId = decoded.userId

    if (action === 'transfer') {
      // Transfer admin - replace current admin with target user
      mess.adminId = targetUserId
      await mess.save()

      // Update user roles
      await User.findByIdAndUpdate(currentAdminId, { isAdmin: false })
      await User.findByIdAndUpdate(targetUserId, { isAdmin: true })

      // Create notifications
      await Notification.create({
        messId: decoded.messId,
        userId: targetUserId,
        type: 'admin_transfer',
        title: 'Admin Rights Transferred',
        message: `You are now the admin of ${mess.name}. You have full administrative privileges.`,
        isRead: false
      })

      await Notification.create({
        messId: decoded.messId,
        userId: currentAdminId,
        type: 'admin_transfer',
        title: 'Admin Rights Transferred',
        message: `You have transferred admin rights to ${targetUser.name}. You are now a regular member.`,
        isRead: false
      })

      return NextResponse.json({
        message: 'Admin rights transferred successfully',
        newAdmin: {
          id: targetUser._id,
          name: targetUser.name
        }
      })

    } else if (action === 'promote') {
      // Add target user as co-admin (if mess supports multiple admins)
      if (!Array.isArray(mess.adminIds)) {
        mess.adminIds = [mess.adminId] // Convert single admin to array
      }
      
      if (!mess.adminIds.includes(targetUserId)) {
        mess.adminIds.push(targetUserId)
        await mess.save()

        await User.findByIdAndUpdate(targetUserId, { isAdmin: true })

        // Create notification
        await Notification.create({
          messId: decoded.messId,
          userId: targetUserId,
          type: 'admin_promotion',
          title: 'Promoted to Admin',
          message: `You have been promoted to admin of ${mess.name}. You now have administrative privileges.`,
          isRead: false
        })

        return NextResponse.json({
          message: 'User promoted to admin successfully',
          newAdmin: {
            id: targetUser._id,
            name: targetUser.name
          }
        })
      } else {
        return NextResponse.json({ message: 'User is already an admin' }, { status: 400 })
      }

    } else if (action === 'demote') {
      // Remove user from admin (only if there are multiple admins)
      if (Array.isArray(mess.adminIds) && mess.adminIds.length > 1) {
        mess.adminIds = mess.adminIds.filter((id: any) => id.toString() !== targetUserId)
        await mess.save()

        await User.findByIdAndUpdate(targetUserId, { isAdmin: false })

        // Create notification
        await Notification.create({
          messId: decoded.messId,
          userId: targetUserId,
          type: 'admin_demotion',
          title: 'Admin Rights Removed',
          message: `Your admin rights for ${mess.name} have been removed. You are now a regular member.`,
          isRead: false
        })

        return NextResponse.json({
          message: 'Admin rights removed successfully'
        })
      } else {
        return NextResponse.json({ message: 'Cannot demote the only admin' }, { status: 400 })
      }
    }

  } catch (error) {
    console.error('Error in admin transfer:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
