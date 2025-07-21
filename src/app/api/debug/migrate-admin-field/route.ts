import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Update all users who have role 'admin' to also have isAdmin: true
    const result = await User.updateMany(
      { role: 'admin' },
      { $set: { isAdmin: true } }
    )

    // Update all users who have role 'member' to have isAdmin: false
    const memberResult = await User.updateMany(
      { role: 'member' },
      { $set: { isAdmin: false } }
    )

    return NextResponse.json({
      message: 'Migration completed successfully',
      adminUsersUpdated: result.modifiedCount,
      memberUsersUpdated: memberResult.modifiedCount,
      totalUsersUpdated: result.modifiedCount + memberResult.modifiedCount
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ 
      message: 'Migration failed', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
