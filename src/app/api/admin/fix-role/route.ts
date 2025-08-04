import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any
    const userId = decoded.userId

    console.log('Fix role request for user:', userId)

    // Find user
    const user = await User.findById(userId).populate('messId')
    if (!user || !user.messId) {
      return NextResponse.json(
        { message: 'User not found or not part of a mess' },
        { status: 404 }
      )
    }

    console.log('Current user details:', {
      id: user._id,
      email: user.email,
      role: user.role,
      messId: user.messId._id
    })

    // Check if user should be admin based on mess admin fields
    const mess = user.messId
    let shouldBeAdmin = false

    // Check adminId field
    if (mess.adminId && mess.adminId.toString() === userId) {
      shouldBeAdmin = true
    }

    // Check adminIds array
    if (Array.isArray(mess.adminIds) && mess.adminIds.some((id: any) => id.toString() === userId)) {
      shouldBeAdmin = true
    }

    console.log('Admin check results:', {
      messAdminId: mess.adminId,
      messAdminIds: mess.adminIds,
      shouldBeAdmin,
      currentRole: user.role
    })

    if (shouldBeAdmin && user.role !== 'admin') {
      // Update user role to admin
      await User.findByIdAndUpdate(userId, { role: 'admin' })
      console.log('Updated user role to admin')
      
      return NextResponse.json({
        message: 'Role updated to admin successfully',
        oldRole: user.role,
        newRole: 'admin'
      })
    } else if (shouldBeAdmin) {
      return NextResponse.json({
        message: 'User is already admin',
        role: user.role
      })
    } else {
      return NextResponse.json({
        message: 'User is not designated as admin in mess settings',
        role: user.role,
        messAdminId: mess.adminId,
        messAdminIds: mess.adminIds
      })
    }

  } catch (error) {
    console.error('Fix role error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
