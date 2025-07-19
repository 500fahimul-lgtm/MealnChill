import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

const verifyToken = async (token: string) => {
  try {
    console.log('Join API - Verifying token...')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    console.log('Join API - Token verified successfully, userId:', decoded.userId)
    return decoded
  } catch (error) {
    console.error('Join API - Token verification failed:', error)
    return null
  }
}

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

    // Debug: Log token for debugging
    console.log('Join API - Received token:', token ? token.substring(0, 20) + '...' : 'null')
    console.log('Join API - Token length:', token ? token.length : 0)

    // Verify token
    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { message: 'Invalid or malformed token' },
        { status: 401 }
      )
    }
    const userId = decoded.userId

    // Check if user exists
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is already in a mess
    if (user.messId) {
      return NextResponse.json(
        { message: 'You are already part of a mess' },
        { status: 400 }
      )
    }

    const { messCode } = await req.json()

    // Validate mess code
    if (!messCode) {
      return NextResponse.json(
        { message: 'Mess code is required' },
        { status: 400 }
      )
    }

    // Find mess by code
    const mess = await Mess.findOne({ 
      messCode: messCode.toUpperCase(),
      isActive: true 
    })

    if (!mess) {
      return NextResponse.json(
        { message: 'Invalid mess code. Please check and try again.' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const existingMember = mess.members.find(
      (member: any) => member.userId.toString() === userId
    )

    if (existingMember) {
      return NextResponse.json(
        { message: 'You are already a member of this mess' },
        { status: 400 }
      )
    }

    // Add user to mess members
    mess.members.push({
      userId: userId,
      joinedAt: new Date(),
      isActive: true
    })

    await mess.save()

    // Update user's messId
    await User.findByIdAndUpdate(userId, {
      messId: mess._id,
      role: 'member'
    })

    // Generate new token with updated messId
    const newToken = jwt.sign(
      { 
        userId: userId,
        email: decoded.email,
        messId: mess._id.toString(),
        role: 'member'
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return NextResponse.json(
      { 
        message: 'Successfully joined the mess',
        mess: {
          id: mess._id,
          name: mess.name,
          messCode: mess.messCode,
          mealFrequency: mess.mealFrequency
        },
        token: newToken
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Join mess error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
