import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
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

    const { currentPassword, newPassword } = await req.json()

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password)
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // Update password
    await User.findByIdAndUpdate(userId, {
      password: hashedNewPassword
    })

    return NextResponse.json({
      message: 'Password changed successfully'
    })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
