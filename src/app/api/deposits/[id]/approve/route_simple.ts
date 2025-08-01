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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Check if user is admin
    if (!user.isAdmin) {
      return NextResponse.json({ message: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    // Get deposit ID from params
    const { id: depositId } = await params

    const deposit = await Deposit.findOne({ 
      _id: depositId, 
      messId: user.messId,
      status: 'pending'
    }).populate('userId', 'name')

    if (!deposit) {
      return NextResponse.json({ message: 'Pending deposit not found' }, { status: 404 })
    }

    // Approve the deposit
    deposit.status = 'approved'
    deposit.approvedByUserId = decoded.userId
    await deposit.save()

    // Update mess total deposited amount for current cycle
    await Mess.findByIdAndUpdate(
      user.messId,
      { $inc: { totalDepositedAmountCurrentCycle: deposit.amount } }
    )

    // Create notification for the depositing member
    await Notification.create({
      messId: user.messId,
      recipientId: deposit.userId._id,
      type: 'deposit_status',
      title: 'Deposit Approved',
      message: `Your deposit of ৳${deposit.amount} has been approved.`,
      isRead: false
    })

    return NextResponse.json({
      message: 'Deposit approved successfully',
      deposit
    })

  } catch (error) {
    console.error('Error approving deposit:', error)
    return NextResponse.json(
      { message: 'Failed to approve deposit' }, 
      { status: 500 }
    )
  }
}
