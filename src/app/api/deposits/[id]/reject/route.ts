import connectDB from '@/lib/mongodb'
import Deposit from '@/models/Deposit'
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    // Get the user to find their mess
    const user = await User.findById(decoded.userId)
    if (!user || !user.messId) {
      return NextResponse.json({ message: 'User not found or not in a mess' }, { status: 404 })
    }

    // Check if user is admin by verifying against mess adminId
    const mess = await Mess.findById(user.messId)
    if (!mess || mess.adminId.toString() !== decoded.userId) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    // Await params in Next.js 15
    const awaitedParams = await params
    const depositId = awaitedParams.id
    const { rejectionReason } = await request.json()

    const deposit = await Deposit.findOne({ 
      _id: depositId, 
      messId: user.messId,
      status: 'pending'
    }).populate('userId', 'name')

    if (!deposit) {
      return NextResponse.json({ message: 'Pending deposit not found' }, { status: 404 })
    }

    // Reject the deposit
    deposit.status = 'rejected'
    deposit.rejectionReason = rejectionReason || 'No reason provided'
    await deposit.save()

    // Create notification for the depositing member
    await Notification.create({
      messId: user.messId,
      recipientId: deposit.userId._id,
      type: 'deposit_status',
      title: 'Deposit Rejected',
      message: `Your deposit of ৳${deposit.amount} has been rejected. Reason: ${deposit.rejectionReason}`,
      isRead: false
    })

    return NextResponse.json({
      message: 'Deposit rejected successfully',
      deposit
    })

  } catch (error) {
    console.error('Error rejecting deposit:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
