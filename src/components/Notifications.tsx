'use client'

import {
    Add,
    Block,
    Campaign,
    CreditCard,
    MonetizationOn,
    NotificationsNone,
    Warning
} from '@mui/icons-material'
import { useCallback, useEffect, useState } from 'react'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  priority: string
  createdAt: string
  relatedData?: any
}

interface ConfirmationModal {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  type: 'warning' | 'info' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

interface NotificationsProps {
  messId: string
  userId: string
  onNotificationRead?: () => void
}

export default function Notifications({ messId, userId, onNotificationRead }: NotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/notifications?filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId 
              ? { ...notification, isRead: true }
              : notification
          )
        )
        // Call the callback to refresh the notification count in dashboard
        if (onNotificationRead) {
          onNotificationRead()
        }
      }
    } catch (error) {
      // Handle error silently
    }
  }

  // Confirmation modal functions
  const showConfirmation = (options: Omit<ConfirmationModal, 'isOpen'>) => {
    setConfirmationModal({
      ...options,
      isOpen: true
    })
  }

  const hideConfirmation = () => {
    setConfirmationModal(null)
  }

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const unreadCount = notifications.filter(n => !n.isRead).length
    if (unreadCount === 0) return
    
    showConfirmation({
      title: 'Mark All as Read',
      message: `Are you sure you want to mark all ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''} as read?`,
      confirmText: 'Mark All Read',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: async () => {
        hideConfirmation()
        await executeMarkAllAsRead()
      },
      onCancel: hideConfirmation
    })
  }

  const executeMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, isRead: true }))
        )
        // Call the callback to refresh the notification count in dashboard
        if (onNotificationRead) {
          onNotificationRead()
        }
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meal_off':
        return <Block className="text-red-500" />
      case 'extra_meal':
        return <Add className="text-green-500" />
      case 'low_inventory':
        return <Warning className="text-yellow-500" />
      case 'deposit_status':
        return <MonetizationOn className="text-blue-500" />
      case 'dues_reminder':
        return <CreditCard className="text-purple-500" />
      default:
        return <Campaign className="text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50'
      case 'medium':
        return 'border-yellow-200 bg-yellow-50'
      case 'low':
        return 'border-gray-200 bg-gray-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

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
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-semibold text-gray-900">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
            className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
          </select>
          
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">
            <NotificationsNone style={{ fontSize: '4rem' }} />
          </div>
          <h4 className="text-lg font-medium text-gray-600 mb-2">No notifications</h4>
          <p className="text-gray-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                notification.isRead 
                  ? 'border-gray-200 bg-gray-50' 
                  : getPriorityColor(notification.priority)
              } ${!notification.isRead ? 'hover:shadow-md' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (!notification.isRead) markAsRead(notification.id)
              }}
            >
              <div className="flex items-start space-x-3">
                <div className="text-2xl flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm font-medium ${
                      notification.isRead ? 'text-gray-700' : 'text-gray-900'
                    }`}>
                      {notification.title}
                    </h4>
                    <span className={`text-xs ${
                      notification.isRead ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>
                  
                  <p className={`text-sm ${
                    notification.isRead ? 'text-gray-600' : 'text-gray-800'
                  }`}>
                    {notification.message}
                  </p>
                  
                  {!notification.isRead && (
                    <div className="mt-2">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {confirmationModal.title}
            </h3>
            <p className="text-gray-700 mb-6">
              {confirmationModal.message}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={confirmationModal.onCancel}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                {confirmationModal.cancelText}
              </button>
              <button
                onClick={confirmationModal.onConfirm}
                className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 ${
                  confirmationModal.type === 'danger' 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : confirmationModal.type === 'warning'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmationModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
