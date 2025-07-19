import connectDB from '@/lib/mongodb'
import BillingCycle from '@/models/BillingCycle'
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

    const cycles = await BillingCycle.find({ messId: decoded.messId })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ cycles })
  } catch (error) {
    console.error('Error fetching billing cycles:', error)
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
    if (!decoded || !decoded.messId || !decoded.isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const { name, startDate, endDate } = await request.json()

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start >= end) {
      return NextResponse.json({ message: 'End date must be after start date' }, { status: 400 })
    }

    // Check for overlapping cycles
    const existingCycle = await BillingCycle.findOne({
      messId: decoded.messId,
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    })

    if (existingCycle) {
      return NextResponse.json({ message: 'Billing cycle dates overlap with existing cycle' }, { status: 400 })
    }

    const newCycle = new BillingCycle({
      messId: decoded.messId,
      name,
      startDate: start,
      endDate: end,
      status: 'active'
    })

    await newCycle.save()

    return NextResponse.json({ 
      message: 'Billing cycle created successfully',
      cycle: newCycle
    })
  } catch (error) {
    console.error('Error creating billing cycle:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
