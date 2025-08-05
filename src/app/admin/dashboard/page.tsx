'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface DashboardStats {
  overview: {
    totalUsers: number
    activeUsers: number
    inactiveUsers: number
    totalMesses: number
    activeMesses: number
    inactiveMesses: number
  }
  growth: {
    today: { users: number; messes: number }
    week: { users: number; messes: number }
    month: { users: number; messes: number }
  }
  distribution: {
    userRoles: { admins: number; members: number }
    messSizes: { small: number; medium: number; large: number; 'extra-large': number }
  }
  activity: Array<{
    date: string
    userRegistrations: number
    messCreations: number
  }>
  topMesses: Array<{
    _id: string
    name: string
    messCode: string
    memberCount: number
    activeMembers: number
  }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        router.push('/admin')
        return
      }

      const response = await fetch('/api/admin/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin')
          return
        }
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-800">{error}</div>
        <button
          onClick={fetchStats}
          className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="mt-2 text-indigo-100">
          Monitor your MealNChill platform performance and user activity
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.overview.totalUsers}
          subtitle={`${stats.overview.activeUsers} active`}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Total Messes"
          value={stats.overview.totalMesses}
          subtitle={`${stats.overview.activeMesses} active`}
          icon="🏠"
          color="green"
        />
        <StatCard
          title="New Users Today"
          value={stats.growth.today.users}
          subtitle={`${stats.growth.week.users} this week`}
          icon="📈"
          color="indigo"
        />
        <StatCard
          title="New Messes Today"
          value={stats.growth.today.messes}
          subtitle={`${stats.growth.week.messes} this week`}
          icon="🆕"
          color="purple"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Role Distribution */}
        <div className="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-4">User Distribution</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Admins</span>
                <span className="text-sm font-bold text-gray-900">
                  {stats.distribution.userRoles.admins}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${(stats.distribution.userRoles.admins / stats.overview.totalUsers) * 100}%`
                  }}
                ></div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Members</span>
                <span className="text-sm font-bold text-gray-900">
                  {stats.distribution.userRoles.members}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${(stats.distribution.userRoles.members / stats.overview.totalUsers) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Mess Size Distribution */}
        <div className="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-4">Mess Sizes</h3>
            <div className="mt-4 space-y-3">
              {Object.entries(stats.distribution.messSizes).map(([size, count]) => (
                <div key={size} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {size.replace('-', ' ')} (
                    {size === 'small' ? '≤5' : 
                     size === 'medium' ? '6-15' : 
                     size === 'large' ? '16-30' : '>30'} members)
                  </span>
                  <span className="text-sm font-bold text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Messes */}
      <div className="bg-white shadow-lg overflow-hidden sm:rounded-lg border border-gray-200">
        <div className="px-6 py-6 sm:p-6">
          <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-4">
            🏆 Top Messes by Member Count
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Mess Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Total Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Active Members
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.topMesses.map((mess, index) => (
                  <tr key={mess._id} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {mess.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                      {mess.messCode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                      {mess.memberCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                      {mess.activeMembers}
                    </td>
                  </tr>
                ))}
                {stats.topMesses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm font-medium text-gray-600">
                      No messes found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {stats.activity.length > 0 && (
        <div className="bg-white shadow-lg overflow-hidden sm:rounded-lg border border-gray-200">
          <div className="px-6 py-6 sm:p-6">
            <h3 className="text-lg leading-6 font-semibold text-gray-900 mb-4">
              📈 Recent Activity (Last 30 Days)
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {stats.activity.slice(-10).map((day) => (
                <div key={day.date} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                  <span className="text-sm font-medium text-gray-700">{day.date}</span>
                  <div className="text-sm font-medium text-gray-900">
                    {day.userRegistrations > 0 && (
                      <span className="mr-4 inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800">👥 {day.userRegistrations} users</span>
                    )}
                    {day.messCreations > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800">🏠 {day.messCreations} messes</span>
                    )}
                    {day.userRegistrations === 0 && day.messCreations === 0 && (
                      <span className="text-gray-500">No activity</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number
  subtitle: string
  icon: string
  color: 'blue' | 'green' | 'indigo' | 'purple'
}

function StatCard({ title, value, subtitle, icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-100',
    green: 'text-green-600 bg-green-100',
    indigo: 'text-indigo-600 bg-indigo-100',
    purple: 'text-purple-600 bg-purple-100'
  }

  return (
    <div className="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-md ${colorClasses[color]}`}>
              <span className="text-2xl">{icon}</span>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-700 truncate">{title}</dt>
              <dd className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</dd>
              <dd className="text-sm font-medium text-gray-600">{subtitle}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
