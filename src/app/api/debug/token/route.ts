import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token } = body
    
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 400 })
    }
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      return NextResponse.json({
        success: true,
        decoded,
        message: 'Token is valid'
      })
    } catch (error: any) {
      console.error('Debug API - Token verification failed:', error.message)
      return NextResponse.json({
        success: false,
        error: error.message,
        message: 'Token verification failed'
      })
    }
  } catch (error) {
    console.error('Debug API - General error:', error)
    return NextResponse.json({ message: 'Server error' }, { status: 500 })
  }
}
