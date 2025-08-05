import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const userId = decoded.userId

    // Get user
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    const messId = user.messId
    if (!messId) {
      return NextResponse.json({ message: 'User is not part of any mess' }, { status: 400 })
    }

    // Get the mess
    const mess = await Mess.findById(messId)
    if (!mess) {
      return NextResponse.json({ message: 'Mess not found' }, { status: 404 })
    }

    const messStatus = {
      messId: mess._id,
      messName: mess.name,
      messCode: mess.messCode,
      isStarted: mess.isStarted || false,
      messStatus: mess.messStatus || 'created',
      startedAt: mess.startedAt,
      endedAt: mess.endedAt,
      isUserAdmin: user.role === 'admin' && (
        mess.adminId.toString() === userId || 
        mess.adminIds.some((id: any) => id.toString() === userId)
      )
    }

    return NextResponse.json({ messStatus })

  } catch (error) {
    console.error('Error getting mess status:', error)
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
