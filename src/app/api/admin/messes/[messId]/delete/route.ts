import connectDB from '@/lib/mongodb'
import BillingCycle from '@/models/BillingCycle'
import Deposit from '@/models/Deposit'
import Expense from '@/models/Expense'
import MealAttendance from '@/models/MealAttendance'
import Mess from '@/models/Mess'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ messId: string }> }) {
  try {
    await connectDB()

    // Await params
    const { messId } = await params

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
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any
      if (decoded.role !== 'web_admin') {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Find the mess to delete
    const mess = await Mess.findById(messId)
    if (!mess) {
      return NextResponse.json(
        { message: 'Mess not found' },
        { status: 404 }
      )
    }

    // Remove mess reference from all users in this mess
    await User.updateMany(
      { messId: messId },
      { $unset: { messId: "" }, $set: { isAdmin: false } }
    )

    // Delete all related data
    await Promise.all([
      MealAttendance.deleteMany({ messId: messId }),
      Expense.deleteMany({ messId: messId }),
      Deposit.deleteMany({ messId: messId }),
      BillingCycle.deleteMany({ messId: messId })
    ])

    // Delete the mess
    await Mess.findByIdAndDelete(messId)

    return NextResponse.json(
      { 
        message: 'Mess and all related data deleted successfully',
        deletedMess: {
          id: mess._id,
          name: mess.name,
          messCode: mess.messCode
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Delete mess error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
