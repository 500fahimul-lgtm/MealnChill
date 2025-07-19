import connectDB from '@/lib/mongodb'
import InventoryRecord from '@/models/InventoryRecord'
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
    if (!decoded || !decoded.messId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const itemId = searchParams.get('itemId')
    const skip = (page - 1) * limit

    // Build query
    let query: any = { messId: decoded.messId }
    if (itemId) {
      query.inventoryItemId = itemId
    }

    // Get records with pagination
    const records = await InventoryRecord.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('performedBy', 'name')
      .lean()

    // Get total count for pagination
    const totalRecords = await InventoryRecord.countDocuments(query)
    const totalPages = Math.ceil(totalRecords / limit)

    // Format records with user names
    const formattedRecords = records.map(record => ({
      ...record,
      performedByName: record.performedBy?.name || record.performedByName || 'Unknown User'
    }))

    return NextResponse.json({
      records: formattedRecords,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        hasMore: page < totalPages
      }
    })
  } catch (error) {
    console.error('Error fetching inventory records:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
