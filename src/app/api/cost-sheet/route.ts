import connectDB from '@/lib/mongodb'
import Expense from '@/models/Expense'
import MealAttendance from '@/models/MealAttendance'
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

    // Get expenses for the current month
    const currentDate = new Date()
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

    const expenses = await Expense.find({
      messId: decoded.messId,
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    }).sort({ date: -1 }).lean()

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

    // Get total meals for the current month
    const mealAttendances = await MealAttendance.find({
      messId: decoded.messId,
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    }).lean()

    // Calculate total meals (standard + extra)
    const totalMeals = mealAttendances.reduce((sum, attendance) => {
      let meals = 0
      if (attendance.isMealOn) meals += 1
      if (attendance.extraMealCount) meals += attendance.extraMealCount
      return sum + meals
    }, 0)

    // Calculate cost per meal
    const currentCostPerMeal = totalMeals > 0 ? totalExpenses / totalMeals : 0

    return NextResponse.json({
      expenses: expenses.map(expense => ({
        id: expense._id,
        itemName: expense.itemName,
        amount: expense.amount,
        date: expense.date.toISOString().split('T')[0],
        enteredByUserName: 'User' // We can populate this later if needed
      })),
      totalExpenses,
      totalMeals,
      currentCostPerMeal: Math.round(currentCostPerMeal * 100) / 100
    })
  } catch (error) {
    console.error('Error fetching cost sheet data:', error)
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
      return NextResponse.json({ message: 'Unauthorized. Admin access required.' }, { status: 403 })
    }

    const { itemName, amount, date } = await request.json()

    // Validate required fields
    if (!itemName || !amount || !date) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const expense = new Expense({
      messId: decoded.messId,
      itemName,
      amount: parseFloat(amount),
      date: new Date(date),
      enteredByUserId: decoded.userId
    })

    await expense.save()

    return NextResponse.json({
      message: 'Expense added successfully',
      expense: {
        id: expense._id,
        itemName: expense.itemName,
        amount: expense.amount,
        date: expense.date.toISOString().split('T')[0]
      }
    })
  } catch (error) {
    console.error('Error adding expense:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
