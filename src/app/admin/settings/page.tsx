'use client'

import DeleteIcon from '@mui/icons-material/Delete'
import LockIcon from '@mui/icons-material/Lock'
import WarningIcon from '@mui/icons-material/Warning'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function AdminSettings() {
  const [adminData, setAdminData] = useState<any>(null)
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    newUsername: '',
    newEmail: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupError, setCleanupError] = useState('')
  const [cleanupSuccess, setCleanupSuccess] = useState('')
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false)
  const [cleanupPassword, setCleanupPassword] = useState('')
  const router = useRouter()

  useEffect(() => {
    const admin = localStorage.getItem('adminData')
    if (admin) {
      try {
        const adminInfo = JSON.parse(admin)
        setAdminData(adminInfo)
        setFormData({
          ...formData,
          newUsername: adminInfo.username,
          newEmail: adminInfo.email
        })
      } catch (error) {
        console.error('Error parsing admin data:', error)
        router.push('/admin')
      }
    } else {
      router.push('/admin')
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!formData.currentPassword) {
      setError('Current password is required')
      setLoading(false)
      return
    }

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match')
      setLoading(false)
      return
    }

    if (formData.newPassword && formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      setLoading(false)
      return
    }

    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        router.push('/admin')
        return
      }

      const updateData: any = {
        currentPassword: formData.currentPassword
      }

      if (formData.newPassword) {
        updateData.newPassword = formData.newPassword
      }

      if (formData.newUsername !== adminData.username) {
        updateData.newUsername = formData.newUsername
      }

      if (formData.newEmail !== adminData.email) {
        updateData.newEmail = formData.newEmail
      }

      const response = await fetch('/api/admin/auth/change-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Credentials updated successfully')
        
        // Update local storage with new admin data
        const updatedAdminData = {
          ...adminData,
          username: formData.newUsername,
          email: formData.newEmail
        }
        localStorage.setItem('adminData', JSON.stringify(updatedAdminData))
        setAdminData(updatedAdminData)
        
        // Clear password fields
        setFormData({
          ...formData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        setError(data.message || 'Failed to update credentials')
      }
    } catch (error) {
      console.error('Update credentials error:', error)
      setError('An error occurred while updating credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken')
    localStorage.removeItem('adminData')
    router.push('/admin')
  }

  const handleDatabaseCleanup = async () => {
    if (!cleanupPassword) {
      setCleanupError('Please enter your admin password to confirm this action')
      return
    }

    setCleanupLoading(true)
    setCleanupError('')
    setCleanupSuccess('')

    try {
      const token = localStorage.getItem('adminToken')
      if (!token) {
        router.push('/admin')
        return
      }

      const response = await fetch('/api/admin/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          confirmAction: 'DELETE_ALL_DATA',
          adminPassword: cleanupPassword
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setCleanupSuccess(`Database cleanup completed successfully! ${data.details.totalRecordsDeleted} records deleted.`)
        setShowCleanupConfirm(false)
        setCleanupPassword('')
      } else {
        setCleanupError(data.error || 'Failed to perform database cleanup')
      }
    } catch (error) {
      console.error('Database cleanup error:', error)
      setCleanupError('An error occurred during database cleanup')
    } finally {
      setCleanupLoading(false)
    }
  }

  const cancelCleanup = () => {
    setShowCleanupConfirm(false)
    setCleanupPassword('')
    setCleanupError('')
  }

  if (!adminData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your admin account settings and credentials
        </p>
      </div>

      {/* Current Admin Info */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Current Admin Information</h3>
          <div className="mt-5 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                {adminData.username}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                {adminData.email}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                Web Administrator
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Login</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                {adminData.lastLogin ? new Date(adminData.lastLogin).toLocaleString() : 'Never'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Update Credentials Form */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Update Credentials</h3>
          <p className="mt-1 text-sm text-gray-500">
            Change your username, email, or password. Current password is required for any changes.
          </p>
          
          <form className="mt-5 space-y-6" onSubmit={handleSubmit}>
            {/* Current Password */}
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                Current Password *
              </label>
              <input
                type="password"
                name="currentPassword"
                id="currentPassword"
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                value={formData.currentPassword}
                onChange={handleChange}
              />
            </div>

            {/* New Username */}
            <div>
              <label htmlFor="newUsername" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                type="text"
                name="newUsername"
                id="newUsername"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                value={formData.newUsername}
                onChange={handleChange}
              />
            </div>

            {/* New Email */}
            <div>
              <label htmlFor="newEmail" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                name="newEmail"
                id="newEmail"
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                value={formData.newEmail}
                onChange={handleChange}
              />
            </div>

            {/* New Password */}
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password (optional)
                </label>
                <input
                  type="password"
                  name="newPassword"
                  id="newPassword"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="text-sm text-green-800">{success}</div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Credentials'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Security</h3>
          <p className="mt-1 text-sm text-gray-500">
            Security and session management options.
          </p>
          
          <div className="mt-5">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout from Admin Panel
            </button>
          </div>
        </div>
      </div>

      {/* Database Management */}
      <div className="bg-white shadow sm:rounded-lg border-l-4 border-red-400">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-red-900 flex items-center">
            <WarningIcon className="mr-2 h-5 w-5" />
            Danger Zone - Database Management
          </h3>
          <p className="mt-1 text-sm text-red-600">
            Critical database operations. Use with extreme caution.
          </p>
          
          <div className="mt-5">
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Database Cleanup</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>This action will permanently delete ALL application data including:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All users and their accounts</li>
                      <li>All mess facilities and configurations</li>
                      <li>All meal attendance records</li>
                      <li>All financial records (expenses, deposits, billing)</li>
                      <li>All inventory and meal routines</li>
                      <li>All notifications and leave requests</li>
                    </ul>
                    <p className="mt-2 font-semibold flex items-center text-red-700">
                      <WarningIcon className="mr-2 h-4 w-4" />
                      This action cannot be undone! Admin accounts will be preserved.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {!showCleanupConfirm && (
              <button
                onClick={() => setShowCleanupConfirm(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Initialize Database Cleanup
              </button>
            )}

            {showCleanupConfirm && (
              <div className="bg-red-100 border border-red-300 rounded-md p-4">
                <h4 className="text-red-900 font-semibold mb-3 flex items-center">
                  <LockIcon className="mr-2 h-4 w-4" />
                  Confirm Database Cleanup
                </h4>
                <p className="text-red-800 text-sm mb-4">
                  Enter your admin password to confirm this destructive action:
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="cleanupPassword" className="block text-sm font-medium text-red-700">
                      Admin Password *
                    </label>
                    <input
                      type="password"
                      id="cleanupPassword"
                      value={cleanupPassword}
                      onChange={(e) => setCleanupPassword(e.target.value)}
                      className="mt-1 block w-full border-red-300 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                      placeholder="Enter your admin password"
                    />
                  </div>

                  {cleanupError && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="text-sm text-red-800">{cleanupError}</div>
                    </div>
                  )}

                  <div className="flex space-x-4">
                    <button
                      onClick={handleDatabaseCleanup}
                      disabled={cleanupLoading || !cleanupPassword}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {cleanupLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Cleaning Database...
                        </>
                      ) : (
                        <>
                          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <DeleteIcon className="mr-2 h-4 w-4" />
                          DELETE ALL DATA
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={cancelCleanup}
                      disabled={cleanupLoading}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {cleanupSuccess && (
              <div className="mt-4 rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <div className="text-sm text-green-800">{cleanupSuccess}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">System Information</h3>
          <p className="mt-1 text-sm text-gray-500">
            Information about the admin panel and platform.
          </p>
          
          <div className="mt-5 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Admin Panel Version</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                v1.0.0
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Platform</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                MealNChill Web Admin
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Session Expires</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                24 hours after login
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Access Level</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded-md">
                Full Administrative Access
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
