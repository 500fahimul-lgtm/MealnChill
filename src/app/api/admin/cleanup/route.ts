import connectDB from '@/lib/mongodb'
import BillingCycle from '@/models/BillingCycle'
import Deposit from '@/models/Deposit'
import Expense from '@/models/Expense'
import Inventory from '@/models/Inventory'
import InventoryRecord from '@/models/InventoryRecord'
import LeaveRequest from '@/models/LeaveRequest'
import MealAttendance from '@/models/MealAttendance'
import MealRoutine from '@/models/MealRoutine'
import MemberSettlement from '@/models/MemberSettlement'
import Mess from '@/models/Mess'
import Notification from '@/models/Notification'
import User from '@/models/User'
import WebAdmin from '@/models/WebAdmin'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Check admin authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const admin = await WebAdmin.findById(decoded.userId)
    
    if (!admin) {
      return NextResponse.json({ error: 'Invalid admin token' }, { status: 401 })
    }

    // Get confirmation from request body
    const { confirmAction, adminPassword } = await request.json()
    
    if (confirmAction !== 'DELETE_ALL_DATA') {
      return NextResponse.json({ 
        error: 'Confirmation required. Send confirmAction: "DELETE_ALL_DATA"' 
      }, { status: 400 })
    }

    if (!adminPassword) {
      return NextResponse.json({ 
        error: 'Admin password required for this action' 
      }, { status: 400 })
    }

    // Verify admin password
    const bcrypt = require('bcryptjs')
    const isValidPassword = await bcrypt.compare(adminPassword, admin.password)
    
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid admin password' }, { status: 403 })
    }

    // Start cleanup process
    const deletionResults: any = {}

    try {
      // Delete all collections in order (respecting dependencies)
      deletionResults.inventoryRecords = await InventoryRecord.deleteMany({})
      deletionResults.inventory = await Inventory.deleteMany({})
      deletionResults.notifications = await Notification.deleteMany({})
      deletionResults.memberSettlements = await MemberSettlement.deleteMany({})
      deletionResults.billingCycles = await BillingCycle.deleteMany({})
      deletionResults.deposits = await Deposit.deleteMany({})
      deletionResults.expenses = await Expense.deleteMany({})
      deletionResults.leaveRequests = await LeaveRequest.deleteMany({})
      deletionResults.mealRoutines = await MealRoutine.deleteMany({})
      deletionResults.mealAttendance = await MealAttendance.deleteMany({})
      deletionResults.messes = await Mess.deleteMany({})
      deletionResults.users = await User.deleteMany({})

      // Keep WebAdmin data intact - don't delete admin accounts
      
      const totalDeleted = Object.values(deletionResults).reduce((sum: number, result: any) => 
        sum + (result.deletedCount || 0), 0
      )

      return NextResponse.json({
        message: 'Database cleanup completed successfully',
        details: {
          totalRecordsDeleted: totalDeleted,
          deletionResults,
          preservedData: ['WebAdmin accounts'],
          cleanupPerformedBy: admin.username,
          cleanupTime: new Date().toISOString()
        }
      })

    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError)
      return NextResponse.json({
        error: 'Partial cleanup failure',
        details: deletionResults,
        failureReason: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Database cleanup error:', error)
    return NextResponse.json({
      error: 'Database cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}