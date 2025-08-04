import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    console.log('=== EMERGENCY ROLE FIX ===')
    
    // Find the user with ID 689072ffc0fdd861c1027939 (from logs)
    const userId = '689072ffc0fdd861c1027939'
    
    const user = await User.findById(userId).populate('messId')
    
    if (!user) {
      console.log('User not found')
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    console.log('Current user details:', {
      id: user._id,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      messId: user.messId?._id
    })

    // Force update the role to admin
    const updateResult = await User.findByIdAndUpdate(
      userId, 
      { 
        role: 'admin',
        isAdmin: true 
      }, 
      { new: true }
    )

    console.log('Updated user role:', {
      id: updateResult._id,
      email: updateResult.email,
      role: updateResult.role,
      isAdmin: updateResult.isAdmin
    })

    return NextResponse.json({
      message: 'Role updated successfully',
      before: {
        role: user.role,
        isAdmin: user.isAdmin
      },
      after: {
        role: updateResult.role,
        isAdmin: updateResult.isAdmin
      }
    })

  } catch (error) {
    console.error('Emergency role fix error:', error)
    return NextResponse.json(
      { 
        message: 'Internal server error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
