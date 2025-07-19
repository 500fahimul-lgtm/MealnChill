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
    if (!confirm('Are you sure you want to leave this mess? This action cannot be undone and you will lose access to all mess data.')) {
      return
    }

    setIsProcessing(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/leave-mess', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        
        // Update token with new user info (no messId)
        if (data.token) {
          localStorage.setItem('token', data.token)
        }
        
        // Clear profile state and redirect
        setProfile(null)
        
        // Use router for navigation instead of window.location
        setTimeout(() => {
          router.push('/mess-setup')
        }, 2000)
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

  useEffect(() => {
    fetchProfile()
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
                  Permanently leave this mess. You will lose access to all mess data and need to join or create another mess.
                  {profile.isAdmin && ' As an admin, you must ensure there is at least one other admin before leaving.'}
                </p>
                <div className="mt-3">
                  <button
                    onClick={handleLeaveMess}
                    disabled={isProcessing}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
                  >
                    {isProcessing ? 'Processing...' : 'Leave Mess'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
