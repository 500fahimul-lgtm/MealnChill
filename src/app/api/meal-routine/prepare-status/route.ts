import connectDB from '@/lib/mongodb'
import MealRoutine from '@/models/MealRoutine'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    if (!decoded || !decoded.messId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    // Check if user is admin
    const user = await User.findById(decoded.userId)
    if (!user || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 })
    }

    const { date, mealSlot, isMealPrepared } = await request.json()

    // Validate required fields
    if (!date || !mealSlot || typeof isMealPrepared !== 'boolean') {
      return NextResponse.json({ message: 'Missing or invalid required fields' }, { status: 400 })
    }

    // First try to find existing meal routine
    let mealRoutine = await MealRoutine.findOne({
      messId: decoded.messId,
      date: new Date(date),
      mealSlot: mealSlot
    })

    // If no meal routine exists, create a default one
    if (!mealRoutine) {
      mealRoutine = new MealRoutine({
        messId: decoded.messId,
        date: new Date(date),
        mealSlot: mealSlot,
        mealName: `${mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)} Meal`,
        isActive: true,
        isMealPrepared: isMealPrepared
      })
      await mealRoutine.save()
    } else {
      // Update existing meal routine
      mealRoutine.isMealPrepared = isMealPrepared
      await mealRoutine.save()
    }

    return NextResponse.json({
      message: `Meal preparation status updated successfully`,
      meal: {
        mealSlot: mealRoutine.mealSlot,
        mealName: mealRoutine.mealName,
        isMealPrepared: mealRoutine.isMealPrepared,
        date: mealRoutine.date
      }
    })
  } catch (error) {
    console.error('Error updating meal preparation status:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
