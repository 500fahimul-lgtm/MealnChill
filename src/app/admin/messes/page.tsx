'use client'

import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import HomeIcon from '@mui/icons-material/Home'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import PeopleIcon from '@mui/icons-material/People'
import PersonIcon from '@mui/icons-material/Person'
import WarningIcon from '@mui/icons-material/Warning'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Mess {
  id: string
  name: string
  description: string
  address: string
  messCode: string
  mealFrequency: number
  mealDeadlines: {
    breakfast: string
    lunch: string
    dinner: string
  }
  adminIsActive: boolean
  admin: {
    _id: string
    name: string
    email: string
    phone: string
  }
  admins: Array<{
    _id: string
    name: string
    email: string
    phone: string
  }>
  members: Array<{
    user: {
      _id: string
      name: string
      email: string
      phone: string
    }
    joinedAt: string
    isActive: boolean
    isApproved: boolean
    approvedAt?: string
    approvedBy?: string
  }>
  totalMembers: number
  activeMembers: number
  pendingMembers: number
  createdAt: string
  updatedAt: string
}

interface MessesResponse {
  messes: Mess[]
  pagination: {
    currentPage: number
    totalPages: number
    totalMesses: number
    limit: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export default function AdminMesses() {
  const [messes, setMesses] = useState<Mess[]>([])
  const [pagination, setPagination] = useState<MessesResponse['pagination'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [selectedMess, setSelectedMess] = useState<Mess | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [messDetails, setMessDetails] = useState<any>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [messToDelete, setMessToDelete] = useState<Mess | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchMesses()
  }, [currentPage, sortBy, sortOrder, searchTerm])

  const handleViewDetails = async (mess: Mess) => {
    setSelectedMess(mess)
    setShowDetails(true)
    setDetailsLoading(true)
    
    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/messes/${mess.id}/details`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMessDetails(data.mess)
      }
    } catch (error) {
      console.error('Error fetching mess details:', error)
    } finally {
      setDetailsLoading(false)
    }
  }

  const handleDeleteMess = (mess: Mess) => {
    setMessToDelete(mess)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteMess = async () => {
    if (!messToDelete) return

    try {
      const token = localStorage.getItem('adminToken')
      const response = await fetch(`/api/admin/messes/${messToDelete.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setMesses(messes.filter(mess => mess.id !== messToDelete.id))
        setShowDeleteConfirm(false)
        setMessToDelete(null)
        alert('Mess deleted successfully')
      } else {
        const error = await response.json()
        alert(`Failed to delete mess: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting mess:', error)
      alert('Failed to delete mess')
    }
  }

  const fetchMesses = async () => {
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
        ...(searchTerm && { search: searchTerm }),
      })

      const response = await fetch(`/api/admin/messes?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin')
          return
        }
        throw new Error('Failed to fetch messes')
      }

      const data: MessesResponse = await response.json()
      setMesses(data.messes)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching messes:', error)
      setError('Failed to load messes')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchMesses()
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
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Messes Management</h1>
        <p className="mt-2 text-green-100">
          View and manage all mess facilities on the platform
        </p>
      </div>

      {/* Stats Cards */}
      {pagination && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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
                    <dt className="text-sm font-medium text-gray-700 truncate">Total Messes</dt>
                    <dd className="text-2xl font-bold text-gray-900">{pagination.totalMesses}</dd>
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
                    <PeopleIcon className="h-8 w-8" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-700 truncate">Total Members</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {messes.reduce((sum, mess) => sum + mess.totalMembers, 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200">
            <div className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="p-3 rounded-md bg-yellow-100 text-yellow-600">
                    <HourglassEmptyIcon className="h-8 w-8" />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-700 truncate">Pending Approvals</dt>
                    <dd className="text-2xl font-bold text-gray-900">
                      {messes.reduce((sum, mess) => sum + mess.pendingMembers, 0)}
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
          <form onSubmit={handleSearch} className="sm:flex sm:items-center">
            <div className="w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Search messes..."
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md text-gray-900"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto"
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

      {/* Messes Table */}
      <div className="bg-white shadow-lg overflow-hidden sm:rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-semibold text-gray-900 flex items-center">
            <HomeIcon className="mr-2 h-5 w-5" />
            Messes List
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
                  Mess Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Admin
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalMembers')}
                >
                  Members {sortBy === 'totalMembers' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Meal Frequency
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('createdAt')}
                >
                  Created {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {messes.map((mess, index) => (
                <tr key={mess.id} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{mess.name}</div>
                      <div className="text-sm font-medium text-gray-600 truncate max-w-xs">{mess.address}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {mess.messCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{mess.admin.name}</div>
                      <div className="text-sm font-medium text-gray-700">{mess.admin.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                    <div>
                      <div className="font-semibold text-gray-900">{mess.activeMembers}/{mess.totalMembers}</div>
                      {mess.pendingMembers > 0 && (
                        <div className="text-xs font-medium text-yellow-600">{mess.pendingMembers} pending</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                    {mess.mealFrequency} meals/day
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                    {new Date(mess.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(mess)}
                        className="text-indigo-600 hover:text-indigo-900 font-medium"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleDeleteMess(mess)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {messes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm font-medium text-gray-600">
                    No messes found
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
            Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.totalMesses)} of {pagination.totalMesses} results
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

      {/* Enhanced Mess Details Modal */}
      {showDetails && selectedMess && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-11/12 max-w-7xl shadow-xl rounded-xl bg-white">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                {messDetails ? 'Complete Mess Overview' : 'Mess Details'}: {selectedMess.name}
              </h3>
              <button
                onClick={() => {
                  setShowDetails(false)
                  setMessDetails(null)
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <span className="sr-only">Close</span>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {detailsLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-b-3 border-indigo-600"></div>
                <p className="ml-4 text-gray-700 text-lg">Loading comprehensive information...</p>
              </div>
            ) : messDetails ? (
              /* Comprehensive Mess Overview with Enhanced Styling */
              <div className="space-y-8">
                {/* Basic Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Mess Information
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Name:</span> <span className="text-gray-800">{messDetails.name}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Code:</span> <span className="text-gray-800 font-mono">{messDetails.messCode}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Address:</span> <span className="text-gray-800 text-xs">{messDetails.address}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Description:</span> <span className="text-gray-800 text-xs">{messDetails.description || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Meal Frequency:</span> <span className="text-gray-800">{messDetails.mealFrequency} meals/day</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Admin Participation:</span> 
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          messDetails.adminIsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {messDetails.adminIsActive ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="border-t border-blue-200 pt-3 space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-600">Created:</span> <span className="text-gray-700">{messDetails.createdAt ? new Date(messDetails.createdAt).toLocaleDateString() : 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">Updated:</span> <span className="text-gray-700">{messDetails.updatedAt ? new Date(messDetails.updatedAt).toLocaleDateString() : 'N/A'}</span></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Member Statistics
                    </h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-gray-800">{messDetails.statistics.members.total}</div>
                          <div className="text-xs text-gray-600">Total Members</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">{messDetails.statistics.members.active}</div>
                          <div className="text-xs text-gray-600">Active</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-yellow-600">{messDetails.statistics.members.pending}</div>
                          <div className="text-xs text-gray-600">Pending</div>
                        </div>
                        <div className="bg-white p-3 rounded-lg text-center">
                          <div className="text-lg font-bold text-purple-600">{messDetails.statistics?.members?.admins || 0}</div>
                          <div className="text-xs text-gray-600">Admins</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-yellow-100 p-6 rounded-xl border border-orange-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Financial Overview
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600">Total Deposits</span>
                          <span className="font-bold text-gray-800">৳{messDetails.statistics?.finances?.totalDeposits || 0}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-green-600">✓ Approved: ৳{messDetails.statistics?.finances?.approvedDeposits || 0}</div>
                          <div className="text-yellow-600 flex items-center">
                            <HourglassEmptyIcon className="h-4 w-4 mr-1" />
                            Pending: ৳{messDetails.statistics?.finances?.pendingDeposits || 0}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between mb-2">
                          <span className="text-gray-600">Total Expenses</span>
                          <span className="font-bold text-red-600">৳{messDetails.statistics?.finances?.totalExpenses || 0}</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between">
                          <span className="text-gray-700 font-medium">Current Balance</span>
                          <span className={`font-bold ${(messDetails.statistics?.finances?.currentBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ৳{messDetails.statistics?.finances?.currentBalance || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meal Configuration */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Meal Schedule & Deadlines
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {messDetails.mealFrequency === 3 && messDetails.mealDeadlines?.breakfast && (
                      <div className="bg-yellow-50 p-4 rounded-lg text-center border border-yellow-200">
                        <div className="text-yellow-800 font-semibold mb-2">🌅 Breakfast</div>
                        <div className="text-gray-800 font-mono text-lg">{messDetails.mealDeadlines.breakfast}</div>
                      </div>
                    )}
                    {messDetails.mealDeadlines?.lunch && (
                      <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                        <div className="text-green-800 font-semibold mb-2">🌞 Lunch</div>
                        <div className="text-gray-800 font-mono text-lg">{messDetails.mealDeadlines.lunch}</div>
                      </div>
                    )}
                    {messDetails.mealDeadlines?.dinner && (
                      <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                        <div className="text-blue-800 font-semibold mb-2">🌙 Dinner</div>
                        <div className="text-gray-800 font-mono text-lg">{messDetails.mealDeadlines.dinner}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activities with Enhanced Design */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Recent Meal Activities
                    </h4>
                    <div className="max-h-64 overflow-y-auto">
                      {messDetails.recentActivities?.expenses?.length > 0 ? (
                        <div className="space-y-3">
                          {messDetails.recentActivities.expenses.slice(0, 5).map((expense: any, index: number) => (
                            <div key={expense.id || index} className="flex justify-between items-center text-sm border-b border-gray-200 pb-3">
                              <div>
                                <div className="font-medium text-gray-800">{expense.title || 'Expense'}</div>
                                <div className="text-gray-600 text-xs">{expense.category || 'General'}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-gray-800">৳{expense.amount || 0}</div>
                                <div className="text-gray-600 text-xs">{expense.addedBy || 'Unknown'}</div>
                                <div className="text-gray-500 text-xs">{expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : 'N/A'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-700 text-sm italic flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          No recent meal activities
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow duration-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Recent Financial Activities
                    </h4>
                    <div className="max-h-64 overflow-y-auto">
                      {messDetails.recentActivities?.deposits?.length > 0 ? (
                        <div className="space-y-3">
                          {messDetails.recentActivities.deposits.slice(0, 5).map((deposit: any) => (
                            <div key={deposit.id} className="flex justify-between items-center text-sm border-b border-gray-200 pb-3">
                              <div>
                                <div className="font-semibold text-gray-800">৳{deposit.amount || 0}</div>
                                <div className="text-gray-600 text-xs">{deposit.method || 'Deposit'}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-gray-600 text-xs">{deposit.createdAt ? new Date(deposit.createdAt).toLocaleDateString() : 'N/A'}</div>
                                <div className="text-gray-700 text-xs">{deposit.user || 'Unknown'}</div>
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  deposit.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  deposit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {deposit.status || 'pending'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-700 text-sm italic flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          No recent financial activities
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Members List */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    All Members ({messDetails.members.length})
                  </h4>
                  <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Contact</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Role</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {messDetails.members?.map((member: any) => (
                          <tr key={member.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-4 py-3 text-sm">
                              <div className="font-medium text-gray-800">{member.name || 'Unknown'}</div>
                              <div className="text-gray-600 text-xs font-mono">ID: {member.id?.toString().slice(-8) || 'N/A'}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="text-gray-800">{member.email || 'N/A'}</div>
                              <div className="text-gray-600 text-xs">{member.phone || 'N/A'}</div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full items-center ${
                                member.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {member.role === 'admin' ? (
                                  <>
                                    <AdminPanelSettingsIcon className="h-3 w-3 mr-1" />
                                    Admin
                                  </>
                                ) : (
                                  <>
                                    <PersonIcon className="h-3 w-3 mr-1" />
                                    Member
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                !member.isApproved 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : member.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {!member.isApproved ? '⏳ Pending' : member.isActive ? '✅ Active' : '❌ Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* Enhanced Basic View */
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Basic Information
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Name:</span> <span className="text-gray-800">{selectedMess.name}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Code:</span> <span className="text-gray-800 font-mono">{selectedMess.messCode}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Address:</span> <span className="text-gray-800 text-xs">{selectedMess.address}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Description:</span> <span className="text-gray-800 text-xs">{selectedMess.description || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Meal Frequency:</span> <span className="text-gray-800">{selectedMess.mealFrequency} meals/day</span></div>
                      <div className="flex justify-between"><span className="font-medium text-gray-700">Admin Participation:</span> 
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedMess.adminIsActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedMess.adminIsActive ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
                    <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Meal Deadlines
                    </h4>
                    <div className="space-y-3 text-sm">
                      {selectedMess.mealFrequency === 3 && selectedMess.mealDeadlines?.breakfast && (
                        <div className="flex justify-between"><span className="font-medium text-gray-700">🌅 Breakfast:</span> <span className="text-gray-800 font-mono">{selectedMess.mealDeadlines.breakfast}</span></div>
                      )}
                      {selectedMess.mealDeadlines?.lunch && (
                        <div className="flex justify-between"><span className="font-medium text-gray-700">🌞 Lunch:</span> <span className="text-gray-800 font-mono">{selectedMess.mealDeadlines.lunch}</span></div>
                      )}
                      {selectedMess.mealDeadlines?.dinner && (
                        <div className="flex justify-between"><span className="font-medium text-gray-700">🌙 Dinner:</span> <span className="text-gray-800 font-mono">{selectedMess.mealDeadlines.dinner}</span></div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Members ({selectedMess.totalMembers})
                  </h4>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedMess.members?.map((member: any) => (
                          <tr key={member.user?._id || member._id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">{member.user?.name || member.name || 'Unknown'}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{member.user?.email || member.email || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                !member.isApproved 
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : member.isActive
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {!member.isApproved ? '⏳ Pending' : member.isActive ? '✅ Active' : '❌ Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mess Timeline
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium text-gray-700 mb-1">Mess Created</div>
                  <div className="text-gray-800">{new Date(selectedMess.createdAt).toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="font-medium text-gray-700 mb-1">Last Updated</div>
                  <div className="text-gray-800">{new Date(selectedMess.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Delete Confirmation Modal */}
      {showDeleteConfirm && messToDelete && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border w-96 shadow-2xl rounded-xl bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-xl leading-6 font-semibold text-gray-900 mb-4">Delete Entire Mess</h3>
              <div className="px-2 py-3">
                <p className="text-sm text-gray-700 mb-4">
                  Are you sure you want to permanently delete mess <strong className="text-red-600">{messToDelete.name}</strong>?
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-red-700 mb-2">
                    <div className="flex items-center text-red-700 mb-4">
                      <WarningIcon className="h-5 w-5 mr-2" />
                      This is a destructive action that cannot be undone. It will:
                    </div>
                  </p>
                  <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                    <li>Remove <strong>all {messToDelete.totalMembers} members</strong> from the mess</li>
                    <li>Delete all meal attendance records</li>
                    <li>Delete all financial data (deposits & expenses)</li>
                    <li>Delete all billing cycles and settlements</li>
                    <li>Remove all inventory records</li>
                    <li>Delete all associated notifications</li>
                  </ul>
                </div>
              </div>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setMessToDelete(null)
                  }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteMess}
                  className="px-6 py-2 bg-red-600 text-white text-sm font-medium rounded-lg shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors duration-200"
                >
                  Delete Mess
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
