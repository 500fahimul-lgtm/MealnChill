import connectDB from '@/lib/mongodb'
import MemberSettlement from '@/models/MemberSettlement'
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { status } = await request.json()
    const resolvedParams = await params
    const settlementId = resolvedParams.id

    if (!['paid', 'refunded', 'pending_refund', 'unpaid'].includes(status)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 })
    }

    const settlement = await MemberSettlement.findOneAndUpdate(
      { _id: settlementId, messId: decoded.messId },
      { status },
      { new: true }
    )

    if (!settlement) {
      return NextResponse.json({ message: 'Settlement not found' }, { status: 404 })
    }

    return NextResponse.json({
      message: 'Settlement status updated successfully',
      settlement
    })
  } catch (error) {
    console.error('Error updating settlement status:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
