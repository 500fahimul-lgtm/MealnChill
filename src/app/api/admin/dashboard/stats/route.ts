import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
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

    // Get date ranges
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Get basic counts
    const [
      totalUsers,
      activeUsers,
      totalMesses,
      activeMesses,
      todayUsers,
      weekUsers,
      monthUsers,
      todayMesses,
      weekMesses,
      monthMesses
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Mess.countDocuments(),
      Mess.countDocuments({ 'members.isActive': true }),
      User.countDocuments({ createdAt: { $gte: todayStart } }),
      User.countDocuments({ createdAt: { $gte: weekStart } }),
      User.countDocuments({ createdAt: { $gte: monthStart } }),
      Mess.countDocuments({ createdAt: { $gte: todayStart } }),
      Mess.countDocuments({ createdAt: { $gte: weekStart } }),
      Mess.countDocuments({ createdAt: { $gte: monthStart } })
    ])

    // Get user role distribution
    const userRoles = await User.aggregate([
      {
        $group: {
          _id: '$isAdmin',
          count: { $sum: 1 }
        }
      }
    ])

    const roleDistribution = {
      admins: userRoles.find(r => r._id === true)?.count || 0,
      members: userRoles.find(r => r._id === false)?.count || 0
    }

    // Get mess size distribution
    const messSizes = await Mess.aggregate([
      {
        $project: {
          memberCount: { $size: '$members' }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lte: ['$memberCount', 5] }, then: 'small' },
                { case: { $lte: ['$memberCount', 15] }, then: 'medium' },
                { case: { $lte: ['$memberCount', 30] }, then: 'large' }
              ],
              default: 'extra-large'
            }
          },
          count: { $sum: 1 }
        }
      }
    ])

    const sizeDistribution = {
      small: messSizes.find(s => s._id === 'small')?.count || 0,
      medium: messSizes.find(s => s._id === 'medium')?.count || 0,
      large: messSizes.find(s => s._id === 'large')?.count || 0,
      'extra-large': messSizes.find(s => s._id === 'extra-large')?.count || 0
    }

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const dailyStats = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          userRegistrations: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])

    const messStats = await Mess.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          messCreations: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])

    // Get top messes by member count
    const topMesses = await Mess.aggregate([
      {
        $project: {
          name: 1,
          messCode: 1,
          memberCount: { $size: '$members' },
          activeMembers: {
            $size: {
              $filter: {
                input: '$members',
                cond: { $eq: ['$$this.isActive', true] }
              }
            }
          }
        }
      },
      {
        $sort: { memberCount: -1 }
      },
      {
        $limit: 10
      }
    ])

    // Combine daily stats
    const activityData = []
    const allDates = new Set([
      ...dailyStats.map(d => d._id),
      ...messStats.map(d => d._id)
    ])

    for (const date of Array.from(allDates).sort()) {
      const userStat = dailyStats.find(d => d._id === date)
      const messStat = messStats.find(d => d._id === date)
      
      activityData.push({
        date,
        userRegistrations: userStat?.userRegistrations || 0,
        messCreations: messStat?.messCreations || 0
      })
    }

    const stats = {
      overview: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalMesses,
        activeMesses,
        inactiveMesses: totalMesses - activeMesses
      },
      growth: {
        today: {
          users: todayUsers,
          messes: todayMesses
        },
        week: {
          users: weekUsers,
          messes: weekMesses
        },
        month: {
          users: monthUsers,
          messes: monthMesses
        }
      },
      distribution: {
        userRoles: roleDistribution,
        messSizes: sizeDistribution
      },
      activity: activityData,
      topMesses
    }

    return NextResponse.json({ stats }, { status: 200 })

  } catch (error) {
    console.error('Get dashboard stats error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
