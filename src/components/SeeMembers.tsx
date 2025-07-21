'use client'

import { CheckCircle, Close, Group } from '@mui/icons-material'
import { useEffect, useState } from 'react'

interface MemberData {
  id: string
  name: string
  phone: string
  email: string
  totalMealsTaken: number
  totalMoneyPaid: number
  role: string
  joinedAt: string
}

interface SeeMembersProps {
  messId: string
  isAdmin: boolean
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

export default function SeeMembers({ messId, isAdmin }: SeeMembersProps) {
  const [members, setMembers] = useState<MemberData[]>([])
  const [filteredMembers, setFilteredMembers] = useState<MemberData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])

  // Toast functions
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now()
    const newToast: Toast = { id, message, type }
    setToasts(prev => [...prev, newToast])

    // Auto remove toast after 5 seconds
    setTimeout(() => {
      removeToast(id)
    }, 5000)
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/members', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMembers(data.members)
        setFilteredMembers(data.members)
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    const filtered = members.filter(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery)
    )
    setFilteredMembers(filtered)
  }, [searchQuery, members])

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the mess?`)) {
      return
    }

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/members/${memberId}/remove`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        showToast(`${memberName} has been removed from the mess`, 'success')
        setMessage('') // Clear old messages
        await fetchMembers()
      } else {
        const error = await response.json()
        showToast(error.message || 'Failed to remove member', 'error')
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberEmail.trim()) return

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/members/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newMemberEmail.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Extract member name from the success message or use email
        const memberName = data.message.split(' has been successfully')[0] || newMemberEmail
        showToast(`${memberName} added successfully!`, 'success')
        setMessage('') // Clear old messages
        setNewMemberEmail('')
        setShowAddMember(false)
        await fetchMembers()
      } else {
        const error = await response.json()
        showToast(error.message || 'Failed to add member', 'error')
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleAdminAction = async (memberId: string, memberName: string, action: 'promote' | 'demote') => {
    let confirmMessage = ''
    if (action === 'promote') {
      confirmMessage = `Are you sure you want to promote ${memberName} to admin?`
    } else if (action === 'demote') {
      confirmMessage = `Are you sure you want to remove admin rights from ${memberName}?`
    }

    if (!confirm(confirmMessage)) {
      return
    }

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/members/manage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetUserId: memberId,
          action: action
        })
      })

      if (response.ok) {
        const data = await response.json()
        showToast(data.message, 'success')
        setMessage('') // Clear old messages
        await fetchMembers()
      } else {
        const error = await response.json()
        showToast(error.message || `Failed to ${action} member`, 'error')
      }
    } catch (error) {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Mess Members</h3>
        {isAdmin && (
          <button
            onClick={() => setShowAddMember(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add Member
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">{message}</p>
          <button
            onClick={() => setMessage('')}
            className="text-blue-600 hover:text-blue-800 text-sm mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search members by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-base"
        />
      </div>

      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">
            <Group style={{ fontSize: '4rem' }} />
          </div>
          <h4 className="text-lg font-medium text-gray-600 mb-2">
            {searchQuery ? 'No members found' : 'No members yet'}
          </h4>
          <p className="text-gray-500">
            {searchQuery ? 'Try adjusting your search terms' : 'Add members to get started'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Meals
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.phone}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600">{member.totalMealsTaken}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-green-600">৳{member.totalMoneyPaid}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      member.role === 'admin' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        {member.role !== 'admin' ? (
                          <>
                            <button
                              onClick={() => handleAdminAction(member.id, member.name, 'promote')}
                              disabled={isProcessing}
                              className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 text-sm"
                            >
                              Promote to Admin
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id, member.name)}
                              disabled={isProcessing}
                              className="text-red-600 hover:text-red-900 disabled:text-gray-400 text-sm"
                            >
                              Remove
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAdminAction(member.id, member.name, 'demote')}
                            disabled={isProcessing}
                            className="text-orange-600 hover:text-orange-900 disabled:text-gray-400 text-sm"
                          >
                            Demote
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h4 className="text-lg font-semibold mb-4">Add New Member</h4>
            
            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member Email Address
                </label>
                <input
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="input-base"
                  placeholder="Enter member's email"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The user must already be registered in the system
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddMember(false)
                    setNewMemberEmail('')
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing || !newMemberEmail.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400"
                >
                  {isProcessing ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full bg-white shadow-xl rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transition-all duration-500 transform hover:scale-105 ${
              toast.type === 'success' ? 'border-l-4 border-green-500' :
              toast.type === 'error' ? 'border-l-4 border-red-500' :
              'border-l-4 border-blue-500'
            }`}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    toast.type === 'success' ? 'bg-green-100' :
                    toast.type === 'error' ? 'bg-red-100' :
                    'bg-blue-100'
                  }`}>
                    {toast.type === 'success' && <CheckCircle className="text-green-600 text-lg" />}
                    {toast.type === 'error' && <Close className="text-red-600 text-lg" />}
                    {toast.type === 'info' && <Group className="text-blue-600 text-lg" />}
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <div className={`text-sm font-semibold mb-1 ${
                    toast.type === 'success' ? 'text-green-800' :
                    toast.type === 'error' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    {toast.type === 'success' && 'Success'}
                    {toast.type === 'error' && 'Error'}
                    {toast.type === 'info' && 'Info'}
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {toast.message}
                  </div>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <button
                    className={`rounded-md p-1 inline-flex hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                      toast.type === 'success' ? 'text-green-400 hover:text-green-500 focus:ring-green-500' :
                      toast.type === 'error' ? 'text-red-400 hover:text-red-500 focus:ring-red-500' :
                      'text-blue-400 hover:text-blue-500 focus:ring-blue-500'
                    }`}
                    onClick={() => removeToast(toast.id)}
                  >
                    <span className="sr-only">Close</span>
                    <Close className="text-lg" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
