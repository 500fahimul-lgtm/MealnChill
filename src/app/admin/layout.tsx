'use client'

import { useAdminAuth } from '@/lib/useAdminAuth'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HomeIcon from '@mui/icons-material/Home'
import LogoutIcon from '@mui/icons-material/Logout'
import PeopleIcon from '@mui/icons-material/People'
import SettingsIcon from '@mui/icons-material/Settings'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { adminData, isLoading, isAuthenticated, logout } = useAdminAuth()

  useEffect(() => {
    // Don't check authentication for the login page
    if (pathname === '/admin') {
      return
    }

    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      router.push('/admin')
    }
  }, [pathname, isLoading, isAuthenticated, router])

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: DashboardIcon },
    { name: 'Messes', href: '/admin/messes', icon: HomeIcon },
    { name: 'Users', href: '/admin/users', icon: PeopleIcon },
    { name: 'Settings', href: '/admin/settings', icon: SettingsIcon },
  ]

  // If we're on the login page, render children directly without auth check
  if (pathname === '/admin') {
    return <>{children}</>
  }

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Show loading if not authenticated (will redirect)
  if (!isAuthenticated || !adminData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 flex z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                type="button"
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent navigation={navigation} pathname={pathname} onLogout={logout} adminData={adminData} />
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0 lg:fixed lg:inset-y-0">
        <div className="flex flex-col w-64">
          <SidebarContent navigation={navigation} pathname={pathname} onLogout={logout} adminData={adminData} />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        {/* Top bar - only visible on mobile, hidden on desktop */}
        <div className="lg:hidden sticky top-0 z-10 flex-shrink-0 flex h-16 bg-white shadow">
          <button
            type="button"
            className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <div className="flex-1 px-4 flex justify-between">
            <div className="flex-1 flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                MealNChill Web Admin
              </h1>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <span className="text-sm text-gray-700">Welcome, {adminData.username}</span>
            </div>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex sticky top-0 z-10 flex-shrink-0 h-16 bg-white shadow border-b border-gray-200">
          <div className="flex-1 px-6 flex justify-between items-center">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900">
                MealNChill Web Admin
              </h1>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700">Welcome, {adminData.username}</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarContent({ navigation, pathname, onLogout, adminData }: any) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 flex-shrink-0 px-4 bg-indigo-600">
        <Image
          src="/images/mealnchill-logo.svg"
          alt="MealNChill"
          width={32}
          height={32}
          className="h-8 w-auto"
        />
        <span className="ml-2 text-white font-semibold">Admin Panel</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <nav className="flex-1 px-2 py-4 bg-white space-y-1">
          {navigation.map((item: any) => {
            const isActive = pathname === item.href
            const IconComponent = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <IconComponent className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User info and logout */}
      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {adminData.username}
              </p>
              <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                Web Administrator
              </p>
            </div>
            <button
              onClick={onLogout}
              className="text-sm text-gray-500 hover:text-red-600 focus:outline-none"
              title="Logout"
            >
              <LogoutIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
