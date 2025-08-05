import connectDB from '@/lib/mongodb'
import BillingCycle from '@/models/BillingCycle'
import Deposit from '@/models/Deposit'
import Expense from '@/models/Expense'
import MealAttendance from '@/models/MealAttendance'
import Mess from '@/models/Mess'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ messId: string }> }) {
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

    // Get mess with full details
    const mess = await Mess.findById(messId)
      .populate('adminId', 'name email phone password createdAt')
      .populate('adminIds', 'name email phone password createdAt')
      .populate('members.userId', 'name email phone password role isActive createdAt')
      .populate('members.approvedBy', 'name email')
      .lean() as any

    if (!mess) {
      return NextResponse.json(
        { message: 'Mess not found' },
        { status: 404 }
      )
    }

    // Get financial statistics
    const [expenseStats, depositStats, billingStats] = await Promise.all([
      Expense.aggregate([
        { $match: { messId: mess._id } },
        {
          $group: {
            _id: null,
            totalExpenses: { $sum: '$amount' },
            expenseCount: { $sum: 1 },
            avgExpense: { $avg: '$amount' }
          }
        }
      ]),
      Deposit.aggregate([
        { $match: { messId: mess._id } },
        {
          $group: {
            _id: '$status',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),
      BillingCycle.aggregate([
        { $match: { messId: mess._id } },
        {
          $group: {
            _id: null,
            totalBillingCycles: { $sum: 1 },
            completedCycles: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } }
          }
        }
      ])
    ])

    // Get meal attendance statistics
    const mealStats = await MealAttendance.aggregate([
      { $match: { messId: mess._id } },
      {
        $group: {
          _id: null,
          totalMealDays: { $sum: 1 },
          totalBreakfasts: { $sum: { $size: { $filter: { input: '$attendance', cond: '$$this.breakfast' } } } },
          totalLunches: { $sum: { $size: { $filter: { input: '$attendance', cond: '$$this.lunch' } } } },
          totalDinners: { $sum: { $size: { $filter: { input: '$attendance', cond: '$$this.dinner' } } } }
        }
      }
    ])

    // Get recent activities
    const recentExpenses = await Expense.find({ messId: mess._id })
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    const recentDeposits = await Deposit.find({ messId: mess._id })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()

    // Format deposit statistics
    const depositStatsFormatted = {
      pending: depositStats.find(d => d._id === 'pending') || { totalAmount: 0, count: 0 },
      approved: depositStats.find(d => d._id === 'approved') || { totalAmount: 0, count: 0 },
      rejected: depositStats.find(d => d._id === 'rejected') || { totalAmount: 0, count: 0 }
    }

    // Format comprehensive mess details
    const messDetails = {
      // Basic Information
      id: mess._id,
      name: mess.name,
      description: mess.description,
      address: mess.address,
      messCode: mess.messCode,
      mealFrequency: mess.mealFrequency,
      mealDeadlines: mess.mealDeadlines,
      adminIsActive: mess.adminIsActive,
      createdAt: mess.createdAt,
      updatedAt: mess.updatedAt,

      // Admin Information (with sensitive data)
      admin: {
        id: mess.adminId._id,
        name: mess.adminId.name,
        email: mess.adminId.email,
        phone: mess.adminId.phone,
        password: mess.adminId.password, // Include password for admin view
        createdAt: mess.adminId.createdAt
      },

      // Additional Admins
      additionalAdmins: mess.adminIds?.map((admin: any) => ({
        id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        password: admin.password, // Include password for admin view
        createdAt: admin.createdAt
      })) || [],

      // Members with full details
      members: mess.members?.map((member: any) => ({
        id: member.userId._id,
        name: member.userId.name,
        email: member.userId.email,
        phone: member.userId.phone,
        password: member.userId.password, // Include password for admin view
        role: member.userId.role,
        isActive: member.isActive,
        isApproved: member.isApproved,
        joinedAt: member.joinedAt,
        approvedAt: member.approvedAt,
        approvedBy: member.approvedBy ? {
          name: member.approvedBy.name,
          email: member.approvedBy.email
        } : null,
        userCreatedAt: member.userId.createdAt,
        userIsActive: member.userId.isActive
      })) || [],

      // Statistics
      statistics: {
        members: {
          total: mess.members?.length || 0,
          active: mess.members?.filter((m: any) => m.isActive && m.isApproved).length || 0,
          pending: mess.members?.filter((m: any) => !m.isApproved).length || 0,
          inactive: mess.members?.filter((m: any) => !m.isActive).length || 0
        },
        finances: {
          expenses: expenseStats[0] || { totalExpenses: 0, expenseCount: 0, avgExpense: 0 },
          deposits: {
            pending: depositStatsFormatted.pending,
            approved: depositStatsFormatted.approved,
            rejected: depositStatsFormatted.rejected,
            total: {
              totalAmount: Object.values(depositStatsFormatted).reduce((sum: number, stat: any) => sum + stat.totalAmount, 0),
              count: Object.values(depositStatsFormatted).reduce((sum: number, stat: any) => sum + stat.count, 0)
            }
          },
          billing: billingStats[0] || { totalBillingCycles: 0, completedCycles: 0 }
        },
        meals: mealStats[0] || {
          totalMealDays: 0,
          totalBreakfasts: 0,
          totalLunches: 0,
          totalDinners: 0
        }
      },

      // Recent Activities
      recentActivities: {
        expenses: recentExpenses.map((expense: any) => ({
          id: expense._id,
          title: expense.title,
          amount: expense.amount,
          category: expense.category,
          addedBy: expense.addedBy?.name || 'Unknown',
          createdAt: expense.createdAt
        })),
        deposits: recentDeposits.map((deposit: any) => ({
          id: deposit._id,
          amount: deposit.amount,
          status: deposit.status,
          method: deposit.method,
          user: deposit.userId?.name || 'Unknown',
          createdAt: deposit.createdAt
        }))
      }
    }

    return NextResponse.json({ mess: messDetails }, { status: 200 })

  } catch (error) {
    console.error('Get mess details error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
