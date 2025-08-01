'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function MessSetup() {
  const [activeTab, setActiveTab] = useState('join')
  const router = useRouter()

  useEffect(() => {
    // Check if user has token
    const token = localStorage.getItem('token')
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to MealNChill!</h1>
          <p className="text-gray-600 text-lg">
            You're just one step away from managing your meals efficiently.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b">
            <button
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'join'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('join')}
            >
              Join Existing Mess
            </button>
            <button
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                activeTab === 'create'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('create')}
            >
              Create New Mess
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'join' ? (
              <JoinMessForm setActiveTab={setActiveTab} />
            ) : activeTab === 'waiting' ? (
              <WaitingForApproval />
            ) : (
              <CreateMessForm />
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function JoinMessForm({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [messCode, setMessCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/mess/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ messCode }),
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.waitingForApproval) {
          // Show waiting for approval message
          setActiveTab('waiting')
          setError('')
        } else {
          // Update token if provided
          if (data.token) {
            localStorage.setItem('token', data.token)
          }
          
          router.push('/') // Redirect to home page (which is now the dashboard)
        }
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to join mess')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Join an Existing Mess</h2>
      <p className="text-gray-600 mb-6">
        Enter the mess code provided by your mess administrator to join.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="messCode" className="block text-sm font-medium text-gray-700 mb-1">
            Mess Code
          </label>
          <input
            type="text"
            id="messCode"
            value={messCode}
            onChange={(e) => setMessCode(e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
            placeholder="Enter mess code (e.g., MESS123)"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Joining...' : 'Join Mess'}
        </button>
      </form>
    </div>
  )
}

function CreateMessForm() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    mealFrequency: 2,
    adminIsActive: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'radio' ? parseInt(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('token')
      
      const response = await fetch('/api/mess/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update token if provided
        if (data.token) {
          localStorage.setItem('token', data.token)
        }
        
        router.push('/') // Redirect to home page (which is now the dashboard)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to create mess')
      }
    } catch (error) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Create a New Mess</h2>
      <p className="text-gray-600 mb-6">
        Set up a new mess facility and become its administrator.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Mess Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
            placeholder="Enter mess name"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (Optional)
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
            placeholder="Brief description of your mess"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
            placeholder="Enter mess address"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Daily Meal Frequency
          </label>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="mealFrequency"
                value={2}
                checked={formData.mealFrequency === 2}
                onChange={handleChange}
                className="mr-3 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700">
                <strong>2 Meals per day</strong> (Lunch and Dinner)
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="mealFrequency"
                value={3}
                checked={formData.mealFrequency === 3}
                onChange={handleChange}
                className="mr-3 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-gray-700">
                <strong>3 Meals per day</strong> (Breakfast, Lunch, and Dinner)
              </span>
            </label>
          </div>
        </div>

        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              name="adminIsActive"
              checked={formData.adminIsActive}
              onChange={handleChange}
              className="mr-3 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-gray-700">
              <strong>I will also eat meals from this mess</strong>
              <br />
              <small className="text-gray-500">As the admin, check this if you'll be participating in meals</small>
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Creating...' : 'Create Mess'}
        </button>
      </form>
    </div>
  )
}

function WaitingForApproval() {
  const [isChecking, setIsChecking] = useState(false)
  const router = useRouter()

  const checkApprovalStatus = async () => {
    setIsChecking(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/user/join-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.hasMessId && data.isActive) {
          // User has been approved, redirect to dashboard
          router.push('/')
        } else if (!data.isPending) {
          // Request was rejected, go back to join form
          window.location.reload()
        }
      }
    } catch (error) {
      console.error('Error checking approval status:', error)
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    // Check status every 30 seconds
    const interval = setInterval(checkApprovalStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="text-center">
      <div className="mb-6">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Waiting for Approval</h2>
        <p className="text-gray-600 mb-4">
          Your join request has been sent to the mess admin. You'll be notified once your request is approved.
        </p>
        <p className="text-sm text-gray-500">
          Please ask your admin or meal manager to approve your request.
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={checkApprovalStatus}
          disabled={isChecking}
          className="bg-primary-600 text-white py-2 px-6 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isChecking ? 'Checking...' : 'Check Status'}
        </button>

        <button
          onClick={() => window.location.reload()}
          className="block mx-auto text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          Try Different Mess Code
        </button>
      </div>
    </div>
  )
}
