import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest, 
  { params }: { params: { id: string; userId: string } }
) {
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

    const { id: messId, userId: targetUserId } = params

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

    const currentUserMembership = mess.members.find((member: any) => 
      member.userId.toString() === currentUserId
    )
    
    if (!currentUserMembership || currentUserMembership.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Prevent admin from deactivating themselves
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { message: 'Cannot modify your own membership status' },
        { status: 400 }
      )
    }

    // Get update data from request body
    const { isActive } = await req.json()

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { message: 'isActive must be a boolean value' },
        { status: 400 }
      )
    }

    // Find and update the target member
    const targetMemberIndex = mess.members.findIndex((member: any) => 
      member.userId.toString() === targetUserId
    )

    if (targetMemberIndex === -1) {
      return NextResponse.json(
        { message: 'Member not found in this mess' },
        { status: 404 }
      )
    }

    // Update the member status
    mess.members[targetMemberIndex].isActive = isActive
    await mess.save()

    return NextResponse.json({ 
      message: `Member ${isActive ? 'activated' : 'deactivated'} successfully` 
    })
  } catch (error) {
    console.error('Update member status error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
