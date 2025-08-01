import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
import Notification from '@/models/Notification'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
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
    const currentUserId = decoded.userId

    const { id: messId } = resolvedParams
    const { userId: targetUserId } = await req.json()

    if (!targetUserId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get current user to verify they belong to this mess and are admin
    const currentUser = await User.findById(currentUserId)
    if (!currentUser || !currentUser.messId || currentUser.messId.toString() !== messId) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Get mess and verify admin access
    const mess = await Mess.findById(messId)
    if (!mess) {
      return NextResponse.json(
        { message: 'Mess not found' },
        { status: 404 }
      )
    }

    // Check if current user is admin
    const isAdmin = mess.adminIds?.some((adminId: any) => adminId.toString() === currentUserId) ||
                   mess.adminId.toString() === currentUserId

    if (!isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Find the pending member
    const targetMemberIndex = mess.members.findIndex((member: any) => 
      member.userId.toString() === targetUserId
    )

    if (targetMemberIndex === -1) {
      return NextResponse.json(
        { message: 'Join request not found' },
        { status: 404 }
      )
    }

    const targetMember = mess.members[targetMemberIndex]
    if (targetMember.isActive) {
      return NextResponse.json(
        { message: 'User is already an active member' },
        { status: 400 }
      )
    }

    // Remove the pending member
    mess.members.splice(targetMemberIndex, 1)
    await mess.save()

    // Get user details for notification
    const targetUser = await User.findById(targetUserId)

    // Notify the rejected user
    await Notification.create({
      messId: mess._id,
      recipientId: targetUserId,
      type: 'general',
      title: 'Join Request Rejected',
      message: `Your request to join ${mess.name} has been rejected by the admin.`,
      relatedData: { messId: mess._id, messName: mess.name },
      priority: 'medium',
    })

    return NextResponse.json({ 
      message: `${targetUser?.name || targetUser?.email || 'User'}'s join request has been rejected` 
    })
  } catch (error) {
    console.error('Reject member error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
