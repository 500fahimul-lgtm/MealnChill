import connectDB from '@/lib/mongodb'
import Mess from '@/models/Mess'
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

    // Get messId from query params
    const { searchParams } = new URL(req.url)
    const messId = searchParams.get('messId')

    if (!messId) {
      return NextResponse.json(
        { message: 'messId is required' },
        { status: 400 }
      )
    }

    // Get user to verify they belong to this mess
    const user = await User.findById(userId)
    if (!user || !user.messId || user.messId.toString() !== messId) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Get mess data (only basic settings, not member details)
    const mess = await Mess.findById(messId).select('name mealFrequency mealDeadlines')
    if (!mess) {
      return NextResponse.json(
        { message: 'Mess not found' },
        { status: 404 }
      )
    }

    // Return only the settings needed for meal attendance
    const messSettings = {
      id: mess._id,
      name: mess.name,
      mealFrequency: mess.mealFrequency,
      mealDeadlines: mess.mealDeadlines || {
        breakfast: '10:00',
        lunch: '14:00',
        dinner: '20:00'
      }
    }

    return NextResponse.json({ mess: messSettings })
  } catch (error) {
    console.error('Get mess settings error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
