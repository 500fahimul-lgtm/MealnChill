import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
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

export async function GET(req: NextRequest) {
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
    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }
    const userId = decoded.userId

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // If user has messId, check their status in the mess
    if (user.messId) {
      const mess = await Mess.findById(user.messId)
      if (mess) {
        const memberRecord = mess.members.find(
          (member: any) => member.userId.toString() === userId
        )
        
        if (memberRecord) {
          return NextResponse.json({
            hasMessId: true,
            messId: user.messId,
            messName: mess.name,
            isActive: memberRecord.isActive,
            isPending: !memberRecord.isActive,
            role: user.role || 'member'
          })
        }
      }
    }

    // Check if user has any pending join requests in any mess
    const pendingMess = await Mess.findOne({
      'members.userId': userId,
      'members.isActive': false
    })

    if (pendingMess) {
      return NextResponse.json({
        hasMessId: false,
        isPending: true,
        pendingMessId: pendingMess._id,
        pendingMessName: pendingMess.name
      })
    }

    return NextResponse.json({
      hasMessId: false,
      isPending: false
    })
  } catch (error) {
    console.error('User status error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
