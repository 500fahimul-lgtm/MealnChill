'use client'

import { Edit, ExitToApp, Lock, Visibility, VisibilityOff, Warning } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  isAdmin: boolean
  isMember: boolean
  role: string
  totalMealsTaken: number
  totalMoneyPaid: number
  messName: string
  messCode: string
  joinedAt: string
}

interface LeaveRequest {
  id: string
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

interface ProfileProps {}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [leaveRequest, setLeaveRequest] = useState<LeaveRequest | null>(null)
  const [hasActiveRequest, setHasActiveRequest] = useState(false)
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [leaveReason, setLeaveReason] = useState('')
  // New state for admin leave functionality
  const [showAdminTransferModal, setShowAdminTransferModal] = useState(false)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)
  const [availableMembers, setAvailableMembers] = useState<any[]>([])
  const [selectedNewAdmin, setSelectedNewAdmin] = useState('')
  const [totalMembers, setTotalMembers] = useState(0)
  const router = useRouter()

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(data.user)
      } else {
        setMessage('Failed to load profile')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchLeaveRequestStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/leave-request-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setHasActiveRequest(data.hasActiveRequest)
        setLeaveRequest(data.leaveRequest)
      }
    } catch (error) {
      console.error('Error fetching leave request status:', error)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordErrors([])
    setMessage('')

    // Validate form
    const errors: string[] = []
    if (!passwordForm.currentPassword) {
      errors.push('Current password is required')
    }
    if (!passwordForm.newPassword) {
      errors.push('New password is required')
    } else if (passwordForm.newPassword.length < 6) {
      errors.push('New password must be at least 6 characters long')
    }
    if (!passwordForm.confirmPassword) {
      errors.push('Please confirm your new password')
    }
    if (passwordForm.newPassword && passwordForm.confirmPassword && 
        passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.push('New passwords do not match')
    }
    if (passwordForm.currentPassword && passwordForm.newPassword && 
        passwordForm.currentPassword === passwordForm.newPassword) {
      errors.push('New password must be different from current password')
    }

    if (errors.length > 0) {
      setPasswordErrors(errors)
      return
    }

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Password changed successfully!')
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setIsChangingPassword(false)
      } else {
        setPasswordErrors([data.message || 'Failed to change password'])
      }
    } catch (error) {
      setPasswordErrors(['Network error. Please try again.'])
    } finally {
      setIsProcessing(false)
    }
  }

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const handleSelfDemote = async () => {
    if (!confirm('Are you sure you want to remove your admin rights? This action cannot be undone and you will become a regular member.')) {
      return
    }

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/admin/self-demote', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        
        // Refresh profile to show updated role
        await fetchProfile()
        
        // Reload page to update permissions
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        const error = await response.json()
        setMessage(error.message || 'Failed to remove admin rights')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleLeaveMess = async () => {
    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/leave-mess', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (response.ok) {
        const data = await response.json()
        
        // Handle different response types
        if (data.requiresConfirmation && data.action === 'DELETE_MESS') {
          // Show delete confirmation modal
          setTotalMembers(data.totalMembers)
          setShowDeleteConfirmModal(true)
          setMessage('')
        } else if (data.requiresTransfer && data.action === 'TRANSFER_AND_LEAVE') {
          // Show transfer modal
          setAvailableMembers(data.otherMembers)
          setTotalMembers(data.totalMembers)
          setShowAdminTransferModal(true)
          setMessage('')
        } else {
          // Successful leave (admin with other admins)
          setMessage(data.message)
          
          // Update token with new user info (no messId)
          if (data.token) {
            localStorage.setItem('token', data.token)
          }
          
          // Clear profile state and redirect
          setProfile(null)
          
          setTimeout(() => {
            router.push('/mess-setup')
          }, 2000)
        }
      } else {
        const error = await response.json()
        setMessage(error.message || 'Failed to leave mess')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leaveReason.trim()) {
      setMessage('Please provide a reason for leaving')
      return
    }

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/leave-mess', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: leaveReason }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        setShowLeaveForm(false)
        setLeaveReason('')
        fetchLeaveRequestStatus() // Refresh leave request status
      } else {
        const error = await response.json()
        setMessage(error.message || 'Failed to submit leave request')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConfirmDeleteMess = async () => {
    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/leave-mess', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmAction: 'DELETE_MESS'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        
        if (data.token) {
          localStorage.setItem('token', data.token)
        }
        
        setProfile(null)
        setShowDeleteConfirmModal(false)
        
        setTimeout(() => {
          router.push('/mess-setup')
        }, 2000)
      } else {
        const error = await response.json()
        setMessage(error.message || 'Failed to delete mess')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleTransferAndLeave = async () => {
    if (!selectedNewAdmin) {
      setMessage('Please select a member to transfer admin rights to.')
      return
    }

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/leave-mess', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmAction: 'TRANSFER_AND_LEAVE',
          transferToUserId: selectedNewAdmin
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        
        if (data.token) {
          localStorage.setItem('token', data.token)
        }
        
        setProfile(null)
        setShowAdminTransferModal(false)
        
        setTimeout(() => {
          router.push('/mess-setup')
        }, 2000)
      } else {
        const error = await response.json()
        setMessage(error.message || 'Failed to transfer admin rights')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelLeaveRequest = async () => {
    if (!confirm('Are you sure you want to cancel your leave request?')) {
      return
    }

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/leave-request-status', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        fetchLeaveRequestStatus() // Refresh leave request status
      } else {
        const error = await response.json()
        setMessage(error.message || 'Failed to cancel leave request')
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    fetchLeaveRequestStatus()
  }, [])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <Warning className="text-red-400 mx-auto mb-4" style={{ fontSize: '4rem' }} />
          <h4 className="text-lg font-medium text-gray-600 mb-2">
            Failed to load profile
          </h4>
          <p className="text-gray-500 mb-4">
            There was an error loading your profile information.
          </p>
          <button
            onClick={fetchProfile}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">My Profile</h3>
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

      {/* Profile Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Information</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <p className="text-lg text-gray-900">{profile.name}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="text-lg text-gray-900">{profile.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <p className="text-lg text-gray-900">{profile.phone}</p>
          </div>

          {/* Password Change Section */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <button
                onClick={() => setIsChangingPassword(!isChangingPassword)}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
              >
                <Edit sx={{ fontSize: 16 }} />
                {isChangingPassword ? 'Cancel' : 'Change Password'}
              </button>
            </div>
            
            {!isChangingPassword ? (
              <p className="text-gray-500 text-sm">••••••••••••</p>
            ) : (
              <form onSubmit={handlePasswordChange} className="space-y-4 mt-4">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-gray-900 placeholder-gray-500"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-gray-900 placeholder-gray-500"
                      placeholder="Enter new password (min 6 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10 text-gray-900 placeholder-gray-500"
                      placeholder="Confirm your new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                    </button>
                  </div>
                </div>

                {/* Password Errors */}
                {passwordErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start">
                      <Warning className="text-red-400 mt-0.5 mr-2" sx={{ fontSize: 16 }} />
                      <div>
                        <ul className="text-sm text-red-700 space-y-1">
                          {passwordErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Change Password Button */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Lock sx={{ fontSize: 16 }} />
                    {isProcessing ? 'Changing...' : 'Change Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false)
                      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      setPasswordErrors([])
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <div className="flex gap-2">
              {profile.isAdmin && (
                <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-amber-100 text-amber-800">
                  Admin
                </span>
              )}
              {profile.isMember && (
                <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                  Member
                </span>
              )}
              {!profile.isAdmin && !profile.isMember && (
                <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-600">
                  No Active Role
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {profile.isAdmin && profile.isMember && "You have admin powers and also eat meals from this mess"}
              {profile.isAdmin && !profile.isMember && "You have admin powers but don't eat meals from this mess"}
              {!profile.isAdmin && profile.isMember && "You are an active member of this mess"}
              {!profile.isAdmin && !profile.isMember && "You don't have an active role in this mess"}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Joined Date</label>
            <p className="text-lg text-gray-900">
              {new Date(profile.joinedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Mess Information */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Mess Information</h4>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Mess Name</label>
            <p className="text-lg text-gray-900">{profile.messName}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Mess Code</label>
            <p className="text-lg text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
              {profile.messCode}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Meals Taken</label>
            <p className="text-2xl font-bold text-blue-600">{profile.totalMealsTaken}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Total Money Paid</label>
            <p className="text-2xl font-bold text-green-600">৳{profile.totalMoneyPaid}</p>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      {profile.isAdmin && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Admin Actions</h4>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <Warning className="text-yellow-400" style={{ fontSize: '1.5rem' }} />
              </div>
              <div className="ml-3 flex-1">
                <h5 className="text-sm font-medium text-yellow-800">
                  Remove Admin Rights
                </h5>
                <p className="text-sm text-yellow-700 mt-1">
                  You can remove your admin rights and become a regular member. 
                  This action requires at least one other admin to remain in the mess.
                </p>
                <div className="mt-3">
                  <button
                    onClick={handleSelfDemote}
                    disabled={isProcessing}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isProcessing ? 'Processing...' : 'Remove My Admin Rights'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Mess Section */}
      {profile.messName && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Mess Management</h4>
          
          {/* Show leave request status if user has one */}
          {leaveRequest && (
            <div className={`border rounded-lg p-4 mb-4 ${
              leaveRequest.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
              leaveRequest.status === 'approved' ? 'bg-green-50 border-green-200' :
              'bg-red-50 border-red-200'
            }`}>
              <h5 className={`text-sm font-medium mb-2 ${
                leaveRequest.status === 'pending' ? 'text-yellow-800' :
                leaveRequest.status === 'approved' ? 'text-green-800' :
                'text-red-800'
              }`}>
                Leave Request {leaveRequest.status.charAt(0).toUpperCase() + leaveRequest.status.slice(1)}
              </h5>
              <p className={`text-sm mb-1 ${
                leaveRequest.status === 'pending' ? 'text-yellow-700' :
                leaveRequest.status === 'approved' ? 'text-green-700' :
                'text-red-700'
              }`}>
                <strong>Reason:</strong> {leaveRequest.reason}
              </p>
              <p className={`text-sm mb-1 ${
                leaveRequest.status === 'pending' ? 'text-yellow-700' :
                leaveRequest.status === 'approved' ? 'text-green-700' :
                'text-red-700'
              }`}>
                <strong>Requested:</strong> {new Date(leaveRequest.requestedAt).toLocaleDateString()}
              </p>
              {leaveRequest.reviewedAt && leaveRequest.reviewedBy && (
                <>
                  <p className={`text-sm mb-1 ${
                    leaveRequest.status === 'pending' ? 'text-yellow-700' :
                    leaveRequest.status === 'approved' ? 'text-green-700' :
                    'text-red-700'
                  }`}>
                    <strong>Reviewed by:</strong> {leaveRequest.reviewedBy.name} on {new Date(leaveRequest.reviewedAt).toLocaleDateString()}
                  </p>
                  {leaveRequest.adminNote && (
                    <p className={`text-sm mb-2 ${
                      leaveRequest.status === 'pending' ? 'text-yellow-700' :
                      leaveRequest.status === 'approved' ? 'text-green-700' :
                      'text-red-700'
                    }`}>
                      <strong>Admin Note:</strong> {leaveRequest.adminNote}
                    </p>
                  )}
                </>
              )}
              {leaveRequest.status === 'pending' && (
                <div className="mt-3">
                  <button
                    onClick={handleCancelLeaveRequest}
                    disabled={isProcessing}
                    className="bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 transition-colors text-sm"
                  >
                    {isProcessing ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <ExitToApp className="text-red-400" style={{ fontSize: '1.5rem' }} />
              </div>
              <div className="ml-3 flex-1">
                <h5 className="text-sm font-medium text-red-800">
                  Leave Mess
                </h5>
                <p className="text-sm text-red-700 mt-1">
                  {profile.isAdmin ? 
                    'As an admin, you can leave immediately. Regular members need admin approval to leave the mess.' :
                    'Submit a request to leave this mess. An admin will review your request.'
                  }
                </p>
                
                {/* Show different UI based on user role and request status */}
                {profile.isAdmin ? (
                  // Admin can leave immediately
                  <div className="mt-3">
                    <button
                      onClick={handleLeaveMess}
                      disabled={isProcessing}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                    >
                      {isProcessing ? 'Processing...' : 'Leave Mess'}
                    </button>
                  </div>
                ) : hasActiveRequest ? (
                  // Regular member with pending request
                  <div className="mt-3">
                    <p className="text-sm text-red-600 italic">
                      You have a pending leave request. Please wait for admin approval.
                    </p>
                  </div>
                ) : showLeaveForm ? (
                  // Show leave request form
                  <form onSubmit={handleSubmitLeaveRequest} className="mt-3">
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-red-800 mb-1">
                        Reason for leaving
                      </label>
                      <textarea
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="Please provide a reason for leaving the mess..."
                        required
                        className="universal-input"
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={isProcessing || !leaveReason.trim()}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                      >
                        {isProcessing ? 'Submitting...' : 'Submit Request'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLeaveForm(false)
                          setLeaveReason('')
                        }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  // Show request leave button for regular members
                  <div className="mt-3">
                    <button
                      onClick={() => setShowLeaveForm(true)}
                      disabled={isProcessing}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                    >
                      Request to Leave
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Transfer Modal */}
      {showAdminTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Transfer Admin Rights
            </h3>
            
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Admin Transfer Required</strong>
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                You are the only admin in this mess with {totalMembers} member(s). 
                You must transfer admin rights to another member before you can leave.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Admin
              </label>
              <select
                value={selectedNewAdmin}
                onChange={(e) => setSelectedNewAdmin(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="">Choose a member...</option>
                {availableMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> The selected member will receive admin privileges and you will leave the mess. 
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAdminTransferModal(false)
                  setSelectedNewAdmin('')
                  setAvailableMembers([])
                }}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferAndLeave}
                disabled={isProcessing || !selectedNewAdmin}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                {isProcessing ? 'Transferring...' : 'Transfer & Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Mess Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              ⚠️ Delete Mess Confirmation
            </h3>
            
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium mb-2">
                DANGER: This action will permanently delete the mess!
              </p>
              <p className="text-sm text-red-700">
                You are the only member in this mess. Leaving will:
              </p>
              <ul className="text-sm text-red-700 mt-2 ml-4 list-disc">
                <li>Permanently delete the entire mess</li>
                <li>Remove all mess data (meals, expenses, etc.)</li>
                <li>Cannot be undone</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-600">
                If you want to keep the mess, consider inviting other members first, 
                then transferring admin rights instead of deleting.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteMess}
                disabled={isProcessing}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                {isProcessing ? 'Deleting...' : 'Delete Mess & Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
