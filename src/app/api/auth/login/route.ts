import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    const { email, password } = await req.json()

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { message: 'Account is deactivated. Please contact support.' },
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create JWT token with role information
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        messId: user.messId,
        role: user.role
      },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    )

    // Return user data (excluding password) and token
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      messId: user.messId,
      role: user.role,
    }

    return NextResponse.json(
      { 
        message: 'Login successful',
        token,
        user: userData
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
