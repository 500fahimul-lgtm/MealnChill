import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

const verifyToken = async (token: string) => {
  try {
    console.log('Verifying token...')
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    console.log('Token verified successfully, userId:', decoded.userId)
    return decoded
  } catch (error) {
    console.error('Token verification failed:', error)
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
    console.log('Received token:', token ? token.substring(0, 20) + '...' : 'null')
    console.log('Token length:', token ? token.length : 0)

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
    console.log('Received mess creation data:', { name, description, address, mealFrequency, adminIsActive })

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
    console.log('Creating mess with userId:', userId)
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
    
    console.log('Mess data before creating model:', messData)
    const newMess = new Mess(messData)
    console.log('Mess model created, about to validate...')
    
    // Manually validate before saving to catch validation errors
    const validationError = newMess.validateSync()
    if (validationError) {
      console.error('Validation error:', validationError)
      return NextResponse.json(
        { message: `Validation failed: ${validationError.message}` },
        { status: 400 }
      )
    }

    console.log('About to save mess:', newMess.toObject())
    await newMess.save()
    console.log('Mess saved successfully with code:', newMess.messCode)

    // Update user's messId, isAdmin, and isActive status
    console.log('Updating user with messId:', newMess._id)
    await User.findByIdAndUpdate(userId, {
      messId: newMess._id,
      isAdmin: true, // Set as admin
      isActive: adminIsActive ?? true
    })
    console.log('User updated successfully')

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
