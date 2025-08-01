import connectDB from '@/lib/mongodb'
import LeaveRequest from '@/models/LeaveRequest'
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

// GET - Get user's leave request status
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.messId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Get user's latest leave request
    const leaveRequest = await LeaveRequest.findOne({ 
      userId: decoded.userId,
      messId: decoded.messId
    })
      .populate('reviewedBy', 'name')
      .sort({ requestedAt: -1 })
      .lean()

    if (!leaveRequest) {
      return NextResponse.json({ 
        hasActiveRequest: false,
        leaveRequest: null 
      })
    }

    const requestData = leaveRequest as any

    const formattedRequest = {
      id: requestData._id,
      reason: requestData.reason,
      status: requestData.status,
      requestedAt: requestData.requestedAt,
      reviewedAt: requestData.reviewedAt,
      reviewedBy: requestData.reviewedBy ? {
        id: requestData.reviewedBy._id,
        name: requestData.reviewedBy.name
      } : null,
      adminNote: requestData.adminNote
    }

    return NextResponse.json({
      hasActiveRequest: requestData.status === 'pending',
      leaveRequest: formattedRequest
    })

  } catch (error) {
    console.error('Error fetching leave request status:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Cancel pending leave request
export async function DELETE(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.messId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Find and delete the pending leave request
    const deletedRequest = await LeaveRequest.findOneAndDelete({
      userId: decoded.userId,
      messId: decoded.messId,
      status: 'pending'
    })

    if (!deletedRequest) {
      return NextResponse.json({ 
        message: 'No pending leave request found to cancel' 
      }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Leave request cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling leave request:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
