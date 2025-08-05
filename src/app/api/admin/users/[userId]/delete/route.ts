import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    await connectDB()

    // Await params
    const { userId } = await params

    // Get token from header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any
      if (decoded.role !== 'web_admin') {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Find the user to delete
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // If user is part of a mess, remove them from the mess
    if (user.messId) {
      await Mess.findByIdAndUpdate(user.messId, {
        $pull: { members: { userId: user._id } }
      })
    }

    // Delete the user
    await User.findByIdAndDelete(userId)

    return NextResponse.json(
      { 
        message: 'User deleted successfully',
        deletedUser: {
          id: user._id,
          name: user.name,
          email: user.email
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
