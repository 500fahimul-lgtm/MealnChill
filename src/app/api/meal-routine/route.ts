import connectDB from '@/lib/mongodb'
import MealRoutine from '@/models/MealRoutine'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    // Get token from Authorization header
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any
    const userId = decoded.userId

    // Get user and mess info
    const user = await User.findById(userId).populate('messId')
    if (!user || !user.messId) {
      return NextResponse.json(
        { message: 'User not found or not part of a mess' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { message: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const routines = await MealRoutine.find({
      messId: user.messId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      isActive: true
    }).sort({ date: 1, mealSlot: 1 })

    return NextResponse.json({
      routines: routines.map(routine => ({
        id: routine._id,
        date: routine.date.toISOString().split('T')[0],
        mealSlot: routine.mealSlot,
        mealName: routine.mealName,
        mealDescription: routine.mealDescription || ''
      }))
    })
  } catch (error) {
    console.error('Get meal routine error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    // Get token from Authorization header
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any
    const userId = decoded.userId

    // Check if user is admin
    const user = await User.findById(userId).populate('messId')
    if (!user || !user.messId || user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Only admin can create/update meal routines' },
        { status: 403 }
      )
    }

    const { 
      date, 
      mealSlot, 
      mealName, 
      mealDescription = ''
    } = await req.json()

    // Validate required fields
    if (!date || !mealSlot || !mealName) {
      return NextResponse.json(
        { message: 'Date, meal slot, and meal name are required' },
        { status: 400 }
      )
    }

    // Validate meal slot
    if (!['breakfast', 'lunch', 'dinner'].includes(mealSlot)) {
      return NextResponse.json(
        { message: 'Invalid meal slot' },
        { status: 400 }
      )
    }

    // Update or create meal routine
    const mealRoutine = await MealRoutine.findOneAndUpdate(
      {
        messId: user.messId,
        date: new Date(date),
        mealSlot: mealSlot
      },
      {
        messId: user.messId,
        date: new Date(date),
        mealSlot: mealSlot,
        mealName: mealName.trim(),
        mealDescription: mealDescription.trim(),
        isActive: true
      },
      { 
        upsert: true, 
        new: true 
      }
    )

    return NextResponse.json({
      message: 'Meal routine saved successfully',
      routine: {
        id: mealRoutine._id,
        date: mealRoutine.date.toISOString().split('T')[0],
        mealSlot: mealRoutine.mealSlot,
        mealName: mealRoutine.mealName,
        mealDescription: mealRoutine.mealDescription
      }
    })
  } catch (error) {
    console.error('Save meal routine error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
