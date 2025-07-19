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
  { params }: { params: { id: string } }
) {
  return handleDepositAction(request, { params })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleDepositAction(request, { params })
}

async function handleDepositAction(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('APPROVE DEBUG: Starting handleDepositAction')
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      console.log('APPROVE DEBUG: No token provided')
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    console.log('APPROVE DEBUG: Decoded token:', decoded)
    if (!decoded || !decoded.userId) {
      console.log('APPROVE DEBUG: Invalid token')
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    // Get the user to find their mess
    console.log('APPROVE DEBUG: Getting user with ID:', decoded.userId)
    const user = await User.findById(decoded.userId)
    console.log('APPROVE DEBUG: User found:', user ? { id: user._id, messId: user.messId } : 'null')
    if (!user || !user.messId) {
      console.log('APPROVE DEBUG: User not found or not in a mess')
      return NextResponse.json({ message: 'User not found or not in a mess' }, { status: 404 })
    }

    // Check if user is admin by verifying against mess adminId
    console.log('APPROVE DEBUG: Getting mess with ID:', user.messId)
    const mess = await Mess.findById(user.messId)
    console.log('APPROVE DEBUG: Mess found:', mess ? { id: mess._id, adminId: mess.adminId } : 'null')
    console.log('APPROVE DEBUG: Checking if user is admin - mess.adminId:', mess?.adminId.toString(), 'decoded.userId:', decoded.userId)
    if (!mess || mess.adminId.toString() !== decoded.userId) {
      console.log('APPROVE DEBUG: User is not admin')
      return NextResponse.json({ message: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    console.log('APPROVE DEBUG: User is admin, proceeding with action')
    const { action, rejectionReason } = await request.json() // action: 'approve' or 'reject'
    
    // Await params in Next.js 15
    const awaitedParams = await params
    const depositId = awaitedParams.id

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
    }

    const deposit = await Deposit.findOne({ 
      _id: depositId, 
      messId: user.messId,
      status: 'pending'
    }).populate('userId', 'name')

    if (!deposit) {
      return NextResponse.json({ message: 'Pending deposit not found' }, { status: 404 })
    }

    if (action === 'approve') {
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

    } else if (action === 'reject') {
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
        message: `Your deposit of ৳${deposit.amount} was rejected. Reason: ${deposit.rejectionReason}`,
        isRead: false
      })

      return NextResponse.json({
        message: 'Deposit rejected successfully',
        deposit
      })
    }

  } catch (error) {
    console.error('Error updating deposit:', error)
    return NextResponse.json(
      { message: 'Failed to update deposit' }, 
      { status: 500 }
    )
  }
}
