import connectDB from '@/lib/mongodb'
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

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Get user from database for current info
    const user = await User.findById(decoded.userId)
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      tokenInfo: {
        userId: decoded.userId,
        email: decoded.email,
        messId: decoded.messId,
        role: decoded.role,
        isAdmin: decoded.isAdmin
      },
      databaseInfo: {
        userId: user._id,
        email: user.email,
        messId: user.messId,
        role: user.role,
        isAdmin: user.isAdmin
      },
      debugMessage: 'Check if tokenInfo.isAdmin is true for admin access'
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
