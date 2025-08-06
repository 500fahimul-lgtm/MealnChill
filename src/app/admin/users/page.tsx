'use client'

import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import HomeIcon from '@mui/icons-material/Home'
import PeopleIcon from '@mui/icons-material/People'
import WarningIcon from '@mui/icons-material/Warning'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  phone: string
  role: string
  isAdmin: boolean
  isActive: boolean
  mess: {
    id: string
    name: string
    messCode: string
    address: string
  } | null
  createdAt: string
  updatedAt: string
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  admins: number
  members: number
  usersWithMess: number
  usersWithoutMess: number
}

interface UsersResponse {
  users: User[]
  stats: UserStats
  pagination: {
    currentPage: number
    totalPages: number
    totalUsers: number
    limit: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [pagination, setPagination] = useState<UsersResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchUsers()
  }, [currentPage, sortBy, sortOrder, searchTerm, statusFilter, roleFilter])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        router.push('/admin')
        return
      }

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        sortBy,
        sortOrder,
        status: statusFilter,
        role: roleFilter,
        ...(searchTerm && { search: searchTerm }),
      })

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin')
          return
        }
        throw new Error('Failed to fetch users')
      }

      const data: UsersResponse = await response.json()
      setUsers(data.users)
      setStats(data.stats)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchUsers()
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const viewUserDetails = (user: User) => {
    setSelectedUser(user)
    setShowDetails(true)
  }

  const viewFullProfile = async (user: User) => {
    setSelectedUser(user)
    setProfileLoading(true)
    setShowDetails(true)

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/users/${user.id}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.user)
      } else {
        console.error('Failed to fetch user profile')
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setProfileLoading(false)
    }
  }

  const handleDeleteUser = (user: User) => {
    setUserToDelete(user)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/users/${userToDelete.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        // Refresh the users list
        fetchUsers()
        setShowDeleteConfirm(false)
        setUserToDelete(null)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      setError('An error occurred while deleting user')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Users Management</h1>
        <p className="mt-2 text-blue-100">
          View and manage all users on the platform
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md bg-blue-100 text-blue-600">
                    <PeopleIcon className="h-8 w-8" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-700 truncate">Total Users</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats.totalUsers}</dd>
                    <dd className="text-sm font-medium text-gray-600">{stats.activeUsers} active</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md bg-green-100 text-green-600">
                    <AdminPanelSettingsIcon className="h-8 w-8" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-700 truncate">Admins</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats.admins}</dd>
                    <dd className="text-sm font-medium text-gray-600">{stats.members} members</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md bg-indigo-100 text-indigo-600">
                    <HomeIcon className="h-8 w-8" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-700 truncate">With Mess</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats.usersWithMess}</dd>
                    <dd className="text-sm font-medium text-gray-600">{stats.usersWithoutMess} without</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md bg-red-100 text-red-600">
                    <WarningIcon className="h-8 w-8" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-700 truncate">Inactive</dt>
                    <dd className="text-2xl font-bold text-gray-900">{stats.inactiveUsers}</dd>
                    <dd className="text-sm font-medium text-gray-600">
                      {((stats.inactiveUsers / stats.totalUsers) * 100).toFixed(1)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <form onSubmit={handleSearch} className="space-y-4 sm:space-y-0 sm:flex sm:items-end sm:space-x-4">
            <div className="sm:flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">Search</label>
              <input
                id="search"
                type="text"
                placeholder="Search by name, email, or phone..."
                className="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-900"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
              <select
                id="role"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-gray-900"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white shadow-lg overflow-hidden sm:rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-semibold text-gray-900 flex items-center">
            <PeopleIcon className="mr-2 h-5 w-5" />
            Users List
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('name')}
                >
                  User {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Role & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Mess
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  Joined {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user, index) => (
                <tr key={user.id} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-semibold text-indigo-600">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                        <div className="text-sm font-medium text-gray-600">ID: {user.id.slice(-8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.email}</div>
                    <div className="text-sm font-medium text-gray-700">{user.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isAdmin 
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isAdmin ? 'Admin' : 'Member'}
                      </span>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                    {user.mess ? (
                      <div>
                        <div className="font-semibold text-gray-900">{user.mess.name}</div>
                        <div className="text-sm font-medium text-gray-600">{user.mess.messCode}</div>
                      </div>
                    ) : (
                      <span className="italic text-gray-500">No mess</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewUserDetails(user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Basic
                      </button>
                      <button
                        onClick={() => viewFullProfile(user)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Full Profile
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.totalUsers)} of {pagination.totalUsers} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm font-medium text-gray-700">
              Page {currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showDetails && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-7xl shadow-xl rounded-xl bg-white">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {userProfile ? 'Complete User Profile' : 'User Details'}: {selectedUser.name}
              </h3>
              <button
                onClick={() => {
                  setShowDetails(false)
                  setUserProfile(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <span className="sr-only">Close</span>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {profileLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-b-3 border-indigo-600"></div>
                <p className="ml-4 text-gray-700 text-lg">Loading complete profile...</p>
              </div>
            ) : userProfile ? (
              /* Complete Profile View with Enhanced Styling */
              <div className="space-y-8">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Personal Information
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Name:</span> <span className="text-gray-800">{userProfile.name}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Email:</span> <span className="text-gray-800 text-xs">{userProfile.email}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Phone:</span> <span className="text-gray-800">{userProfile.phone}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">User ID:</span> <span className="text-gray-800 font-mono text-xs">{userProfile.id}</span></div>
                      <div className="border-t border-blue-200 pt-3">
                        <div className="mb-2"><span className="font-medium text-gray-700">Password Hash:</span></div>
                        <span className="font-mono text-xs bg-gray-100 p-2 rounded block break-all text-gray-800">{userProfile.password}</span>
                      </div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Role:</span> 
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          userProfile.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {userProfile.isAdmin ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Status:</span> 
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          userProfile.isActive 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {userProfile.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs"><span className="font-medium text-gray-700">Created:</span> <span className="text-gray-600">{new Date(userProfile.createdAt).toLocaleString()}</span></div>
                      <div className="flex justify-between text-xs"><span className="font-medium text-gray-700">Updated:</span> <span className="text-gray-600">{new Date(userProfile.updatedAt).toLocaleString()}</span></div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Mess Information
                    </h4>
                    {userProfile.mess ? (
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="font-medium text-gray-700">Mess Name:</span> <span className="text-gray-800">{userProfile.mess.name}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-gray-700">Mess Code:</span> <span className="text-gray-800 font-mono">{userProfile.mess.messCode}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-gray-700">Address:</span> <span className="text-gray-800 text-xs">{userProfile.mess.address}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-gray-700">Is Mess Admin:</span> 
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            userProfile.mess.isMessAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {userProfile.mess.isMessAdmin ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between"><span className="font-medium text-gray-700">Total Members:</span> <span className="text-gray-800">{userProfile.mess.totalMembers}</span></div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700 italic flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        User is not part of any mess
                      </div>
                    )}
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-yellow-100 p-6 rounded-xl border border-orange-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Activity Statistics
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-lg">
                          <div className="text-xs font-medium text-gray-600 mb-1">Total Meals</div>
                          <div className="text-lg font-bold text-gray-800">{userProfile.statistics.meals.totalMeals}</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg">
                          <div className="text-xs font-medium text-gray-600 mb-1">Meal Days</div>
                          <div className="text-lg font-bold text-gray-800">{userProfile.statistics.meals.totalDays}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-yellow-50 p-2 rounded text-center">
                          <div className="text-xs text-yellow-700">Breakfast</div>
                          <div className="font-bold text-yellow-800">{userProfile.statistics.meals.breakfastCount}</div>
                        </div>
                        <div className="bg-green-50 p-2 rounded text-center">
                          <div className="text-xs text-green-700">Lunch</div>
                          <div className="font-bold text-green-800">{userProfile.statistics.meals.lunchCount}</div>
                        </div>
                        <div className="bg-blue-50 p-2 rounded text-center">
                          <div className="text-xs text-blue-700">Dinner</div>
                          <div className="font-bold text-blue-800">{userProfile.statistics.meals.dinnerCount}</div>
                        </div>
                      </div>
                      <div className="border-t border-orange-200 pt-3 space-y-2">
                        <div className="flex justify-between"><span className="font-medium text-gray-700">Total Deposits:</span> <span className="text-gray-800 font-semibold">৳{userProfile.statistics.deposits.totalDeposits}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-gray-700">Approved:</span> <span className="text-green-600 font-semibold">৳{userProfile.statistics.deposits.approvedDeposits}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-gray-700">Pending:</span> <span className="text-yellow-600 font-semibold">৳{userProfile.statistics.deposits.pendingDeposits}</span></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activities with Enhanced Design */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Recent Meal Attendance
                    </h4>
                    <div className="max-h-64 overflow-y-auto">
                      {userProfile.recentActivities.meals.length > 0 ? (
                        <div className="space-y-2">
                          {userProfile.recentActivities.meals.map((meal: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2">
                              <span className="font-medium text-gray-800">{new Date(meal.date).toLocaleDateString()}</span>
                              <div className="flex space-x-2">
                                {meal.breakfast && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium">B</span>}
                                {meal.lunch && <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">L</span>}
                                {meal.dinner && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">D</span>}
                                <span className="text-gray-700 text-xs">({meal.mealsCount} meals)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-700 text-sm italic">No recent meal attendance</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Recent Deposits
                    </h4>
                    <div className="max-h-64 overflow-y-auto">
                      {userProfile.recentActivities.deposits.length > 0 ? (
                        <div className="space-y-2">
                          {userProfile.recentActivities.deposits.map((deposit: any) => (
                            <div key={deposit.id} className="flex justify-between items-center text-sm border-b border-gray-200 pb-2">
                              <div>
                                <div className="font-medium text-gray-800">৳{deposit.amount}</div>
                                <div className="text-gray-600 text-xs">{new Date(deposit.createdAt).toLocaleDateString()}</div>
                              </div>
                              <div className="text-right">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  deposit.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  deposit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {deposit.status}
                                </span>
                                <div className="text-gray-600 text-xs mt-1">{deposit.method}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-700 text-sm italic">No recent deposits</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Basic View with Improved Styling */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Personal Information
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Name:</span> <span className="text-gray-800">{selectedUser.name}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Email:</span> <span className="text-gray-800 text-xs">{selectedUser.email}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Phone:</span> <span className="text-gray-800">{selectedUser.phone}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">User ID:</span> <span className="text-gray-800 font-mono text-xs">{selectedUser.id}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Role:</span> 
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedUser.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedUser.isAdmin ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Status:</span> 
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedUser.isActive 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedUser.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Mess Information
                    </h4>
                    {selectedUser.mess ? (
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="font-medium text-gray-700">Mess Name:</span> <span className="text-gray-800">{selectedUser.mess.name}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-gray-700">Mess Code:</span> <span className="text-gray-800 font-mono">{selectedUser.mess.messCode}</span></div>
                        <div className="flex justify-between"><span className="font-medium text-gray-700">Address:</span> <span className="text-gray-800 text-xs">{selectedUser.mess.address}</span></div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-700 italic flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        User is not part of any mess
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Account Timeline
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium text-gray-700 mb-1">Account Created</div>
                  <div className="text-gray-800">{new Date(selectedUser.createdAt).toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium text-gray-700 mb-1">Last Updated</div>
                  <div className="text-gray-800">{new Date(selectedUser.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-96 shadow-2xl rounded-xl bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl leading-6 font-semibold text-gray-900 mb-4">Delete User Account</h3>
              <div className="px-2 py-3">
                <p className="text-sm text-gray-700 mb-4">
                  Are you sure you want to permanently delete <strong className="text-red-600">{userToDelete.name}</strong>'s account?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-red-700">
                    <div className="flex items-center text-red-700 mb-4">
                      <WarningIcon className="h-5 w-5 mr-2" />
                      This action cannot be undone. It will:
                    </div>
                  </p>
                  <ul className="text-xs text-red-700 mt-2 list-disc list-inside space-y-1">
                    <li>Remove the user from their mess</li>
                    <li>Delete all meal attendance records</li>
                    <li>Delete all deposit history</li>
                    <li>Remove all associated data permanently</li>
                  </ul>
                </div>
              </div>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setUserToDelete(null)
                  }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
