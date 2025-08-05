import { getAdminStatus, syncAdminStatus } from '@/lib/adminUtils'
import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

const verifyToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return decoded
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    // Get user to find their mess
    const user = await User.findById(decoded.userId)
    if (!user || !user.messId) {
      return NextResponse.json({ message: 'User not found or not in a mess' }, { status: 404 })
    }

    // Get all users in this mess
    const messUsers = await User.find({ messId: user.messId })
    const mess = await Mess.findById(user.messId)

    if (!mess) {
      return NextResponse.json({ message: 'Mess not found' }, { status: 404 })
    }

    // Check admin status for all users
    const adminStatuses = await Promise.all(
      messUsers.map(async (messUser) => {
        const status = await getAdminStatus(messUser._id.toString(), user.messId.toString())
        return {
          userId: messUser._id,
          name: messUser.name,
          email: messUser.email,
          ...status
        }
      })
    )

    // Find inconsistencies
    const inconsistentUsers = adminStatuses.filter(status => status.inconsistencies.length > 0)
    const totalAdmins = adminStatuses.filter(status => status.isAdmin).length
    const usersWithAdminFlag = adminStatuses.filter(status => status.hasAdminFlag).length
    const usersInAdminIds = adminStatuses.filter(status => status.inAdminIds).length

    return NextResponse.json({
      message: 'Admin status check completed',
      messInfo: {
        messId: mess._id,
        messName: mess.name,
        mainAdmin: mess.adminId,
        adminIds: mess.adminIds || [],
        totalMembers: messUsers.length
      },
      summary: {
        totalAdmins,
        usersWithAdminFlag,
        usersInAdminIds,
        inconsistentUsers: inconsistentUsers.length
      },
      allUsers: adminStatuses,
      inconsistentUsers,
      recommendations: inconsistentUsers.length > 0 ? [
        'Use the /fix endpoint to automatically resolve inconsistencies',
        'Consider using centralized admin checking in all API routes'
      ] : ['Admin system is consistent']
    })

  } catch (error) {
    console.error('Error checking admin status:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    // Get user to find their mess
    const user = await User.findById(decoded.userId)
    if (!user || !user.messId) {
      return NextResponse.json({ message: 'User not found or not in a mess' }, { status: 404 })
    }

    // Check if current user is admin
    const currentAdminStatus = await getAdminStatus(decoded.userId, user.messId.toString())
    if (!currentAdminStatus.isAdmin) {
      return NextResponse.json({ message: 'Admin access required to fix inconsistencies' }, { status: 403 })
    }

    const { action, targetUserId } = await request.json()

    if (action === 'fix-all') {
      // Fix all inconsistencies in the mess
      const messUsers = await User.find({ messId: user.messId })
      const mess = await Mess.findById(user.messId)
      
      const fixResults = []

      for (const messUser of messUsers) {
        const status = await getAdminStatus(messUser._id.toString(), user.messId.toString())
        
        if (status.inconsistencies.length > 0) {
          try {
            // Use the most authoritative source to determine admin status
            const shouldBeAdmin = status.isMainAdmin || status.inAdminIds || status.hasAdminFlag
            await syncAdminStatus(messUser._id.toString(), user.messId.toString(), shouldBeAdmin)
            
            fixResults.push({
              userId: messUser._id,
              name: messUser.name,
              action: shouldBeAdmin ? 'synced as admin' : 'synced as member',
              inconsistencies: status.inconsistencies
            })
          } catch (error) {
            fixResults.push({
              userId: messUser._id,
              name: messUser.name,
              action: 'failed to sync',
              error: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }

      return NextResponse.json({
        message: 'Admin inconsistencies fixed',
        fixResults
      })

    } else if (action === 'fix-user' && targetUserId) {
      // Fix specific user
      const status = await getAdminStatus(targetUserId, user.messId.toString())
      
      if (status.inconsistencies.length === 0) {
        return NextResponse.json({ message: 'User has no inconsistencies' }, { status: 400 })
      }

      const shouldBeAdmin = status.isMainAdmin || status.inAdminIds || status.hasAdminFlag
      await syncAdminStatus(targetUserId, user.messId.toString(), shouldBeAdmin)

      return NextResponse.json({
        message: `User admin status synced as ${shouldBeAdmin ? 'admin' : 'member'}`,
        fixedInconsistencies: status.inconsistencies
      })

    } else {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error fixing admin status:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
