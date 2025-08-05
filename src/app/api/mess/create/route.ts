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

    const { name, description, address, mealFrequency, adminIsActive } = await req.json()

    // Debug log the received data

    // Validate required fields
    if (!name || !address) {
      return NextResponse.json(
        { message: 'Mess name and address are required' },
        { status: 400 }
      )
    }

    // Validate meal frequency
    if (![2, 3].includes(mealFrequency)) {
      return NextResponse.json(
        { message: `Meal frequency must be 2 or 3, received: ${mealFrequency}` },
        { status: 400 }
      )
    }

    // Create new mess
    const messData = {
      name: name.trim(),
      description: description?.trim() || '',
      address: address.trim(),
      mealFrequency,
      adminIsActive: adminIsActive ?? true,
      adminId: userId,
      adminIds: [userId], // Initialize with the creator as admin
      members: adminIsActive ? [{
        userId: userId,
        joinedAt: new Date(),
        isActive: true
      }] : [],
      currentCycle: {
        startDate: new Date(),
        isActive: true
      }
    }
    
    const newMess = new Mess(messData)
    
    // Manually validate before saving to catch validation errors
    const validationError = newMess.validateSync()
    if (validationError) {
      return NextResponse.json(
        { message: `Validation failed: ${validationError.message}` },
        { status: 400 }
      )
    }

    await newMess.save()

    // Update user's messId, role, and isActive status
    await User.findByIdAndUpdate(userId, {
      messId: newMess._id,
      role: 'admin', // Set role as admin
      isAdmin: true, // Set as admin (for compatibility)
      isActive: adminIsActive ?? true
    })

    // Generate new token with updated messId and admin status
    const newToken = jwt.sign(
      { 
        userId: userId,
        email: decoded.email,
        messId: newMess._id.toString(),
        isAdmin: true
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return NextResponse.json(
      { 
        message: 'Mess created successfully',
        mess: {
          id: newMess._id,
          name: newMess.name,
          messCode: newMess.messCode,
          mealFrequency: newMess.mealFrequency,
          adminIsActive: newMess.adminIsActive
        },
        token: newToken
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create mess error:', error)
    
    // Provide more specific error information
    let errorMessage = 'Internal server error'
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'development') {
        errorMessage = error.message
      }
    }
    
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    )
  }
}
