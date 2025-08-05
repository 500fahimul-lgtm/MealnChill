import connectDB from '@/lib/mongodb'
import WebAdmin from '@/models/WebAdmin'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    await connectDB()

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
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string)
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword, newUsername, newEmail } = await req.json()

    // Find admin
    const admin = await WebAdmin.findById(decoded.adminId)
    if (!admin) {
      return NextResponse.json(
        { message: 'Admin not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password)
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { message: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Update fields
    const updateData: any = {}
    
    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { message: 'New password must be at least 6 characters long' },
          { status: 400 }
        )
      }
      updateData.password = await bcrypt.hash(newPassword, 12)
    }

    if (newUsername && newUsername !== admin.username) {
      // Check if username already exists
      const existingAdmin = await WebAdmin.findOne({ 
        username: newUsername.toLowerCase(),
        _id: { $ne: admin._id }
      })
      if (existingAdmin) {
        return NextResponse.json(
          { message: 'Username already exists' },
          { status: 400 }
        )
      }
      updateData.username = newUsername.toLowerCase()
    }

    if (newEmail && newEmail !== admin.email) {
      // Check if email already exists
      const existingAdmin = await WebAdmin.findOne({ 
        email: newEmail.toLowerCase(),
        _id: { $ne: admin._id }
      })
      if (existingAdmin) {
        return NextResponse.json(
          { message: 'Email already exists' },
          { status: 400 }
        )
      }
      updateData.email = newEmail.toLowerCase()
    }

    // Update admin
    await WebAdmin.findByIdAndUpdate(admin._id, updateData)

    return NextResponse.json(
      { message: 'Admin credentials updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update admin credentials error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
