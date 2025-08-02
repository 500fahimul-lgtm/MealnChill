'use client'

import { AccessTime, CalendarToday, Check, Close, Person } from '@mui/icons-material'
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

export default function LeaveRequestManagement() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [adminNote, setAdminNote] = useState('')

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
        setLeaveRequests(data.leaveRequests || [])
      } else {
        setMessage('Failed to load leave requests')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaveRequests()
  }, [])

  const handleActionClick = (request: LeaveRequest, actionType: 'approve' | 'reject') => {
    setSelectedRequest(request)
    setAction(actionType)
    setAdminNote('')
    setShowModal(true)
  }

  const handleConfirmAction = async () => {
    if (!selectedRequest || !action) return

    setIsProcessing(selectedRequest.id)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: action,
          adminNote: adminNote.trim()
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        setShowModal(false)
        setSelectedRequest(null)
        setAction(null)
        setAdminNote('')
        // Refresh the list
        fetchLeaveRequests()
      } else {
        const error = await response.json()
        setMessage(error.message || 'Failed to process request')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AccessTime className="w-3 h-3" />
      case 'approved':
        return <Check className="w-3 h-3" />
      case 'rejected':
        return <Close className="w-3 h-3" />
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const pendingRequests = leaveRequests.filter(req => req.status === 'pending')
  const processedRequests = leaveRequests.filter(req => req.status !== 'pending')

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${
          message.includes('success') || message.includes('approved') || message.includes('rejected')
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {/* Pending Requests */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <AccessTime className="text-yellow-600" />
          Pending Leave Requests ({pendingRequests.length})
        </h3>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AccessTime className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium">No pending leave requests</p>
            <p className="text-sm">All requests have been processed</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <div key={request.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Person className="text-gray-600 w-5 h-5" />
                      <h4 className="font-semibold text-gray-900">{request.user.name}</h4>
                      <span className={getStatusBadge(request.status)}>
                        {getStatusIcon(request.status)}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Email:</strong> {request.user.email}</p>
                      <p><strong>Phone:</strong> {request.user.phone}</p>
                      {request.reason && (
                        <p><strong>Reason:</strong> {request.reason}</p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <CalendarToday className="w-3 h-3" />
                        Requested: {formatDate(request.requestedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleActionClick(request, 'approve')}
                      disabled={isProcessing === request.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleActionClick(request, 'reject')}
                      disabled={isProcessing === request.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1 text-sm"
                    >
                      <Close className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Processed Requests ({processedRequests.length})
          </h3>

          <div className="space-y-3">
            {processedRequests.slice(0, 10).map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Person className="text-gray-600 w-5 h-5" />
                      <h4 className="font-medium text-gray-900">{request.user.name}</h4>
                      <span className={getStatusBadge(request.status)}>
                        {getStatusIcon(request.status)}
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      {request.reason && (
                        <p><strong>Reason:</strong> {request.reason}</p>
                      )}
                      {request.adminNote && (
                        <p><strong>Admin Note:</strong> {request.adminNote}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <CalendarToday className="w-3 h-3" />
                          Requested: {formatDate(request.requestedAt)}
                        </div>
                        {request.reviewedAt && (
                          <div className="flex items-center gap-1">
                            <CalendarToday className="w-3 h-3" />
                            Reviewed: {formatDate(request.reviewedAt)}
                          </div>
                        )}
                        {request.reviewedBy && (
                          <span>by {request.reviewedBy.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showModal && selectedRequest && action && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {action === 'approve' ? 'Approve' : 'Reject'} Leave Request
            </h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">{selectedRequest.user.name}</p>
              <p className="text-sm text-gray-600">{selectedRequest.user.email}</p>
              {selectedRequest.reason && (
                <p className="text-sm text-gray-600 mt-1">
                  <strong>Reason:</strong> {selectedRequest.reason}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Note {action === 'reject' ? '(recommended)' : '(optional)'}
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={action === 'approve' 
                  ? "Add any final notes or instructions..." 
                  : "Provide reason for rejection..."
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {adminNote.length}/500 characters
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedRequest(null)
                  setAction(null)
                  setAdminNote('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isProcessing === selectedRequest.id}
                className={`flex-1 px-4 py-2 text-white rounded-lg ${
                  action === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 flex items-center justify-center gap-1`}
              >
                {isProcessing === selectedRequest.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    {action === 'approve' ? <Check className="w-4 h-4" /> : <Close className="w-4 h-4" />}
                    {action === 'approve' ? 'Approve' : 'Reject'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}