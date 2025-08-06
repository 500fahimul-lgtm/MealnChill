import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Only apply to admin routes (except the login page itself)
  if (request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname !== '/admin') {
    const token = request.cookies.get('adminToken')?.value
    
    if (!token) {
      // Redirect to admin login if no token
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // For production, we'll do basic token validation here
    // More complex JWT verification should be done in the actual API endpoints
    // since Edge Runtime has limitations with some Node.js APIs
    try {
      // Basic token format check (Bearer tokens are typically base64)
      if (token.length < 10) {
        throw new Error('Invalid token format')
      }
      
      // Token exists and has valid format, allow the request to continue
      return NextResponse.next()
    } catch (error) {
      // Invalid token, redirect to login
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('adminToken')
      response.cookies.delete('adminData')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}
