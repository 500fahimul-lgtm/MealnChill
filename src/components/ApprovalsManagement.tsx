'use client'

import { Check, Close, ExitToApp, Person, PersonAdd } from '@mui/icons-material'
import { useEffect, useState } from 'react'

interface LeaveRequest {
  id: string
  user: {
    id: string
    name: string
    email: string
    phone: string
  }
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  reviewedAt?: string
  reviewedBy?: {
    id: string
    name: string
  }
  adminNote?: string
}

interface JoinRequest {
  id: string
  name: string
  email: string
  phone: string
  joinedAt: string
  isApproved: boolean
}

export default function ApprovalsManagement() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [showNoteForm, setShowNoteForm] = useState<{ requestId: string; action: 'approve' | 'reject'; type: 'leave' | 'join' } | null>(null)
  const [activeTab, setActiveTab] = useState<'leave' | 'join'>('join')

  const fetchLeaveRequests = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/leave-requests', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setLeaveRequests(data.leaveRequests)
      } else {
        setMessage('Failed to load leave requests')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    }
  }

  const fetchJoinRequests = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/members?includeAll=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Filter for pending join requests (members who are not approved yet)
        const pendingMembers = data.members.filter((member: any) => !member.isApproved)
        setJoinRequests(pendingMembers)
      } else {
        setMessage('Failed to load join requests')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    }
  }

  const fetchData = async () => {
    setIsLoading(true)
    await Promise.all([fetchLeaveRequests(), fetchJoinRequests()])
    setIsLoading(false)
  }

  const handleProcessLeaveRequest = async (requestId: string, action: 'approve' | 'reject', note?: string) => {
    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          action,
          adminNote: note || ''
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        setShowNoteForm(null)
        setAdminNote('')
        fetchLeaveRequests() // Refresh the list
      } else {
        const error = await response.json()
        setMessage(error.message || `Failed to ${action} leave request`)
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleProcessJoinRequest = async (userId: string, action: 'approve' | 'reject') => {
    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const endpoint = action === 'approve' ? 'approve' : 'reject'
      const response = await fetch(`/api/members/${userId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        setShowNoteForm(null)
        setAdminNote('')
        fetchJoinRequests() // Refresh the list
      } else {
        const error = await response.json()
        setMessage(error.message || `Failed to ${action} join request`)
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleQuickApprove = (requestId: string, type: 'leave' | 'join') => {
    const message = type === 'leave' 
      ? 'Are you sure you want to approve this leave request? The member will be immediately removed from the mess.'
      : 'Are you sure you want to approve this member to join the mess?'
    
    if (confirm(message)) {
      if (type === 'leave') {
        handleProcessLeaveRequest(requestId, 'approve')
      } else {
        handleProcessJoinRequest(requestId, 'approve')
      }
    }
  }

  const handleQuickReject = (requestId: string, type: 'leave' | 'join') => {
    const message = type === 'leave'
      ? 'Are you sure you want to reject this leave request?'
      : 'Are you sure you want to reject this join request?'
    
    if (confirm(message)) {
      if (type === 'leave') {
        handleProcessLeaveRequest(requestId, 'reject')
      } else {
        handleProcessJoinRequest(requestId, 'reject')
      }
    }
  }

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (showNoteForm) {
      if (showNoteForm.type === 'leave') {
        handleProcessLeaveRequest(showNoteForm.requestId, showNoteForm.action, adminNote)
      } else {
        handleProcessJoinRequest(showNoteForm.requestId, showNoteForm.action)
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const pendingLeaveRequests = leaveRequests.filter(req => req.status === 'pending')
  const processedLeaveRequests = leaveRequests.filter(req => req.status !== 'pending')
  const pendingJoinRequests = joinRequests.filter(req => !req.isApproved)

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Approvals Management</h3>
      
      {message && (
        <div className={`p-4 rounded-lg mb-6 ${
          message.includes('success') || message.includes('approved') || message.includes('rejected') 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('join')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'join'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <PersonAdd className="inline-block mr-2 text-sm" />
          Join Requests ({pendingJoinRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'leave'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <ExitToApp className="inline-block mr-2 text-sm" />
          Leave Requests ({pendingLeaveRequests.length})
        </button>
      </div>

      {/* Note Form Modal */}
      {showNoteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h4 className="text-lg font-semibold mb-4">
              {showNoteForm.action === 'approve' ? 'Approve' : 'Reject'} {showNoteForm.type === 'leave' ? 'Leave' : 'Join'} Request
            </h4>
            <form onSubmit={handleNoteSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Note {showNoteForm.action === 'reject' || showNoteForm.type === 'leave' ? '(optional)' : '(optional)'}
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Optional note..."
                  className="universal-input"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`flex-1 text-white px-4 py-2 rounded-lg transition-colors disabled:bg-gray-400 ${
                    showNoteForm.action === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isProcessing ? 'Processing...' : showNoteForm.action === 'approve' ? 'Approve' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNoteForm(null)
                    setAdminNote('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Requests Tab */}
      {activeTab === 'join' && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <PersonAdd className="text-blue-500" />
            Pending Join Requests ({pendingJoinRequests.length})
          </h4>
          
          {pendingJoinRequests.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <PersonAdd className="text-gray-400 mx-auto mb-2" style={{ fontSize: '3rem' }} />
              <p className="text-gray-600">No pending join requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingJoinRequests.map((request) => (
                <div key={request.id} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Person className="text-gray-600" style={{ fontSize: '1.2rem' }} />
                        <h5 className="font-medium text-gray-900">{request.name}</h5>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Pending
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Email:</strong> {request.email}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Phone:</strong> {request.phone}
                      </p>
                      <p className="text-xs text-gray-500">
                        Requested on {new Date(request.joinedAt).toLocaleDateString()} at {new Date(request.joinedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleQuickApprove(request.id, 'join')}
                        disabled={isProcessing}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm flex items-center gap-1"
                      >
                        <Check style={{ fontSize: '0.9rem' }} />
                        Approve
                      </button>
                      <button
                        onClick={() => handleQuickReject(request.id, 'join')}
                        disabled={isProcessing}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm flex items-center gap-1"
                      >
                        <Close style={{ fontSize: '0.9rem' }} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leave Requests Tab */}
      {activeTab === 'leave' && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
            <ExitToApp className="text-red-500" />
            Pending Leave Requests ({pendingLeaveRequests.length})
          </h4>
          
          {pendingLeaveRequests.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <ExitToApp className="text-gray-400 mx-auto mb-2" style={{ fontSize: '3rem' }} />
              <p className="text-gray-600">No pending leave requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingLeaveRequests.map((request) => (
                <div key={request.id} className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Person className="text-gray-600" style={{ fontSize: '1.2rem' }} />
                        <h5 className="font-medium text-gray-900">{request.user.name}</h5>
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          Pending
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Email:</strong> {request.user.email}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Phone:</strong> {request.user.phone}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Reason:</strong> {request.reason}
                      </p>
                      <p className="text-xs text-gray-500">
                        Requested on {new Date(request.requestedAt).toLocaleDateString()} at {new Date(request.requestedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => setShowNoteForm({ requestId: request.id, action: 'approve', type: 'leave' })}
                        disabled={isProcessing}
                        className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors text-sm flex items-center gap-1"
                      >
                        <Check style={{ fontSize: '0.9rem' }} />
                        Approve
                      </button>
                      <button
                        onClick={() => setShowNoteForm({ requestId: request.id, action: 'reject', type: 'leave' })}
                        disabled={isProcessing}
                        className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors text-sm flex items-center gap-1"
                      >
                        <Close style={{ fontSize: '0.9rem' }} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Leave Decisions */}
          {processedLeaveRequests.length > 0 && (
            <div className="mt-8">
              <h4 className="text-lg font-medium text-gray-900 mb-4">
                Recent Leave Decisions ({processedLeaveRequests.length})
              </h4>
              <div className="space-y-3">
                {processedLeaveRequests.slice(0, 5).map((request) => (
                  <div key={request.id} className={`border rounded-lg p-3 ${
                    request.status === 'approved' 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Person className="text-gray-600" style={{ fontSize: '1rem' }} />
                        <span className="font-medium text-gray-900 text-sm">{request.user.name}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          request.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {request.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.reviewedBy?.name} • {new Date(request.reviewedAt!).toLocaleDateString()}
                      </div>
                    </div>
                    {request.adminNote && (
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Note:</strong> {request.adminNote}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
