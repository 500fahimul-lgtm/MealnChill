import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    const { name, email, phone, password } = await req.json()

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() })
    if (existingUser) {
      return NextResponse.json(
        { message: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /\S+@\S+\.\S+/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate phone number (11 digits starting with 0 - Bangladesh format)
    const phoneRegex = /^0\d{10}$/
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      return NextResponse.json(
        { message: 'Phone number must be 11 digits starting with 0 (Bangladesh format)' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.replace(/\D/g, ''),
      password: hashedPassword,
    })

    await newUser.save()

    return NextResponse.json(
      { message: 'User registered successfully' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
