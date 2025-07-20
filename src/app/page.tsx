'use client'

import AnimatedIcon from '@/components/ui/AnimatedIcon'
import {
    AdminPanelSettings as AdminIcon,
    BarChart as ChartIcon,
    CheckCircle as CheckCircleIcon,
    Group as GroupIcon,
    Home as HomeIcon,
    Inventory as InventoryIcon,
    AttachMoney as MoneyIcon,
    Notifications as NotificationsIcon,
    Person as PersonIcon,
    Receipt as ReceiptIcon,
    Restaurant as RestaurantIcon,
    Settings as SettingsIcon
} from '@mui/icons-material'
import { CircularProgress } from '@mui/material'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

// Dynamic imports for better performance with SSR optimization
const MealRoutine = dynamic(() => import('@/components/MealRoutine'), {
  loading: () => <ComponentLoader text="Loading Meal Routine..." />,
  ssr: false
})
const MealAttendance = dynamic(() => import('@/components/MealAttendance'), {
  loading: () => <ComponentLoader text="Loading Meal Attendance..." />,
  ssr: false
})
const Notifications = dynamic(() => import('@/components/Notifications'), {
  loading: () => <ComponentLoader text="Loading Notifications..." />,
  ssr: false
})
const Profile = dynamic(() => import('@/components/Profile'), {
  loading: () => <ComponentLoader text="Loading Profile..." />,
  ssr: false
})
const Inventory = dynamic(() => import('@/components/Inventory'), {
  loading: () => <ComponentLoader text="Loading Inventory..." />,
  ssr: false
})
const FinancialOverview = dynamic(() => import('@/components/FinancialOverview'), {
  loading: () => <ComponentLoader text="Loading Deposit..." />,
  ssr: false
})
const Billing = dynamic(() => import('@/components/Billing'), {
  loading: () => <ComponentLoader text="Loading Billing..." />,
  ssr: false
})

const SeeMembers = dynamic(() => import('@/components/SeeMembers'), {
  loading: () => <ComponentLoader text="Loading Members..." />,
  ssr: false
})
const CostSheet = dynamic(() => import('@/components/CostSheet'), {
  loading: () => <ComponentLoader text="Loading Cost Records..." />,
  ssr: false
})
const MessSettings = dynamic(() => import('@/components/MessSettings'), {
  loading: () => <ComponentLoader text="Loading Settings..." />,
  ssr: false
})

// Loading component optimized for mobile
function ComponentLoader({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] sm:min-h-[400px] bg-white rounded-lg shadow-lg p-6 mx-2 sm:mx-0">
      <div className="animate-spin mb-3">
        <CircularProgress size={32} className="text-blue-600" />
      </div>
      <p className="text-gray-600 text-center font-medium text-sm sm:text-base">{text}</p>
      <p className="text-gray-400 text-xs sm:text-sm text-center mt-1">Please wait...</p>
    </div>
  )
}

