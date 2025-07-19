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

    const { name, phone } = await req.json()

    // Validate inputs
    if (!name || !phone) {
      return NextResponse.json(
        { message: 'Name and phone are required' },
        { status: 400 }
      )
    }

    if (!/^0\d{10}$/.test(phone.replace(/\D/g, ''))) {
      return NextResponse.json(
        { message: 'Phone number must be 11 digits starting with 0 (Bangladesh format)' },
        { status: 400 }
      )
    }

    // Check if phone number is already taken by another user
    const existingUser = await User.findOne({ 
      phone: phone,
      _id: { $ne: userId }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'This phone number is already registered to another account' },
        { status: 400 }
      )
    }

    // Update user details
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name: name.trim(),
        phone: phone.trim()
      },
      { new: true }
    )

    if (!updatedUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Details updated successfully',
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        phone: updatedUser.phone
      }
    })
  } catch (error) {
    console.error('Update details error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
