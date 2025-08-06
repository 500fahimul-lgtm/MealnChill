'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AdminData {
  id: string
  username: string
  email: string
  role: string
  lastLogin: string
}

export function useAdminAuth() {
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      // Check localStorage first
      let token = localStorage.getItem('adminToken')
      let adminStr = localStorage.getItem('adminData')

      // Fallback to cookies
      if (!token) {
        token = getCookie('adminToken')
      }
      if (!adminStr) {
        adminStr = getCookie('adminData')
      }

      if (!token || !adminStr) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      // Validate token by making a test API call
      const response = await fetch('/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const parsedAdmin = JSON.parse(adminStr)
        setAdminData(parsedAdmin)
        setIsAuthenticated(true)
      } else {
        // Token is invalid, clear auth data
        clearAuthData()
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      clearAuthData()
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null
    }
    return null
  }

  const clearAuthData = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminData')
    if (typeof document !== 'undefined') {
      document.cookie = 'adminToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie = 'adminData=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Logout API error:', error)
    } finally {
      clearAuthData()
      setAdminData(null)
      setIsAuthenticated(false)
      router.push('/admin')
    }
  }

  return {
    adminData,
    isLoading,
    isAuthenticated,
    logout,
    checkAuthentication
  }
}