interface User {
  id: string
  name: string
  email: string
  phone: string
  messId: string | null
  role: string
  mess?: {
    id: string
    name: string
    messCode: string
    mealFrequency: number
    adminIsActive: boolean
    isAdmin: boolean
  } | null
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeFeature, setActiveFeature] = useState<string | null>(null)
  const [featureLoading, setFeatureLoading] = useState(false)
  const [isNavVisible, setIsNavVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [dashboardStats, setDashboardStats] = useState({
    mealsTaken: 0,
    amountDue: 0,
    attendancePercentage: 0
  })
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [todayMeals, setTodayMeals] = useState<{
    breakfast: string | null
    lunch: string | null
    dinner: string | null
    dayName: string
  }>({
    breakfast: null,
    lunch: null,
    dinner: null,
    dayName: new Date().toLocaleDateString('en-US', { weekday: 'long' })
  })
  const [mealsLoading, setMealsLoading] = useState(true)
  const router = useRouter()

  // Optimized feature switching with loading state and mobile optimizations
  const handleFeatureChange = (feature: string | null) => {
    if (feature === activeFeature) return
    
    // Immediate UI feedback
    setFeatureLoading(true)
    
    // Use requestAnimationFrame for smooth transitions on mobile
    requestAnimationFrame(() => {
      setActiveFeature(feature)
      
      // Shorter timeout for better perceived performance
      setTimeout(() => {
        setFeatureLoading(false)
      }, 50)
    })
    
    // Scroll to top on mobile when switching features
    if (window.innerWidth < 640) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) {
          // Show login/register options if no token
          setIsLoading(false)
          return
        }

        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const userData = await response.json()
          setUser(userData.user)
          
          // Fetch dashboard stats after user data is loaded
          if (userData.user.mess) {
            fetchDashboardStats(userData.user.mess.id, userData.user.id, token)
            fetchTodayMeals(token)
            fetchUnreadNotificationCount(token)
          }
        } else {
          localStorage.removeItem('token')
          // Don't redirect, just show login options
          setUser(null)
        }
      } catch (error) {
        localStorage.removeItem('token')
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  // Scroll detection for bottom navigation animation
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const scrollDifference = Math.abs(currentScrollY - lastScrollY)
      
      // Only trigger if scroll difference is significant (prevents jitter)
      if (scrollDifference < 10) return
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down - hide nav
        setIsNavVisible(false)
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show nav
        setIsNavVisible(true)
      }
      
      setLastScrollY(currentScrollY)
    }

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  const fetchDashboardStats = async (messId: string, userId: string, token: string) => {
    setStatsLoading(true)
    try {
      // Get current month's meal attendance
      const currentDate = new Date()
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const attendanceResponse = await fetch(`/api/meal-attendance?userId=${userId}&startDate=${firstDayOfMonth.toISOString()}&endDate=${lastDayOfMonth.toISOString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        const totalMeals = attendanceData.attendance?.length || 0
        
        // Calculate total possible meals for the month (only count days up to today)
        const today = new Date()
        const daysToCount = today > lastDayOfMonth ? lastDayOfMonth.getDate() : today.getDate()
        const mealFrequency = 2 // Default to 2 meals per day
        const totalPossibleMeals = daysToCount * mealFrequency
        
        const attendancePercentage = totalPossibleMeals > 0 ? Math.round((totalMeals / totalPossibleMeals) * 100) : 0

        setDashboardStats({
          mealsTaken: totalMeals,
          amountDue: totalMeals * 50, // 50 BDT per meal
          attendancePercentage
        })
      }
    } catch (error) {
      // Set default values if fetch fails
      setDashboardStats({
        mealsTaken: 0,
        amountDue: 0,
        attendancePercentage: 0
      })
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchTodayMeals = async (token: string) => {
    setMealsLoading(true)
    try {
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      
      const response = await fetch(`/api/meal-routine?startDate=${todayStr}&endDate=${todayStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const routines = data.routines || []
        
        // Group routines by meal slot
        const mealsBySlot = routines.reduce((acc: any, routine: any) => {
          acc[routine.mealSlot] = routine.mealName
          return acc
        }, {})
        
        const dayName = today.toLocaleDateString('en-US', { weekday: 'long' })
        
        setTodayMeals({
          breakfast: mealsBySlot.breakfast || null,
          lunch: mealsBySlot.lunch || null,
          dinner: mealsBySlot.dinner || null,
          dayName
        })
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setMealsLoading(false)
    }
  }

  const fetchUnreadNotificationCount = async (token: string) => {
    try {
      const response = await fetch('/api/notifications?filter=unread', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        const unreadCount = data.notifications?.length || 0
        setUnreadNotificationCount(unreadCount)
      }
    } catch (error) {
      setUnreadNotificationCount(0)
    }
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout? You will be redirected to the login page.')) {
      localStorage.removeItem('token')
      setUser(null)
      setActiveFeature(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Show login/register options if user is not authenticated
  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">MealNChill</h1>
            <p className="text-gray-600">Your Meal Management System</p>
          </div>
          
          <div className="space-y-4">
            <Link 
              href="/auth/login"
              className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 transition-colors text-center block"
            >
              Login to Your Account
            </Link>
            
            <Link 
              href="/auth/register"
              className="w-full bg-white text-primary-600 py-3 px-4 rounded-lg font-medium border-2 border-primary-600 hover:bg-primary-50 transition-colors text-center block"
            >
              Create New Account
            </Link>
          </div>
          
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Welcome to MealNChill - Manage your mess meals efficiently</p>
          </div>
        </div>
      </main>
    )
  }

  if (!user.mess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-orange-100 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-xl p-8 m-4 max-w-md text-center">
          <div className="text-slate-400 mb-4">
            <HomeIcon sx={{ fontSize: 80 }} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-4">No Mess Found</h2>
          <p className="text-slate-600 mb-6">You need to join or create a mess to access the dashboard.</p>
          <Link 
            href="/mess-setup"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors inline-block"
          >
            Setup Mess
          </Link>
        </div>
      </div>
    )
  }

  // If a specific feature is active, show only that feature
  if (activeFeature && user.mess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-orange-100">
        {/* Mobile Header */}
        <header className="bg-white/70 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setActiveFeature(null)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="hidden sm:block">Dashboard</span>
                </button>
                <div className="h-6 w-px bg-slate-300 hidden sm:block"></div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  MealNChill
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-sm text-slate-600">Welcome back</p>
                  <p className="text-sm font-medium text-slate-800">{user.name}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Feature Content */}
        <main className="px-4 sm:px-6 lg:px-8 py-6 pb-20 sm:pb-6">
          <div className="max-w-7xl mx-auto">
            {activeFeature === 'meal-routine' && (
              <MealRoutine 
                messId={user.mess.id} 
                isAdmin={user.mess.isAdmin} 
                mealFrequency={user.mess.mealFrequency}
              />
            )}
            {activeFeature === 'meal-attendance' && (
              <MealAttendance 
                messId={user.mess.id} 
                userId={user.id}
                mealFrequency={user.mess.mealFrequency}
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'notifications' && (
              <Notifications 
                messId={user.mess.id} 
                userId={user.id}
                onNotificationRead={() => {
                  const token = localStorage.getItem('token')
                  if (token) fetchUnreadNotificationCount(token)
                }}
              />
            )}
            {activeFeature === 'my-profile' && (
              <Profile />
            )}
            {activeFeature === 'inventory' && (
              <Inventory 
                messId={user.mess.id} 
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'financial-overview' && (
              <FinancialOverview 
                messId={user.mess.id}
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'billing' && (
              <Billing 
                messId={user.mess.id} 
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'see-members' && (
              <SeeMembers 
                messId={user.mess.id}
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'cost-sheet' && (
              <CostSheet 
                messId={user.mess.id}
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'mess-settings' && user.mess.isAdmin && (
              <MessSettings 
                messId={user.mess.id}
                isAdmin={user.mess.isAdmin}
              />
            )}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className={`fixed bottom-0 left-0 right-0 z-40 sm:hidden transition-transform duration-500 ease-out ${
          isNavVisible ? 'translate-y-0' : 'translate-y-full'
        }`}>
          <div className="bg-white/80 backdrop-blur-xl border-t border-gradient-to-r from-pink-200/60 via-purple-200/60 to-cyan-200/60 shadow-2xl">
            <div className="flex items-center justify-around py-1 px-2 bg-gradient-to-r from-transparent via-white/10 to-transparent">
              <BottomNavItem
                icon={<AnimatedIcon type="home" isActive={!activeFeature} />}
                label="Dashboard"
                isActive={!activeFeature}
                onClick={() => setActiveFeature(null)}
              />
              <BottomNavItem
                icon={<AnimatedIcon type="restaurant" isActive={activeFeature === 'meal-routine'} />}
                label="Routine"
                isActive={activeFeature === 'meal-routine'}
                onClick={() => setActiveFeature('meal-routine')}
              />
              <BottomNavItem
                icon={<AnimatedIcon type="check" isActive={activeFeature === 'meal-attendance'} />}
                label="Attendance"
                isActive={activeFeature === 'meal-attendance'}
                onClick={() => setActiveFeature('meal-attendance')}
              />
              <BottomNavItem
                icon={<AnimatedIcon type="notifications" isActive={activeFeature === 'notifications'} />}
                label="Notifications"
                isActive={activeFeature === 'notifications'}
                onClick={() => setActiveFeature('notifications')}
                badge={unreadNotificationCount > 0 ? unreadNotificationCount.toString() : undefined}
              />
              <BottomNavItem
                icon={<AnimatedIcon type="person" isActive={activeFeature === 'my-profile'} />}
                label="Profile"
                isActive={activeFeature === 'my-profile'}
                onClick={() => setActiveFeature('my-profile')}
              />
            </div>
          </div>
        </nav>

        {/* Add bottom padding to main content on mobile to account for bottom nav */}
        <div className="h-16 sm:hidden"></div>
      </div>
    )
  }

  // Main Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-orange-100">
      {/* Mobile Header */}
      <header className="bg-white/70 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="px-4 sm:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MC</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                MealNChill
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm text-slate-600">Welcome back</p>
                <p className="text-sm font-medium text-slate-800">{user.name}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 py-6 pb-20 sm:pb-6">
        <div className="max-w-7xl mx-auto">
          {!activeFeature && (
            <>
              {/* Hero Section */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-lg border border-amber-200/50 p-6 sm:p-8 mb-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
                  <div className="mb-4 sm:mb-0">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-2">
                      Welcome to your Dashboard
                    </h2>
                    <p className="text-slate-600 mb-3">
                      Managing meals for <span className="font-semibold text-blue-600">{user.mess.name}</span>
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                        Code: {user.mess.messCode}
                      </div>
                      <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                        {user.mess.mealFrequency === 2 ? '2 Meals/day' : '3 Meals/day'}
                      </div>
                      {user.mess.isAdmin && (
                        <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                          Admin Access
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <RestaurantIcon sx={{ fontSize: 32, color: 'white' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Grid - Hidden on mobile since they're in bottom nav */}
              <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <QuickActionCard
                  title="Meal Routine"
                  icon={<RestaurantIcon />}
                  color="from-blue-500 to-blue-600"
                  onClick={() => handleFeatureChange('meal-routine')}
                />
                <QuickActionCard
                  title="Attendance"
                  icon={<CheckCircleIcon />}
                  color="from-green-500 to-green-600"
                  onClick={() => handleFeatureChange('meal-attendance')}
                />
                <QuickActionCard
                  title="Profile"
                  icon={<PersonIcon />}
                  color="from-purple-500 to-purple-600"
                  onClick={() => handleFeatureChange('my-profile')}
                />
                <QuickActionCard
                  title="Notifications"
                  icon={<NotificationsIcon />}
                  color="from-orange-500 to-orange-600"
                  onClick={() => setActiveFeature('notifications')}
                  badge={unreadNotificationCount > 0 ? unreadNotificationCount.toString() : undefined}
                />
              </div>

              {/* Main Features */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Today's Meals */}
                <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Today's Meals</h3>
                    <span className="text-blue-600 text-sm font-medium bg-blue-50 px-3 py-1 rounded-full">
                      {todayMeals.dayName}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {mealsLoading ? (
                      <>
                        <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-amber-200/50">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
                            <div>
                              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse mb-1"></div>
                              <div className="h-3 w-12 bg-slate-200 rounded animate-pulse"></div>
                            </div>
                          </div>
                          <div className="h-6 w-16 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-amber-200/50">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
                            <div>
                              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse mb-1"></div>
                              <div className="h-3 w-12 bg-slate-200 rounded animate-pulse"></div>
                            </div>
                          </div>
                          <div className="h-6 w-16 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-amber-200/50">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
                            <div>
                              <div className="h-4 w-16 bg-slate-200 rounded animate-pulse mb-1"></div>
                              <div className="h-3 w-12 bg-slate-200 rounded animate-pulse"></div>
                            </div>
                          </div>
                          <div className="h-6 w-16 bg-slate-200 rounded animate-pulse"></div>
                        </div>
                      </>
                    ) : (
                      <>
                        <TodayMealCard 
                          time="08:00 AM" 
                          meal="Breakfast" 
                          menuItem={todayMeals.breakfast}
                        />
                        <TodayMealCard 
                          time="01:00 PM" 
                          meal="Lunch" 
                          menuItem={todayMeals.lunch}
                        />
                        <TodayMealCard 
                          time="08:00 PM" 
                          meal="Dinner" 
                          menuItem={todayMeals.dinner}
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">This Month</h3>
                  <div className="space-y-4">
                    <StatItem 
                      label="Meals Taken" 
                      value={dashboardStats.mealsTaken.toString()} 
                      icon={<RestaurantIcon />} 
                      loading={statsLoading}
                    />
                    <StatItem 
                      label="Amount Due" 
                      value={`৳${dashboardStats.amountDue.toLocaleString()}`} 
                      icon={<MoneyIcon />} 
                      loading={statsLoading}
                    />
                    <StatItem 
                      label="Attendance" 
                      value={`${dashboardStats.attendancePercentage}%`} 
                      icon={<ChartIcon />} 
                      loading={statsLoading}
                    />
                  </div>
                </div>
              </div>

              {/* Admin Tools / Mess Management Tools */}
              <div className={`rounded-2xl shadow-lg border p-6 mb-8 ${
                user.mess.isAdmin 
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200' 
                  : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
              }`}>
                <div className="flex items-center mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                    user.mess.isAdmin ? 'bg-amber-500' : 'bg-blue-500'
                  }`}>
                    <AdminIcon sx={{ fontSize: 16, color: 'white' }} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {user.mess.isAdmin ? 'Admin Tools' : 'Mess Management'}
                  </h3>
                  {!user.mess.isAdmin && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                      View Only
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <AdminTool icon={<InventoryIcon />} title="Inventory" onClick={() => handleFeatureChange('inventory')} isAdmin={user.mess.isAdmin} />
                  <AdminTool icon={<MoneyIcon />} title="Deposit" onClick={() => handleFeatureChange('financial-overview')} isAdmin={user.mess.isAdmin} />
                  <AdminTool icon={<ReceiptIcon />} title="Billing" onClick={() => handleFeatureChange('billing')} isAdmin={user.mess.isAdmin} />
                  <AdminTool icon={<GroupIcon />} title="Members" onClick={() => handleFeatureChange('see-members')} isAdmin={user.mess.isAdmin} />
                  <AdminTool icon={<ChartIcon />} title="Cost Records" onClick={() => handleFeatureChange('cost-sheet')} isAdmin={user.mess.isAdmin} />
                  {user.mess.isAdmin && (
                    <AdminTool icon={<SettingsIcon />} title="Settings" onClick={() => handleFeatureChange('mess-settings')} isAdmin={user.mess.isAdmin} />
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-amber-200/50 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  <ActivityItem
                    icon={<CheckCircleIcon />}
                    title="Marked attendance for lunch"
                    time="2 hours ago"
                    color="text-green-600"
                  />
                  <ActivityItem
                    icon={<RestaurantIcon />}
                    title="Meal routine updated for tomorrow"
                    time="5 hours ago"
                    color="text-blue-600"
                  />
                  <ActivityItem
                    icon={<MoneyIcon />}
                    title="Monthly bill generated"
                    time="1 day ago"
                    color="text-purple-600"
                  />
                </div>
              </div>
            </>
          )}

          {/* Feature Content */}
          <div className="relative min-h-[200px]">
            {featureLoading && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="animate-spin mb-2">
                    <CircularProgress size={24} className="text-blue-600" />
                  </div>
                  <p className="text-gray-600 text-sm font-medium">Loading...</p>
                </div>
              </div>
            )}
            
            {activeFeature === 'meal-routine' && (
              <MealRoutine 
                messId={user.mess.id} 
                isAdmin={user.mess.isAdmin} 
                mealFrequency={user.mess.mealFrequency}
              />
            )}
            {activeFeature === 'meal-attendance' && (
              <MealAttendance 
                messId={user.mess.id} 
                userId={user.id}
                mealFrequency={user.mess.mealFrequency}
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'notifications' && (
              <Notifications 
                messId={user.mess.id} 
                userId={user.id}
                onNotificationRead={() => {
                  const token = localStorage.getItem('token')
                  if (token) fetchUnreadNotificationCount(token)
                }}
              />
            )}
            {activeFeature === 'my-profile' && (
              <Profile />
            )}
            {activeFeature === 'inventory' && (
              <Inventory 
                messId={user.mess.id} 
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'financial-overview' && (
              <FinancialOverview 
                messId={user.mess.id}
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'billing' && (
              <Billing 
                messId={user.mess.id} 
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'see-members' && (
              <SeeMembers 
                messId={user.mess.id}
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'cost-sheet' && (
              <CostSheet 
                messId={user.mess.id}
                isAdmin={user.mess.isAdmin}
              />
            )}
            {activeFeature === 'mess-settings' && user.mess.isAdmin && (
              <MessSettings 
                messId={user.mess.id}
                isAdmin={user.mess.isAdmin}
              />
            )}
            
            {/* Show access denied message for non-admin users trying to access admin-only features */}
            {activeFeature === 'mess-settings' && !user.mess.isAdmin && (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SettingsIcon sx={{ fontSize: 32, color: '#64748b' }} />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 mb-2">Admin Access Required</h3>
                <p className="text-slate-600 mb-4">You need admin privileges to access Settings.</p>
                <button 
                  onClick={() => setActiveFeature(null)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className={`fixed bottom-0 left-0 right-0 z-40 sm:hidden transition-transform duration-500 ease-out ${
        isNavVisible ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="bg-white/80 backdrop-blur-xl border-t border-gradient-to-r from-pink-200/60 via-purple-200/60 to-cyan-200/60 shadow-2xl navbar-shimmer">
          <div className="flex items-center justify-around py-1 px-2 bg-gradient-to-r from-transparent via-white/10 to-transparent">
            <BottomNavItem
              icon={<AnimatedIcon type="home" isActive={!activeFeature} />}
              label="Dashboard"
              isActive={!activeFeature}
              onClick={() => handleFeatureChange(null)}
            />
            <BottomNavItem
              icon={<AnimatedIcon type="restaurant" isActive={activeFeature === 'meal-routine'} />}
              label="Routine"
              isActive={activeFeature === 'meal-routine'}
              onClick={() => handleFeatureChange('meal-routine')}
            />
            <BottomNavItem
              icon={<AnimatedIcon type="check" isActive={activeFeature === 'meal-attendance'} />}
              label="Attendance"
              isActive={activeFeature === 'meal-attendance'}
              onClick={() => handleFeatureChange('meal-attendance')}
            />
            <BottomNavItem
              icon={<AnimatedIcon type="notifications" isActive={activeFeature === 'notifications'} />}
              label="Notifications"
              isActive={activeFeature === 'notifications'}
              onClick={() => handleFeatureChange('notifications')}
              badge={unreadNotificationCount > 0 ? unreadNotificationCount.toString() : undefined}
            />
            <BottomNavItem
              icon={<AnimatedIcon type="person" isActive={activeFeature === 'my-profile'} />}
              label="Profile"
              isActive={activeFeature === 'my-profile'}
              onClick={() => handleFeatureChange('my-profile')}
            />
          </div>
        </div>
      </nav>

      {/* Add bottom padding to main content on mobile to account for bottom nav */}
      <div className="h-16 sm:hidden"></div>
    </div>
  )
}

// Component definitions
function QuickActionCard({ title, icon, color, onClick, badge }: {
  title: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative bg-white/75 backdrop-blur-sm hover:bg-white/90 rounded-2xl shadow-lg border border-amber-200/60 p-6 transition-all hover:scale-105 group text-center"
    >
      <div className={`w-14 h-14 bg-gradient-to-r ${color} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-md`}>
        <span className="text-white text-2xl">{icon}</span>
      </div>
      <h3 className="font-semibold text-slate-800 text-sm leading-tight">{title}</h3>
      {badge && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg">
          {badge}
        </div>
      )}
    </button>
  )
}

function TodayMealCard({ time, meal, menuItem }: { time: string; meal: string; menuItem: string | null }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-amber-200/50">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg flex items-center justify-center">
          <RestaurantIcon sx={{ fontSize: 20, color: '#d97706' }} />
        </div>
        <div>
          <p className="font-medium text-slate-800">{meal}</p>
          <p className="text-sm text-slate-500">{time}</p>
        </div>
      </div>
      <div className="text-right max-w-[150px]">
        {menuItem ? (
          <p className="text-sm font-medium text-slate-700 truncate" title={menuItem}>
            {menuItem}
          </p>
        ) : (
          <p className="text-sm text-slate-400 italic">No menu set</p>
        )}
      </div>
    </div>
  )
}

function StatItem({ label, value, icon, loading }: { label: string; value: string; icon: React.ReactNode; loading?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="text-slate-600">{icon}</span>
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      {loading ? (
        <div className="h-4 w-16 bg-slate-200 rounded animate-pulse"></div>
      ) : (
        <span className="font-semibold text-slate-800">{value}</span>
      )}
    </div>
  )
}

function AdminTool({ icon, title, onClick, isAdmin = true }: { icon: React.ReactNode; title: string; onClick: () => void; isAdmin?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-4 bg-white/70 hover:bg-white/90 rounded-xl border transition-all hover:scale-105 group text-center min-h-[80px] ${
        isAdmin ? 'border-amber-300' : 'border-blue-300'
      }`}
    >
      <span className="text-slate-600 mb-2 group-hover:scale-110 transition-transform">{icon}</span>
      <span className="text-xs font-medium text-slate-700 leading-tight">{title}</span>
      {!isAdmin && (
        <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}
    </button>
  )
}

function ActivityItem({ icon, title, time, color }: {
  icon: React.ReactNode;
  title: string;
  time: string;
  color: string;
}) {
  return (
    <div className="flex items-center space-x-3 p-2">
      <div className={`w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center ${color}`}>
        <span className="text-sm">{icon}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{time}</p>
      </div>
    </div>
  )
}

function BottomNavItem({ icon, label, isActive, onClick, badge }: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badge?: string;
}) {
  const getActiveColor = () => {
    switch (label.toLowerCase()) {
      case 'dashboard': return 'text-orange-500'
      case 'routine': return 'text-green-500'
      case 'attendance': return 'text-blue-500'
      case 'notifications': return 'text-purple-500'
      case 'profile': return 'text-cyan-500'
      default: return 'text-blue-500'
    }
  }

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center py-3 px-1 min-w-[50px] transition-all duration-500 ease-out transform hover:scale-105 ${
        isActive 
          ? `${getActiveColor()} scale-105` 
          : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      <div className="relative mb-1">
        <div className="flex items-center justify-center">
          {icon}
        </div>
        {badge && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-400 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold text-[10px] animate-bounce shadow-lg border-2 border-white">
            {badge}
          </div>
        )}
      </div>
      <span className={`text-[10px] font-medium transition-all duration-500 ${
        isActive ? `${getActiveColor()} font-bold tracking-wider` : 'text-slate-400'
      }`}>
        {label}
      </span>
      
      {/* Active indicator line */}
      {isActive && (
        <div className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 rounded-full ${
          getActiveColor().replace('text-', 'bg-')
        } animate-pulse`}></div>
      )}
    </button>
  )
}
