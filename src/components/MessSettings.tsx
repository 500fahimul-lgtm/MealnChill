'use client'

import {
  Block,
  CalendarToday,
  LightbulbOutlined,
  Search,
  Warning
} from '@mui/icons-material';
import { useCallback, useEffect, useState } from 'react';

// Helper function to convert 24-hour time to 12-hour format
const formatTimeTo12Hour = (time24: string): string => {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':');
  const hour24 = parseInt(hours, 10);
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minutes} ${period}`;
};

interface MessSettingsProps {
  messId: string
  isAdmin: boolean
}

interface MessData {
  id: string
  name: string
  messCode: string
  mealFrequency: number
  adminIsActive: boolean
  mealDeadlines: {
    breakfast: string
    lunch: string
    dinner: string
  }
  members: Array<{
    userId: string
    name: string
    email: string
    phone: string
    isActive: boolean
    joinedAt: string
  }>
}

export default function MessSettings({ messId, isAdmin }: MessSettingsProps) {
  const [messData, setMessData] = useState<MessData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [isEditing, setIsEditing] = useState(false)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
    show: boolean
  }>({ type: 'success', message: '', show: false })
  const [formData, setFormData] = useState({
    name: '',
    mealFrequency: 3,
    mealDeadlines: {
      breakfast: '10:00',
      lunch: '14:00', 
      dinner: '20:00'
    }
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [mealManagement, setMealManagement] = useState<{[key: string]: any}>({})
  const [expandedMealControls, setExpandedMealControls] = useState<{[key: string]: boolean}>({})
  const [unsavedChanges, setUnsavedChanges] = useState<{[key: string]: boolean}>({})

  useEffect(() => {
    fetchMessData()
  }, [messId])

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message, show: true })
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }))
    }, 4000) // Auto-hide after 4 seconds
  }

  const fetchMessData = useCallback(async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/mess/${messId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessData(data.mess)
        
        // Handle mealDeadlines properly - ensure we have an object with all fields
        let mealDeadlines
        if (data.mess.mealDeadlines && typeof data.mess.mealDeadlines === 'object') {
          mealDeadlines = {
            breakfast: data.mess.mealDeadlines.breakfast || '10:00',
            lunch: data.mess.mealDeadlines.lunch || '14:00',
            dinner: data.mess.mealDeadlines.dinner || '20:00'
          }
        } else {
          mealDeadlines = {
            breakfast: '10:00',
            lunch: '14:00',
            dinner: '20:00'
          }
        }
        
        setFormData({
          name: data.mess.name,
          mealFrequency: data.mess.mealFrequency,
          mealDeadlines: mealDeadlines
        })
      } else {
        // Handle error silently
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }, [messId])

  useEffect(() => {
    fetchMessData()
  }, [fetchMessData])

  const handleUpdateMess = async () => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/mess/${messId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        const responseData = await response.json()
        await fetchMessData()
        setIsEditing(false)
        showNotification('success', 'Mess settings updated successfully!')
      } else {
        showNotification('error', 'Failed to update mess settings')
      }
    } catch (error) {
      showNotification('error', 'Error updating mess settings. Please try again.')
    }
  }

  const handleMemberToggle = async (userId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch(`/api/mess/${messId}/members/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        await fetchMessData()
        showNotification('success', `Member ${!isActive ? 'activated' : 'deactivated'} successfully!`)
      } else {
        showNotification('error', 'Failed to update member status')
      }
    } catch (error) {
      showNotification('error', 'Error updating member status. Please try again.')
    }
  }

  // Filter members based on search term
  const filteredMembers = messData?.members.filter(member => 
    member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const fetchMemberMealData = async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      const today = new Date().toISOString().split('T')[0]
      
      // For admin, we need to fetch data for a specific user
      // We'll create a new API endpoint or modify the existing one
      const response = await fetch(`/api/meal-attendance?date=${today}&targetUserId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // The API returns { userAttendance, mealSummary, deadlineStatus }
        // userAttendance is an array with structure: { mealSlot, mealName, isMealOn, extraMealCount }
        const userAttendance = data.userAttendance || []
        
        // Transform the userAttendance data to our expected format
        const transformedData: any = {
          userId,
          date: today,
          breakfast: { status: 'off', extra: 0 },
          lunch: { status: 'off', extra: 0 },
          dinner: { status: 'off', extra: 0 }
        }
        
        // Map each meal slot from the API response
        userAttendance.forEach((meal: any) => {
          if (meal.mealSlot && (meal.mealSlot === 'breakfast' || meal.mealSlot === 'lunch' || meal.mealSlot === 'dinner')) {
            transformedData[meal.mealSlot] = {
              status: meal.isMealOn ? 'on' : 'off',
              extra: meal.extraMealCount || 0
            }
          }
        })
        
        setMealManagement(prev => ({
          ...prev,
          [userId]: transformedData
        }))
        
        // Automatically expand the meal controls after loading
        setExpandedMealControls(prev => ({
          ...prev,
          [userId]: true
        }))
        
        showNotification('success', 'Meal data loaded successfully!')
      } else {
        showNotification('error', 'Failed to load meal data')
      }
    } catch (error) {
      showNotification('error', 'Failed to load meal data - network error')
    }
  }

  const updateMemberMeal = async (userId: string, mealType: string, field: string, value: any) => {
    try {
      // Update local state immediately for better UX
      const currentData = mealManagement[userId] || {
        userId,
        date: new Date().toISOString().split('T')[0],
        breakfast: { status: 'off', extra: 0 },
        lunch: { status: 'off', extra: 0 },
        dinner: { status: 'off', extra: 0 }
      }

      const updatedMeal = {
        ...currentData[mealType],
        [field]: value
      }

      const updatedData = {
        ...currentData,
        [mealType]: updatedMeal
      }
      
      setMealManagement(prev => ({
        ...prev,
        [userId]: updatedData
      }))
      
      // Mark as having unsaved changes
      setUnsavedChanges(prev => ({
        ...prev,
        [userId]: true
      }))
      
    } catch (error) {
      showNotification('error', 'Error updating meal. Please try again.')
    }
  }

  const saveMemberMealChanges = async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      const today = new Date().toISOString().split('T')[0]
      
      const memberData = mealManagement[userId]
      if (!memberData) {
        showNotification('error', 'No meal data to save')
        return
      }

      // Save each meal type
      const mealTypes = ['breakfast', 'lunch', 'dinner']
      const promises = mealTypes.map(async (mealType) => {
        const mealData = memberData[mealType]
        if (!mealData) return

        // Convert our format to API format
        const isMealOn = mealData.status === 'on'
        const extraMealCount = mealData.extra || 0

        const response = await fetch('/api/meal-attendance', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            targetUserId: userId, // For admin override
            date: today,
            mealSlot: mealType,
            isMealOn,
            extraMealCount,
            isAdminOverride: true
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to save ${mealType}`)
        }

        return response.json()
      })

      await Promise.all(promises)
      
      // Clear unsaved changes flag
      setUnsavedChanges(prev => ({
        ...prev,
        [userId]: false
      }))
      
      showNotification('success', 'All meal changes saved successfully!')
      
    } catch (error) {
      showNotification('error', 'Error saving meal changes. Please try again.')
    }
  }

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-red-500 text-6xl mb-4">
          <Block style={{ fontSize: '6rem' }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600">Only mess administrators can access settings.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!messData) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-500 text-6xl mb-4">
          <Warning style={{ fontSize: '6rem' }} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Found</h2>
        <p className="text-gray-600">Unable to load mess settings.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 max-w-md w-full mx-auto transition-all duration-500 transform ${
          notification.show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}>
          <div className={`rounded-lg shadow-lg p-4 border-l-4 ${
            notification.type === 'success' 
              ? 'bg-green-50 border-green-400 text-green-800'
              : notification.type === 'error'
              ? 'bg-red-50 border-red-400 text-red-800'
              : 'bg-blue-50 border-blue-400 text-blue-800'
          }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {notification.type === 'success' && (
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'error' && (
                  <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                {notification.type === 'info' && (
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => setNotification(prev => ({ ...prev, show: false }))}
                  className={`inline-flex text-sm ${
                    notification.type === 'success' 
                      ? 'text-green-500 hover:text-green-600'
                      : notification.type === 'error'
                      ? 'text-red-500 hover:text-red-600'
                      : 'text-blue-500 hover:text-blue-600'
                  }`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mess Settings</h1>
            <p className="text-gray-600 mt-1">Manage your mess configuration and members</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Mess Code</p>
            <p className="text-lg font-mono font-bold text-primary-600">{messData.messCode}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'general'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              General Settings
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Manage Members
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">General Settings</h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isEditing
                      ? 'bg-gray-500 text-white hover:bg-gray-600'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {isEditing ? 'Cancel' : 'Edit Settings'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mess Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                    />
                  ) : (
                    <p className="text-lg text-gray-900">{messData.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meal Frequency
                  </label>
                  {isEditing ? (
                    <select
                      value={formData.mealFrequency}
                      onChange={(e) => setFormData({ ...formData, mealFrequency: parseInt(e.target.value) })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                    >
                      <option value={2}>2 Meals/day (Lunch, Dinner)</option>
                      <option value={3}>3 Meals/day (Breakfast, Lunch, Dinner)</option>
                    </select>
                  ) : (
                    <p className="text-lg text-gray-900">
                      {messData.mealFrequency === 2 
                        ? '2 Meals/day (Lunch, Dinner)' 
                        : '3 Meals/day (Breakfast, Lunch, Dinner)'
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Members
                  </label>
                  <p className="text-lg text-gray-900">{messData.members.length}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Active Members
                  </label>
                  <p className="text-lg text-gray-900">
                    {messData.members.filter(m => m.isActive).length}
                  </p>
                </div>
              </div>

              {/* Meal Deadlines Section */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <CalendarToday className="mr-2 text-blue-600" />
                  Meal Attendance Deadlines
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set cutoff times for each meal. After these times, members cannot change their attendance.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {messData.mealFrequency === 3 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Breakfast Deadline
                      </label>
                      {isEditing ? (
                        <input
                          type="time"
                          value={formData.mealDeadlines.breakfast}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            mealDeadlines: { ...formData.mealDeadlines, breakfast: e.target.value } 
                          })}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                        />
                      ) : (
                        <p className="text-lg text-gray-900 font-mono">
                          {(messData.mealDeadlines?.breakfast) || '10:00'} AM
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lunch Deadline
                    </label>
                    {isEditing ? (
                      <input
                        type="time"
                        value={formData.mealDeadlines.lunch}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          mealDeadlines: { ...formData.mealDeadlines, lunch: e.target.value } 
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    ) : (
                      <p className="text-lg text-gray-900 font-mono">
                        {(messData.mealDeadlines?.lunch) || '14:00'} ({formatTimeTo12Hour((messData.mealDeadlines?.lunch) || '14:00')})
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dinner Deadline
                    </label>
                    {isEditing ? (
                      <input
                        type="time"
                        value={formData.mealDeadlines.dinner}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          mealDeadlines: { ...formData.mealDeadlines, dinner: e.target.value } 
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                      />
                    ) : (
                      <p className="text-lg text-gray-900 font-mono">
                        {(messData.mealDeadlines?.dinner) || '20:00'} ({formatTimeTo12Hour((messData.mealDeadlines?.dinner) || '20:00')})
                      </p>
                    )}
                  </div>
                </div>
                
                {!isEditing && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-start">
                      <div className="text-blue-500 text-xl mr-3">ℹ️</div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900">How it works:</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Members can change their meal attendance (on/off/extra) until the deadline. 
                          After the deadline, all attendance becomes locked to help with meal preparation planning.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Stats
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Members
                  </label>
                  <p className="text-lg text-gray-900">{messData.members.length}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Active Members
                  </label>
                  <p className="text-lg text-gray-900">
                    {messData.members.filter(m => m.isActive).length}
                  </p>
                </div>
              </div>

              {isEditing && (
                <div className="flex space-x-4">
                  <button
                    onClick={handleUpdateMess}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      const mealDeadlines = messData.mealDeadlines || {
                        breakfast: '10:00',
                        lunch: '14:00',
                        dinner: '20:00'
                      }
                      setFormData({
                        name: messData.name,
                        mealFrequency: messData.mealFrequency,
                        mealDeadlines: mealDeadlines
                      })
                    }}
                    className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Members Management Tab */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Manage Members</h2>
                <div className="text-sm text-gray-500">
                  {filteredMembers.length} of {messData.members.length} members
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search members by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{messData.members.length}</p>
                    <p className="text-gray-600">Total Members</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {messData.members.filter(m => m.isActive).length}
                    </p>
                    <p className="text-gray-600">Active Members</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {messData.members.filter(m => !m.isActive).length}
                    </p>
                    <p className="text-gray-600">Inactive Members</p>
                  </div>
                </div>
              </div>

              {/* No Results Message */}
              {searchTerm && filteredMembers.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-2">
                    <Search style={{ fontSize: '4rem' }} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No members found</h3>
                  <p className="text-gray-500">Try adjusting your search term</p>
                </div>
              )}

              <div className="space-y-4">
                {filteredMembers.map((member) => {
                  const memberMealData = mealManagement[member.userId]
                  
                  return (
                    <div
                      key={member.userId}
                      className={`border rounded-lg p-4 ${
                        member.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Member Info */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className={`text-lg font-semibold ${
                                member.isActive ? 'text-gray-900' : 'text-gray-500'
                              }`}>
                                {member.name}
                              </h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                member.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {member.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className={`text-sm ${member.isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                              {member.email} • {member.phone}
                            </p>
                            <p className={`text-xs ${member.isActive ? 'text-gray-500' : 'text-gray-400'}`}>
                              Joined: {new Date(member.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            {member.isActive && (
                              <button
                                onClick={() => {
                                  if (!memberMealData) {
                                    fetchMemberMealData(member.userId)
                                  } else {
                                    // Toggle meal controls visibility
                                    setExpandedMealControls(prev => ({
                                      ...prev,
                                      [member.userId]: !prev[member.userId]
                                    }))
                                  }
                                }}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                              >
                                {!memberMealData 
                                  ? 'Load Meals' 
                                  : expandedMealControls[member.userId] 
                                    ? 'Hide Controls' 
                                    : 'Show Controls'
                                }
                              </button>
                            )}
                            <button
                              onClick={() => handleMemberToggle(member.userId, member.isActive)}
                              className={`px-4 py-2 rounded-lg font-medium ${
                                member.isActive
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {member.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </div>

                        {/* Meal Management Controls */}
                        {memberMealData && member.isActive && expandedMealControls[member.userId] && (
                          <div className="border-t pt-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Today's Meal Management</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Breakfast (if 3 meals) */}
                              {messData.mealFrequency === 3 && (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <h5 className="font-medium text-sm text-gray-900 mb-2">Breakfast</h5>
                                  <div className="space-y-2">
                                    <select
                                      value={memberMealData.breakfast?.status || 'off'}
                                      onChange={(e) => updateMemberMeal(member.userId, 'breakfast', 'status', e.target.value)}
                                      className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 text-gray-900 bg-white"
                                    >
                                      <option value="off">Off</option>
                                      <option value="on">On</option>
                                    </select>
                                    <div className="flex items-center space-x-2">
                                      <label className="text-xs text-gray-600">Extra:</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="5"
                                        value={memberMealData.breakfast?.extra || 0}
                                        onChange={(e) => updateMemberMeal(member.userId, 'breakfast', 'extra', parseInt(e.target.value) || 0)}
                                        className="w-16 text-xs p-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 text-gray-900 bg-white"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Lunch */}
                              <div className="bg-gray-50 rounded-lg p-3">
                                <h5 className="font-medium text-sm text-gray-900 mb-2">Lunch</h5>
                                <div className="space-y-2">
                                  <select
                                    value={memberMealData.lunch?.status || 'off'}
                                    onChange={(e) => updateMemberMeal(member.userId, 'lunch', 'status', e.target.value)}
                                    className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 text-gray-900 bg-white"
                                  >
                                    <option value="off">Off</option>
                                    <option value="on">On</option>
                                  </select>
                                  <div className="flex items-center space-x-2">
                                    <label className="text-xs text-gray-600">Extra:</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="5"
                                      value={memberMealData.lunch?.extra || 0}
                                      onChange={(e) => updateMemberMeal(member.userId, 'lunch', 'extra', parseInt(e.target.value) || 0)}
                                      className="w-16 text-xs p-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 text-gray-900 bg-white"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Dinner */}
                              <div className="bg-gray-50 rounded-lg p-3">
                                <h5 className="font-medium text-sm text-gray-900 mb-2">Dinner</h5>
                                <div className="space-y-2">
                                  <select
                                    value={memberMealData.dinner?.status || 'off'}
                                    onChange={(e) => updateMemberMeal(member.userId, 'dinner', 'status', e.target.value)}
                                    className="w-full text-xs p-2 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 text-gray-900 bg-white"
                                  >
                                    <option value="off">Off</option>
                                    <option value="on">On</option>
                                  </select>
                                  <div className="flex items-center space-x-2">
                                    <label className="text-xs text-gray-600">Extra:</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="5"
                                      value={memberMealData.dinner?.extra || 0}
                                      onChange={(e) => updateMemberMeal(member.userId, 'dinner', 'extra', parseInt(e.target.value) || 0)}
                                      className="w-16 text-xs p-1 border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 text-gray-900 bg-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-3">
                              <p className="text-xs text-gray-500">
                                <LightbulbOutlined className="mr-1 text-blue-500" style={{ fontSize: '1rem' }} />
                                Admin can override meal deadlines and manage meals for any member
                              </p>
                              <div className="flex space-x-2">
                                {unsavedChanges[member.userId] && (
                                  <span className="text-xs text-orange-600 font-medium">
                                    Unsaved changes
                                  </span>
                                )}
                                <button
                                  onClick={() => saveMemberMealChanges(member.userId)}
                                  disabled={!unsavedChanges[member.userId]}
                                  className={`px-3 py-1 text-xs rounded-lg font-medium ${
                                    unsavedChanges[member.userId]
                                      ? 'bg-green-600 text-white hover:bg-green-700'
                                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  }`}
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
