import connectDB from '@/lib/mongodb'
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

    // Get search and pagination parameters
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all' // all, active, inactive
    const role = searchParams.get('role') || 'all' // all, admin, member
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build search query
    const searchQuery: any = {}
    
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }

    if (status !== 'all') {
      searchQuery.isActive = status === 'active'
    }

    if (role !== 'all') {
      if (role === 'admin') {
        searchQuery.isAdmin = true
      } else {
        searchQuery.isAdmin = false
      }
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit

    // Build sort object
    const sort: any = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    // Get users with population
    const users = await User.find(searchQuery)
      .populate('messId', 'name messCode address')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-password') // Exclude password field
      .lean()

    // Get total count for pagination
    const totalUsers = await User.countDocuments(searchQuery)

    // Format the response data
    const formattedUsers = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      mess: user.messId ? {
        id: user.messId._id,
        name: user.messId.name,
        messCode: user.messId.messCode,
        address: user.messId.address
      } : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }))

    // Get summary statistics
    const stats = {
      totalUsers,
      activeUsers: await User.countDocuments({ isActive: true }),
      inactiveUsers: await User.countDocuments({ isActive: false }),
      admins: await User.countDocuments({ isAdmin: true }),
      members: await User.countDocuments({ isAdmin: false }),
      usersWithMess: await User.countDocuments({ messId: { $ne: null } }),
      usersWithoutMess: await User.countDocuments({ messId: null })
    }

    return NextResponse.json({
      users: formattedUsers,
      stats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        limit,
        hasNextPage: page < Math.ceil(totalUsers / limit),
        hasPrevPage: page > 1
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
