import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
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
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build search query
    const searchQuery: any = {}
    if (search) {
      searchQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { messCode: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ]
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit

    // Build sort object
    const sort: any = {}
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1

    // Get messes with population
    const messes = await Mess.find(searchQuery)
      .populate('adminId', 'name email phone')
      .populate('adminIds', 'name email phone')
      .populate('members.userId', 'name email phone')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()

    // Get total count for pagination
    const totalMesses = await Mess.countDocuments(searchQuery)

    // Format the response data
    const formattedMesses = messes.map(mess => ({
      id: mess._id,
      name: mess.name,
      description: mess.description,
      address: mess.address,
      messCode: mess.messCode,
      mealFrequency: mess.mealFrequency,
      mealDeadlines: mess.mealDeadlines,
      adminIsActive: mess.adminIsActive,
      admin: mess.adminId,
      admins: mess.adminIds || [],
      members: mess.members?.map((member: any) => ({
        user: member.userId,
        joinedAt: member.joinedAt,
        isActive: member.isActive,
        isApproved: member.isApproved,
        approvedAt: member.approvedAt,
        approvedBy: member.approvedBy
      })) || [],
      totalMembers: mess.members?.length || 0,
      activeMembers: mess.members?.filter((member: any) => member.isActive && member.isApproved).length || 0,
      pendingMembers: mess.members?.filter((member: any) => !member.isApproved).length || 0,
      createdAt: mess.createdAt,
      updatedAt: mess.updatedAt
    }))

    return NextResponse.json({
      messes: formattedMesses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMesses / limit),
        totalMesses,
        limit,
        hasNextPage: page < Math.ceil(totalMesses / limit),
        hasPrevPage: page > 1
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Get messes error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
