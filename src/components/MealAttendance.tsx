'use client'

import {
  AccessTime,
  AdminPanelSettings,
  Assignment,
  BarChart,
  Block,
  CalendarMonth,
  CheckCircle,
  Close,
  DateRange,
  Email,
  GpsFixed,
  HourglassTop,
  Info,
  Kitchen,
  Person,
  Restaurant,
  Save,
  TableChart,
  Undo,
  Warning
} from '@mui/icons-material'
import { useCallback, useEffect, useState } from 'react'

interface AttendanceData {
  mealSlot: string
  mealName: string
  isMealOn: boolean
  extraMealCount: number
  isMealPrepared?: boolean
}

interface MealSummary {
  mealSlot: string
  mealName: string
  totalStandardMeals: number
  totalExtraMeals: number
  overallTotalMeals: number
  isMealPrepared?: boolean
}

interface DeadlineStatus {
  deadline: string
  isPassed: boolean
  canModify: boolean
}

interface ToastNotification {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface ConfirmationModal {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  type?: 'warning' | 'danger' | 'info'
}

interface InventoryItem {
  _id: string
  itemName: string
  category: string
  quantity: number
  unit: string
  lastUpdated: string
}

interface InventoryDeductionItem {
  itemId: string
  itemName: string
  currentQuantity: number
  quantityToDeduct: number
  unit: string
}

interface InventoryUpdateItem {
  status: 'restored' | 'deducted'
  item: string
  restored: number
  unit: string
}

interface InventoryModal {
  isOpen: boolean
  mealSlot: string
  totalMeals: number
  onConfirm: (items: InventoryDeductionItem[]) => void
  onCancel: () => void
}

interface MealAttendanceProps {
  messId: string
  userId: string
  mealFrequency: number
  isAdmin: boolean
}

interface Member {
  userId: string
  name: string
  email: string
  isActive: boolean
}

interface MealCalendarData {
  date: string
  userId: string
  userName: string
  breakfast: { status: boolean; extra: number }
  lunch: { status: boolean; extra: number }
  dinner: { status: boolean; extra: number }
  totalMeals: number
}

export default function MealAttendance({ messId, userId, mealFrequency, isAdmin }: MealAttendanceProps) {
  const [attendance, setAttendance] = useState<AttendanceData[]>([])
  const [mealSummary, setMealSummary] = useState<MealSummary[]>([])
  const [deadlineStatus, setDeadlineStatus] = useState<Record<string, DeadlineStatus>>({})
  const [mealDeadlines, setMealDeadlines] = useState<{ breakfast: string, lunch: string, dinner: string }>({
    breakfast: '10:00',
    lunch: '14:00',
    dinner: '20:00'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [updatingStates, setUpdatingStates] = useState<{ [key: string]: boolean }>({})
  const [toasts, setToasts] = useState<ToastNotification[]>([])
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal | null>(null)
  const [inventoryModal, setInventoryModal] = useState<InventoryModal | null>(null)
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<InventoryDeductionItem[]>([])
  const [isUserActive, setIsUserActive] = useState<boolean>(true) // Track if user is active

  // Local state for pending changes (not yet saved)
  const [pendingChanges, setPendingChanges] = useState<{ [key: string]: { isMealOn?: boolean, extraMealCount?: number } }>({})
  const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>({})

  // Meal Calendar state variables
  const [showMealCalendar, setShowMealCalendar] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState<string>('all') // 'all' or specific userId
  const [calendarDateRange, setCalendarDateRange] = useState<'week' | 'month' | 'custom'>('week')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [mealCalendarData, setMealCalendarData] = useState<MealCalendarData[]>([])
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false)

  // Always use current date in Bangladesh timezone
  const getCurrentDateStr = () => {
    // Get current date in Bangladesh timezone (GMT+6)
    const now = new Date()
    const bangladeshTime = new Date(now.getTime() + (6 * 60 * 60 * 1000)) // Add 6 hours for GMT+6
    return bangladeshTime.toISOString().split('T')[0]
  }

  // Helper functions for meal calendar
  const getDateRange = () => {
    // Use Bangladesh timezone for consistency with API
    const today = new Date()
    const bangladeshOffset = 6 * 60 // Bangladesh is UTC+6
    const bangladeshTime = new Date(today.getTime() + (bangladeshOffset * 60 * 1000))
    
    let startDate: string
    let endDate: string

    switch (calendarDateRange) {
      case 'week':
        // Get last 7 days
        const weekStart = new Date(bangladeshTime)
        weekStart.setDate(bangladeshTime.getDate() - 6)
        startDate = weekStart.toISOString().split('T')[0]
        endDate = bangladeshTime.toISOString().split('T')[0]
        break
      case 'month':
        // Get last 30 days
        const monthStart = new Date(bangladeshTime)
        monthStart.setDate(bangladeshTime.getDate() - 29)
        startDate = monthStart.toISOString().split('T')[0]
        endDate = bangladeshTime.toISOString().split('T')[0]
        break
      case 'custom':
        startDate = customStartDate || bangladeshTime.toISOString().split('T')[0]
        endDate = customEndDate || bangladeshTime.toISOString().split('T')[0]
        break
      default:
        startDate = bangladeshTime.toISOString().split('T')[0]
        endDate = bangladeshTime.toISOString().split('T')[0]
    }

    console.log('📅 Frontend date range calculation:', { 
      calendarDateRange, 
      startDate, 
      endDate,
      bangladeshTime: bangladeshTime.toISOString(),
      utcTime: today.toISOString()
    })

    return { startDate, endDate }
  }

  // Fetch members list
  const fetchMembers = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/members', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setMembers(data.members || [])
      }
    } catch (error) {
      console.error('Error fetching members:', error)
    }
  }, [])

  // Fetch meal calendar data
  const fetchMealCalendarData = useCallback(async () => {
    try {
      setIsLoadingCalendar(true)
      const { startDate, endDate } = getDateRange()
      const token = localStorage.getItem('token')
      
      let apiUrl = `/api/meal-attendance/calendar?startDate=${startDate}&endDate=${endDate}`
      if (selectedMember !== 'all') {
        apiUrl += `&userId=${selectedMember}`
      }
      
      console.log('🔄 Fetching calendar data:', { apiUrl, startDate, endDate, selectedMember })
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      
      console.log('📡 API Response:', { status: response.status, ok: response.ok })
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Calendar data received:', { 
          success: data.success, 
          dataLength: data.calendarData?.length || 0,
          sampleData: data.calendarData?.slice(0, 2) || []
        })
        setMealCalendarData(data.calendarData || [])
        if (data.calendarData?.length > 0) {
          showToast(`Loaded ${data.calendarData.length} meal records`, 'success')
        } else {
          showToast('No meal data found for the selected period', 'info')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('❌ API Error:', errorData)
        showToast(`Error fetching meal calendar data: ${errorData.error || 'Unknown error'}`, 'error')
      }
    } catch (error) {
      console.error('❌ Network Error:', error)
      showToast(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      setIsLoadingCalendar(false)
    }
  }, [selectedMember, calendarDateRange, customStartDate, customEndDate])

  // Generate date array for the selected range
  const generateDateArray = () => {
    const { startDate, endDate } = getDateRange()
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dates = []
    
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      dates.push(new Date(date).toISOString().split('T')[0])
    }
    
    return dates.reverse() // Show most recent first
  }

  // Deadline calculation function
  const calculateDeadlineStatus = useCallback((mealSlot: string): DeadlineStatus => {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    let deadlineTimeStr: string

    // Get deadline from mess settings
    switch (mealSlot) {
      case 'breakfast':
        deadlineTimeStr = mealDeadlines.breakfast
        break
      case 'lunch':
        deadlineTimeStr = mealDeadlines.lunch
        break
      case 'dinner':
        deadlineTimeStr = mealDeadlines.dinner
        break
      default:
        deadlineTimeStr = mealDeadlines.dinner
    }

    // Parse the deadline time (format: "HH:MM" or "HH:mm")
    const [deadlineHourStr, deadlineMinuteStr] = deadlineTimeStr.split(':')
    const deadlineHour = parseInt(deadlineHourStr, 10)
    const deadlineMinute = parseInt(deadlineMinuteStr, 10)

    // Format deadline label (convert 24-hour to 12-hour format)
    const deadlineLabel = formatTimeToAMPM(deadlineHour, deadlineMinute)

    // Calculate if deadline has passed
    const currentTime = currentHour * 60 + currentMinute
    const deadlineTime = deadlineHour * 60 + deadlineMinute
    const isPassed = currentTime > deadlineTime

    // Admins can always modify, regular users can't modify after deadline
    const canModify = isAdmin || !isPassed

    return {
      deadline: deadlineLabel,
      isPassed,
      canModify
    }
  }, [mealDeadlines, isAdmin])

  // Helper function to format time to AM/PM
  const formatTimeToAMPM = (hour: number, minute: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const displayMinute = minute.toString().padStart(2, '0')
    return `${displayHour}:${displayMinute} ${ampm}`
  }

  // Update deadline status for all meal slots
  const updateDeadlineStatus = useCallback(() => {
    const newDeadlineStatus: Record<string, DeadlineStatus> = {}
    const slots = mealFrequency === 3
      ? [{ key: 'breakfast', name: 'Breakfast' }, { key: 'lunch', name: 'Lunch' }, { key: 'dinner', name: 'Dinner' }]
      : [{ key: 'lunch', name: 'Lunch' }, { key: 'dinner', name: 'Dinner' }]

    slots.forEach(slot => {
      newDeadlineStatus[slot.key] = calculateDeadlineStatus(slot.key)
    })
    setDeadlineStatus(newDeadlineStatus)
  }, [mealFrequency, calculateDeadlineStatus])

  // Fetch mess settings to get meal deadlines
  const fetchMessSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/mess/settings?messId=${messId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()

        if (data.mess && data.mess.mealDeadlines) {
          const newDeadlines = {
            breakfast: data.mess.mealDeadlines.breakfast || '10:00',
            lunch: data.mess.mealDeadlines.lunch || '14:00',
            dinner: data.mess.mealDeadlines.dinner || '20:00'
          }
          setMealDeadlines(newDeadlines)
        }
      } else {
        // Handle error silently
      }
    } catch (error) {
      // Handle error silently
    }
  }, [messId])

  // Fetch user's active status from mess members
  const fetchUserActiveStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/mess/${messId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const currentUserMember = data.mess?.members?.find((member: any) => 
          member.userId.toString() === userId
        )
        if (currentUserMember) {
          setIsUserActive(currentUserMember.isActive !== false) // Default to true if not specified
        }
      }
    } catch (error) {
      // Handle error silently, default to active
      setIsUserActive(true)
    }
  }, [messId, userId])

  // Set up real-time deadline checking
  useEffect(() => {
    updateDeadlineStatus()

    // Update deadline status every minute
    const deadlineInterval = setInterval(updateDeadlineStatus, 60000)

    return () => clearInterval(deadlineInterval)
  }, [updateDeadlineStatus])

  const mealSlots = mealFrequency === 3
    ? [{ key: 'breakfast', name: 'Breakfast' }, { key: 'lunch', name: 'Lunch' }, { key: 'dinner', name: 'Dinner' }]
    : [{ key: 'lunch', name: 'Lunch' }, { key: 'dinner', name: 'Dinner' }]

  const fetchAttendanceData = useCallback(async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')
      const dateStr = getCurrentDateStr()

      const response = await fetch(`/api/meal-attendance?date=${dateStr}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAttendance(data.userAttendance)
        setMealSummary(data.mealSummary)

        // Clear any pending changes when we get fresh data
        setPendingChanges({})
      } else {
        // Handle error silently
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }, [messId])

  // Fetch inventory items
  const fetchInventoryItems = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/inventory', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setInventoryItems(data.inventory || [])
      }
    } catch (error) {
      // Handle error silently
    }
  }, [])

  useEffect(() => {
    // Fetch both mess settings and attendance data on component mount
    const initializeData = async () => {
      await fetchMessSettings() // Fetch mess settings first
      await fetchUserActiveStatus() // Fetch user's active status
      await fetchAttendanceData() // Then fetch attendance data
    }

    initializeData()
  }, [fetchMessSettings, fetchUserActiveStatus, fetchAttendanceData])

  // Fetch members for meal calendar
  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // Initialize calendar date range
  useEffect(() => {
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(today.getDate() - 6)
    
    if (!customStartDate) {
      setCustomStartDate(weekAgo.toISOString().split('T')[0])
    }
    if (!customEndDate) {
      setCustomEndDate(today.toISOString().split('T')[0])
    }
  }, [])

  // Toggle functions that only update local state (no API call)
  const toggleMealStatus = (mealSlot: string, currentValue: boolean) => {
    // Check if user is deactivated
    if (!isUserActive && !isAdmin) {
      showToast(
        'You are deactivated by admin. Please ask admin to activate your meals.',
        'warning'
      )
      return
    }

    const deadline = deadlineStatus[mealSlot]
    const summary = getSummaryForSlot(mealSlot)

    // Check if meal has been prepared/performed
    if (summary?.isMealPrepared && !isAdmin) {
      showToast(
        `Cannot modify ${mealSlot} attendance. This meal has already been prepared and served. Contact admin if needed.`,
        'error'
      )
      return
    }

    if (!deadline?.canModify && !isAdmin) {
      showToast(
        `Cannot modify ${mealSlot} attendance after ${deadline?.deadline}. Contact admin if needed.`,
        'error'
      )
      return
    }

    const newValue = !currentValue
    setPendingChanges(prev => ({
      ...prev,
      [mealSlot]: {
        ...prev[mealSlot],
        isMealOn: newValue
      }
    }))
  }

  const updateExtraMealCount = (mealSlot: string, count: number) => {
    // Check if user is deactivated
    if (!isUserActive && !isAdmin) {
      showToast(
        'You are deactivated by admin. Please ask admin to activate your meals.',
        'warning'
      )
      return
    }

    const deadline = deadlineStatus[mealSlot]
    const summary = getSummaryForSlot(mealSlot)

    // Check if meal has been prepared/performed
    if (summary?.isMealPrepared && !isAdmin) {
      showToast(
        `Cannot modify ${mealSlot} extra meal. This meal has already been prepared and served. Contact admin if needed.`,
        'error'
      )
      return
    }

    if (!deadline?.canModify && !isAdmin) {
      showToast(
        `Cannot modify ${mealSlot} extra meal after ${deadline?.deadline}. Contact admin if needed.`,
        'error'
      )
      return
    }

    // Ensure count is within valid range
    const validCount = Math.max(0, Math.min(10, count))


    setPendingChanges(prev => ({
      ...prev,
      [mealSlot]: {
        ...prev[mealSlot],
        extraMealCount: validCount
      }
    }))
  }

  // Save function that sends changes to API
  const saveAttendanceChanges = async (mealSlot: string) => {
    // Check if user is deactivated
    if (!isUserActive && !isAdmin) {
      showToast(
        'You are deactivated by admin. Please ask admin to activate your meals.',
        'warning'
      )
      return
    }

    const changes = pendingChanges[mealSlot]
    if (!changes) {

      return
    }


    setSavingStates(prev => ({ ...prev, [mealSlot]: true }))

    try {
      const token = localStorage.getItem('token')
      const dateStr = getCurrentDateStr()

      const requestData = {
        date: dateStr,
        mealSlot,
        ...changes
      }



      const response = await fetch('/api/meal-attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData)
      })


      const responseData = await response.json()


      if (response.ok) {


        // Clear pending changes for this meal slot
        setPendingChanges(prev => {
          const newChanges = { ...prev }
          delete newChanges[mealSlot]
          return newChanges
        })

        // Fetch latest data to get updated summary and sync state

        await fetchAttendanceData()

      } else {

        console.error('Failed to save changes. Please try again.')
      }
    } catch (error) {

      console.error('Error saving changes. Please try again.')
    } finally {
      setSavingStates(prev => ({ ...prev, [mealSlot]: false }))
    }
  }

  // Helper function to get the current value (with pending changes applied)
  const getCurrentMealOn = (mealSlot: string): boolean => {
    const attendanceData = getAttendanceForSlot(mealSlot)
    const serverValue = attendanceData?.isMealOn ?? true
    const pendingValue = pendingChanges[mealSlot]?.isMealOn
    return pendingValue !== undefined ? pendingValue : serverValue
  }

  const getCurrentExtraMealCount = (mealSlot: string): number => {
    const attendanceData = getAttendanceForSlot(mealSlot)
    const serverValue = attendanceData?.extraMealCount ?? 0
    const pendingValue = pendingChanges[mealSlot]?.extraMealCount
    return pendingValue !== undefined ? pendingValue : serverValue
  }

  // Helper function to check if there are unsaved changes for a meal slot
  const hasUnsavedChanges = (mealSlot: string) => {
    return pendingChanges[mealSlot] && Object.keys(pendingChanges[mealSlot]).length > 0
  }

  // Helper function to get attendance for a specific slot
  const getAttendanceForSlot = (mealSlot: string) => {
    return attendance.find(a => a.mealSlot === mealSlot)
  }

  const getSummaryForSlot = (slot: string) => {
    return mealSummary.find(s => s.mealSlot === slot)
  }

  const formatDate = (date: Date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return `${days[date.getDay()]}, ${date.toLocaleDateString()}`
  }

  // Toast notification system
  const showToast = (message: string, type: ToastNotification['type'] = 'info') => {
    const id = Date.now().toString()
    const toast: ToastNotification = { id, message, type }
    setToasts(prev => [...prev, toast])

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 5000)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Confirmation modal functions
  const showConfirmation = (options: Omit<ConfirmationModal, 'isOpen'>) => {
    setConfirmationModal({ ...options, isOpen: true })
  }

  const hideConfirmation = () => {
    setConfirmationModal(null)
  }

  // Mark meal as prepared/served and deduct inventory
  const markMealAsPrepared = async (mealSlot: string) => {
    const summary = getSummaryForSlot(mealSlot)
    if (!summary || summary.overallTotalMeals === 0) {
      showToast('No meals to prepare for this slot.', 'warning')
      return
    }

    if (summary.isMealPrepared) {
      showToast('This meal has already been marked as prepared.', 'warning')
      return
    }

    // Fetch inventory items first
    await fetchInventoryItems()

    // Show inventory deduction modal
    setSelectedInventoryItems([]) // Reset selected items
    setInventoryModal({
      isOpen: true,
      mealSlot,
      totalMeals: summary.overallTotalMeals,
      onConfirm: (selectedItems) => {
        setInventoryModal(null)
        // Now show the preparation confirmation with the selected inventory items
        showPreparationConfirmation(mealSlot, selectedItems)
      },
      onCancel: () => {
        setInventoryModal(null)
        setSelectedInventoryItems([])
      }
    })
  }

  // Show preparation confirmation after inventory selection
  const showPreparationConfirmation = (mealSlot: string, inventoryItems: InventoryDeductionItem[]) => {
    const itemsText = inventoryItems.length > 0
      ? `\n\nInventory items to be deducted:\n${inventoryItems.map(item => `• ${item.quantityToDeduct} ${item.unit} of ${item.itemName}`).join('\n')}`
      : '\n\nNo inventory items will be deducted.'

    showConfirmation({
      title: 'Mark Meal as Prepared',
      message: `Mark ${mealSlot} as prepared and served?${itemsText}`,
      confirmText: 'Mark as Prepared',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        hideConfirmation()
        await executeMealPreparation(mealSlot, inventoryItems)
      },
      onCancel: hideConfirmation
    })
  }

  const executeMealPreparation = async (mealSlot: string, inventoryItems: InventoryDeductionItem[] = []) => {
    setUpdatingStates(prev => ({ ...prev, [`${mealSlot}_preparing`]: true }))

    try {
      const token = localStorage.getItem('token')
      const dateStr = getCurrentDateStr()

      const requestBody = {
        date: dateStr,
        mealSlot,
        inventoryItems: inventoryItems.map(item => ({
          itemId: item.itemId,
          quantityToDeduct: item.quantityToDeduct
        }))
      }

      const response = await fetch('/api/meal-preparation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody)
      })

      const responseData = await response.json()

      if (response.ok) {
        if (inventoryItems.length > 0) {
          const itemsList = inventoryItems.map(item => `${item.quantityToDeduct} ${item.unit} of ${item.itemName}`).join(', ')
          showToast(`${mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)} marked as prepared! Inventory items have been deducted: ${itemsList}`, 'success')
        } else {
          showToast(`${mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)} marked as prepared successfully!`, 'success')
        }
        // Refresh data to show updated status
        await fetchAttendanceData()
      } else {
        showToast(`Failed to mark meal as prepared: ${responseData.message || 'Unknown error'}`, 'error')
      }
    } catch (error) {

      showToast('Error marking meal as prepared. Please try again.', 'error')
    } finally {
      setUpdatingStates(prev => ({ ...prev, [`${mealSlot}_preparing`]: false }))
    }
  }

  const markMealAsUndone = async (mealSlot: string) => {
    const summary = getSummaryForSlot(mealSlot)
    if (!summary || !summary.isMealPrepared) {
      showToast('This meal has not been marked as prepared yet.', 'warning')
      return
    }

    // Show in-app confirmation modal
    showConfirmation({
      title: 'Mark Meal as Not Served',
      message: `Mark ${mealSlot} as not served? This will restore the inventory items that were deducted.`,
      confirmText: 'Mark as Not Served',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        hideConfirmation()
        await executeMealUndone(mealSlot)
      },
      onCancel: hideConfirmation
    })
  }

  const executeMealUndone = async (mealSlot: string) => {
    setUpdatingStates(prev => ({ ...prev, [`${mealSlot}_undoing`]: true }))

    try {
      const token = localStorage.getItem('token')
      const dateStr = getCurrentDateStr()

      const response = await fetch('/api/meal-preparation', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: dateStr,
          mealSlot,
        })
      })

      const responseData = await response.json()

      if (response.ok) {
        // Check if inventory items were restored from the response
        if (responseData.inventoryUpdates && responseData.inventoryUpdates.length > 0) {
          const restoredItems = (responseData.inventoryUpdates as InventoryUpdateItem[])
            .filter((update: InventoryUpdateItem) => update.status === 'restored')
            .map((update: InventoryUpdateItem) => `${update.restored} ${update.unit} of ${update.item}`)
            .join(', ')

          if (restoredItems) {
            showToast(`${mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)} marked as not served! Inventory items have been restored: ${restoredItems}`, 'success')
          } else {
            showToast(`${mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)} marked as not served!`, 'success')
          }
        } else {
          showToast(`${mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)} marked as not served!`, 'success')
        }
        // Refresh data to show updated status
        await fetchAttendanceData()
      } else {
        showToast(`Failed to mark meal as not served: ${responseData.message || 'Unknown error'}`, 'error')
      }
    } catch (error) {

      showToast('Error marking meal as undone. Please try again.', 'error')
    } finally {
      setUpdatingStates(prev => ({ ...prev, [`${mealSlot}_undoing`]: false }))
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-4">
            {mealSlots.map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Meal Attendance</h3>
        <p className="text-gray-600">Today - {formatDate(new Date(new Date().getTime() + (6 * 60 * 60 * 1000)))}</p>
        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-semibold flex items-center">
              <Assignment className="mr-1" style={{ fontSize: '1rem' }} />
              Note:
            </span> Meal attendance has deadlines -
            {mealFrequency === 3 && `Breakfast: ${formatTimeToAMPM(parseInt(mealDeadlines.breakfast.split(':')[0]), parseInt(mealDeadlines.breakfast.split(':')[1]))}, `}
            Lunch: {formatTimeToAMPM(parseInt(mealDeadlines.lunch.split(':')[0]), parseInt(mealDeadlines.lunch.split(':')[1]))},
            Dinner: {formatTimeToAMPM(parseInt(mealDeadlines.dinner.split(':')[0]), parseInt(mealDeadlines.dinner.split(':')[1]))}.
            Once a meal is prepared and served by admin, attendance cannot be modified.
            {isAdmin ? (
              <span className="font-medium"> As an admin, you can modify attendance even after deadlines and meal preparation.</span>
            ) : (
              <span> Contact an admin if you need to modify attendance after the deadline or meal preparation.</span>
            )}
          </p>
        </div>
      </div>

      {/* Individual User Attendance */}
      <div className="mb-8">
        <h4 className="text-lg font-medium text-gray-800 mb-4">My Meals Today</h4>
        <div className="space-y-4">
          {mealSlots.map(slot => {
            const isMealOn = getCurrentMealOn(slot.key)
            const extraMealCount = getCurrentExtraMealCount(slot.key)
            const serverAttendance = getAttendanceForSlot(slot.key)
            const hasChanges = hasUnsavedChanges(slot.key)
            const isSaving = savingStates[slot.key]
            const deadline = deadlineStatus[slot.key]
            const summary = getSummaryForSlot(slot.key)
            const isMealPrepared = summary?.isMealPrepared || false

            return (
              <div key={slot.key} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0 mb-3">
                  <div className="flex flex-col space-y-1">
                    <h5 className="font-medium text-gray-900">{slot.name}</h5>
                    <p className="text-sm text-gray-600">{serverAttendance?.mealName || 'No meal planned'}</p>

                    {/* Meal Prepared Status */}
                    {isMealPrepared && (
                      <div className="text-xs font-medium text-blue-600">
                        <span className="flex items-center">
                          <Restaurant className="mr-1" style={{ fontSize: '0.875rem' }} />
                          Meal prepared & served
                        </span>
                      </div>
                    )}

                    {/* Deadline Status */}
                    {deadline && !isMealPrepared && (
                      <div className={`text-xs font-medium ${deadline.isPassed
                          ? 'text-red-600'
                          : 'text-green-600'
                        }`}>
                        {deadline.isPassed ? (
                          <span className="flex items-center">
                            <Block className="mr-1" style={{ fontSize: '0.875rem' }} />
                            Deadline passed ({deadline.deadline})
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <AccessTime className="mr-1" style={{ fontSize: '0.875rem' }} />
                            Deadline: {deadline.deadline}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                    {/* Meal Prepared Badge */}
                    {isMealPrepared && !isAdmin && (
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded font-semibold text-center flex items-center">
                        <Restaurant style={{ fontSize: '0.875rem' }} className="mr-1" />
                        Locked - Meal Served
                      </span>
                    )}
                    {/* Admin Override Badge */}
                    {((deadline?.isPassed || isMealPrepared) && isAdmin) && (
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded font-semibold text-center flex items-center">
                        <AdminPanelSettings style={{ fontSize: '0.875rem' }} className="mr-1" />
                        Admin Override
                      </span>
                    )}
                    {/* Deactivated User Badge */}
                    {!isUserActive && !isAdmin && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded font-semibold text-center flex items-center">
                        <Block style={{ fontSize: '0.875rem' }} className="mr-1" />
                        Deactivated - Contact Admin
                      </span>
                    )}
                    {hasChanges && (
                      <>
                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded font-semibold text-center flex items-center">
                          <Warning style={{ fontSize: '0.875rem' }} className="mr-1" />
                          Unsaved changes
                        </span>
                        <button
                          onClick={() => saveAttendanceChanges(slot.key)}
                          disabled={isSaving}
                          className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 shadow-sm w-full sm:w-auto ${isSaving
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700 text-white hover:shadow-md transform hover:scale-105'
                            }`}
                        >
                          {isSaving ? (
                            <>
                              <Save className="mr-1" style={{ fontSize: '1rem' }} />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-1" style={{ fontSize: '1rem' }} />
                              Save
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6">
                  {/* Meal On/Off Toggle */}
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700 min-w-0 flex-shrink-0">Meal Status:</label>
                    <button
                      onClick={() => toggleMealStatus(slot.key, isMealOn)}
                      disabled={isSaving || (!deadline?.canModify && !isAdmin) || (isMealPrepared && !isAdmin) || (!isUserActive && !isAdmin)}
                      className={`relative inline-flex items-center h-6 rounded-full w-11 transition-all duration-200 transform flex-shrink-0 ${isMealOn ? 'bg-green-600' : 'bg-gray-400'
                        } ${isSaving || (!deadline?.canModify && !isAdmin) || (isMealPrepared && !isAdmin) || (!isUserActive && !isAdmin)
                          ? 'scale-95 opacity-50 cursor-not-allowed'
                          : 'hover:scale-105 active:scale-95'
                        }`}
                    >
                      <span
                        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-all duration-200 ${isMealOn ? 'translate-x-6' : 'translate-x-1'
                          } ${isSaving ? 'animate-pulse' : ''}`}
                      />
                    </button>
                    <span className={`text-sm font-medium transition-colors duration-200 min-w-0 flex items-center ${isMealOn ? 'text-green-600' : 'text-gray-500'
                      }`}>
                      {isMealOn ? (
                        <>
                          <CheckCircle className="mr-1" style={{ fontSize: '1rem' }} />
                          On
                        </>
                      ) : (
                        <>
                          <Close className="mr-1" style={{ fontSize: '1rem' }} />
                          Off
                        </>
                      )}
                    </span>
                  </div>

                  {/* Extra Meal Count */}
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700 min-w-0 flex-shrink-0">Extra:</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateExtraMealCount(slot.key, Math.max(0, extraMealCount - 1))}
                        disabled={isSaving || (!deadline?.canModify && !isAdmin) || (isMealPrepared && !isAdmin) || (!isUserActive && !isAdmin) || extraMealCount <= 0}
                        className="w-8 h-8 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 flex-shrink-0"
                      >
                        −
                      </button>
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={extraMealCount}
                          onChange={(e) => updateExtraMealCount(slot.key, parseInt(e.target.value) || 0)}
                          disabled={isSaving || (!deadline?.canModify && !isAdmin) || (isMealPrepared && !isAdmin) || (!isUserActive && !isAdmin)}
                          className="w-12 h-8 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm flex-shrink-0 text-gray-900 bg-white"
                        />
                      </div>
                      <button
                        onClick={() => updateExtraMealCount(slot.key, Math.min(10, extraMealCount + 1))}
                        disabled={isSaving || (!deadline?.canModify && !isAdmin) || (isMealPrepared && !isAdmin) || (!isUserActive && !isAdmin) || extraMealCount >= 10}
                        className="w-8 h-8 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 flex-shrink-0"
                      >
                        +
                      </button>
                    </div>
                    <span className={`text-sm font-medium transition-colors duration-200 min-w-0 flex items-center ${extraMealCount > 0 ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                      {extraMealCount > 0 ? (
                        <>
                          <Restaurant className="mr-1" style={{ fontSize: '1rem' }} />
                          {extraMealCount}
                        </>
                      ) : (
                        <>
                          <Block className="mr-1" style={{ fontSize: '1rem' }} />
                          0
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Deadline Overview */}
      <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-yellow-200">
        <h4 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
          <AccessTime className="mr-2 text-yellow-600" />
          Today's Meal Deadlines
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mealSlots.map(slot => {
            const deadline = deadlineStatus[slot.key]
            return (
              <div key={slot.key} className={`p-3 rounded-lg border-2 ${deadline?.isPassed
                  ? 'bg-red-100 border-red-300'
                  : 'bg-green-100 border-green-300'
                }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 text-sm">{slot.name}</span>
                  <span className={`text-sm font-bold ${deadline?.isPassed ? 'text-red-600' : 'text-green-600'
                    }`}>
                    {deadline?.deadline}
                  </span>
                </div>
                <div className={`text-xs mt-1 font-medium ${deadline?.isPassed ? 'text-red-600' : 'text-green-600'
                  }`}>
                  {deadline?.isPassed ? (
                    <span className="flex items-center">
                      <Block className="mr-1" style={{ fontSize: '0.75rem' }} />
                      Deadline passed
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <CheckCircle className="mr-1" style={{ fontSize: '0.75rem' }} />
                      Can modify
                    </span>
                  )}
                </div>
                {deadline?.isPassed && isAdmin && (
                  <div className="text-xs mt-1 text-purple-600 font-medium flex items-center">
                    <AdminPanelSettings style={{ fontSize: '0.75rem' }} className="mr-1" />
                    Admin can override
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Real-time Summary */}
      <div className="border-t pt-6">
        <h4 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
          <BarChart className="mr-2 text-blue-600" />
          Live Mess Summary
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {mealSlots.map(slot => {
            const summary = getSummaryForSlot(slot.key)
            return (
              <div key={slot.key} className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-4 border-2 border-blue-200">
                <h5 className="font-semibold text-gray-900 mb-3">{slot.name}</h5>
                {summary ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Standard Meals:</span>
                      <span className="font-bold text-green-600 text-lg">{summary.totalStandardMeals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Extra Meals:</span>
                      <span className="font-bold text-blue-600 text-lg">{summary.totalExtraMeals}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 border-blue-300">
                      <span className="text-gray-900 font-semibold">Total Meals:</span>
                      <span className="font-bold text-purple-600 text-xl">{summary.overallTotalMeals}</span>
                    </div>

                    {/* Meal Preparation Status & Admin Controls */}
                    <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 pt-3 border-t border-blue-300">
                      {summary.isMealPrepared ? (
                        <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 w-full">
                          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold flex items-center justify-center">
                            <CheckCircle className="mr-1" style={{ fontSize: '0.875rem' }} />
                            Served
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => markMealAsUndone(slot.key)}
                              disabled={updatingStates[`${slot.key}_undoing`]}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${updatingStates[`${slot.key}_undoing`]
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                                }`}
                              title="Mark this meal as not served and restore inventory items."
                            >
                              {updatingStates[`${slot.key}_undoing`] ? (
                                <>
                                  <HourglassTop className="animate-spin mr-1" />
                                  Undoing...
                                </>
                              ) : (
                                <>
                                  <Undo className="mr-1" />
                                  Undone
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : summary.overallTotalMeals > 0 ? (
                        <>
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold flex items-center">
                            <HourglassTop className="mr-1" style={{ fontSize: '0.875rem' }} />
                            Pending
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => markMealAsPrepared(slot.key)}
                              disabled={updatingStates[`${slot.key}_preparing`]}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${updatingStates[`${slot.key}_preparing`]
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                  : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                                }`}
                              title="Mark this meal as prepared and served. This will deduct inventory items."
                            >
                              {updatingStates[`${slot.key}_preparing`] ? (
                                <>
                                  <HourglassTop className="animate-spin mr-1" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Kitchen className="mr-1" />
                                  Done
                                </>
                              )}
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold flex items-center">
                          <Email className="mr-1" style={{ fontSize: '0.875rem' }} />
                          No meals
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No attendance data</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Grand Total */}
      <div className="border-t pt-6 mt-6">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border-2 border-purple-200">
          <h4 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <GpsFixed className="mr-2 text-purple-600" />
            Today's Total Meal Production
          </h4>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-green-600">
                {mealSummary.reduce((total, summary) => total + summary.totalStandardMeals, 0)}
              </div>
              <div className="text-sm text-gray-600 font-medium">Total Standard</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">
                {mealSummary.reduce((total, summary) => total + summary.totalExtraMeals, 0)}
              </div>
              <div className="text-sm text-gray-600 font-medium">Total Extra</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600">
                {mealSummary.reduce((total, summary) => total + summary.overallTotalMeals, 0)}
              </div>
              <div className="text-sm text-gray-600 font-medium">Grand Total</div>
            </div>
          </div>

          <div className="pt-4 border-t border-purple-200 mt-4">
            <p className="text-sm text-gray-700 text-center">
              <strong className="flex items-center justify-center">
                <Kitchen className="mr-1" />
                Cook's Summary:
              </strong> Prepare <span className="font-bold text-purple-600 text-lg">
                {mealSummary.reduce((total, summary) => total + summary.overallTotalMeals, 0)}</span> total meals today
            </p>
          </div>
        </div>
      </div>

      {/* View Meal Calendar Section */}
      <div className="border-t pt-6 mt-6">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xl font-semibold text-gray-900 flex items-center">
              <CalendarMonth className="mr-2 text-blue-600" />
              View Meal Calendar
            </h4>
            <button
              onClick={() => {
                if (!showMealCalendar) {
                  fetchMealCalendarData()
                }
                setShowMealCalendar(!showMealCalendar)
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                showMealCalendar 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {showMealCalendar ? 'Hide Calendar' : 'Show Calendar'}
            </button>
          </div>

          {showMealCalendar && (
            <div className="space-y-6">
              {/* Filter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-blue-200">
                {/* Member Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Person className="mr-1" style={{ fontSize: '1rem' }} />
                    Select Member
                  </label>
                  <select
                    value={selectedMember}
                    onChange={(e) => {
                      setSelectedMember(e.target.value)
                      // Auto-refresh data when member changes
                      setTimeout(() => fetchMealCalendarData(), 100)
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="all">All Members</option>
                    {members.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Range Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <DateRange className="mr-1" style={{ fontSize: '1rem' }} />
                    Date Range
                  </label>
                  <select
                    value={calendarDateRange}
                    onChange={(e) => {
                      setCalendarDateRange(e.target.value as 'week' | 'month' | 'custom')
                      // Auto-refresh data when range changes
                      setTimeout(() => fetchMealCalendarData(), 100)
                    }}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  >
                    <option value="week">Last Week</option>
                    <option value="month">Last Month</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* View Button */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <TableChart className="mr-1" style={{ fontSize: '1rem' }} />
                    Action
                  </label>
                  <button
                    onClick={fetchMealCalendarData}
                    disabled={isLoadingCalendar}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoadingCalendar ? 'Loading...' : 'Refresh Data'}
                  </button>
                </div>
              </div>

              {/* Custom Date Range Inputs */}
              {calendarDateRange === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Calendar Table */}
              <div className="bg-white rounded-lg border border-blue-200 overflow-hidden">
                {isLoadingCalendar ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading meal calendar...</p>
                  </div>
                ) : mealCalendarData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarMonth className="mx-auto mb-2 text-gray-300" style={{ fontSize: '3rem' }} />
                    <p>No meal data found for the selected period</p>
                    <p className="text-sm">Try selecting a different date range or member</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Date</th>
                          {selectedMember === 'all' && (
                            <th className="px-4 py-3 text-left text-xs font-medium text-blue-900 uppercase tracking-wider">Member</th>
                          )}
                          {mealFrequency === 3 && (
                            <th className="px-4 py-3 text-center text-xs font-medium text-blue-900 uppercase tracking-wider">Breakfast</th>
                          )}
                          <th className="px-4 py-3 text-center text-xs font-medium text-blue-900 uppercase tracking-wider">Lunch</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-blue-900 uppercase tracking-wider">Dinner</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-blue-900 uppercase tracking-wider">Total Meals</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {generateDateArray().map((date) => {
                          const dayData = mealCalendarData.filter(item => item.date === date)
                          
                          if (selectedMember === 'all') {
                            // Show all members for this date
                            return dayData.map((memberData, index) => (
                              <tr key={`${date}-${memberData.userId}`} className={index === 0 ? 'border-t-2 border-blue-200' : ''}>
                                {index === 0 && (
                                  <td rowSpan={dayData.length} className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 bg-blue-50 border-r border-blue-200">
                                    {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      weekday: 'short'
                                    })}
                                  </td>
                                )}
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                  {memberData.userName}
                                </td>
                                {mealFrequency === 3 && (
                                  <td className="px-4 py-4 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                      <span className={`w-3 h-3 rounded-full ${memberData.breakfast.status ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                      {memberData.breakfast.extra > 0 && (
                                        <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">+{memberData.breakfast.extra}</span>
                                      )}
                                    </div>
                                  </td>
                                )}
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <span className={`w-3 h-3 rounded-full ${memberData.lunch.status ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                    {memberData.lunch.extra > 0 && (
                                      <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">+{memberData.lunch.extra}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <span className={`w-3 h-3 rounded-full ${memberData.dinner.status ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                    {memberData.dinner.extra > 0 && (
                                      <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">+{memberData.dinner.extra}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {memberData.totalMeals}
                                  </span>
                                </td>
                              </tr>
                            ))
                          } else {
                            // Show single member for this date
                            const memberData = dayData[0]
                            return (
                              <tr key={date}>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    weekday: 'short'
                                  })}
                                </td>
                                {mealFrequency === 3 && (
                                  <td className="px-4 py-4 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center space-x-1">
                                      <span className={`w-3 h-3 rounded-full ${memberData?.breakfast.status ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                      {memberData?.breakfast.extra > 0 && (
                                        <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">+{memberData.breakfast.extra}</span>
                                      )}
                                    </div>
                                  </td>
                                )}
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <span className={`w-3 h-3 rounded-full ${memberData?.lunch.status ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                    {memberData?.lunch.extra > 0 && (
                                      <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">+{memberData.lunch.extra}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <span className={`w-3 h-3 rounded-full ${memberData?.dinner.status ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                    {memberData?.dinner.extra > 0 && (
                                      <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">+{memberData.dinner.extra}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-center">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {memberData?.totalMeals || 0}
                                  </span>
                                </td>
                              </tr>
                            )
                          }
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h5 className="text-sm font-medium text-gray-900 mb-2">Legend:</h5>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    <span className="text-gray-700">Meal On</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-3 h-3 rounded-full bg-gray-300"></span>
                    <span className="text-gray-700">Meal Off</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs bg-orange-100 text-orange-800 px-1 rounded">+2</span>
                    <span className="text-gray-700">Extra Meals</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-md">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`w-full bg-white shadow-xl rounded-xl pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden transition-all duration-500 transform hover:scale-105 ${toast.type === 'success' ? 'border-l-4 border-green-500' :
                toast.type === 'error' ? 'border-l-4 border-red-500' :
                  toast.type === 'warning' ? 'border-l-4 border-yellow-500' :
                    'border-l-4 border-blue-500'
              }`}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${toast.type === 'success' ? 'bg-green-100' :
                      toast.type === 'error' ? 'bg-red-100' :
                        toast.type === 'warning' ? 'bg-yellow-100' :
                          'bg-blue-100'
                    }`}>
                    {toast.type === 'success' && <CheckCircle className="text-green-600 text-lg" />}
                    {toast.type === 'error' && <Close className="text-red-600 text-lg" />}
                    {toast.type === 'warning' && <Warning className="text-yellow-600 text-lg" />}
                    {toast.type === 'info' && <Info className="text-blue-600 text-lg" />}
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <div className={`text-sm font-semibold mb-1 ${toast.type === 'success' ? 'text-green-800' :
                      toast.type === 'error' ? 'text-red-800' :
                        toast.type === 'warning' ? 'text-yellow-800' :
                          'text-blue-800'
                    }`}>
                    {toast.type === 'success' && 'Success'}
                    {toast.type === 'error' && 'Error'}
                    {toast.type === 'warning' && 'Warning'}
                    {toast.type === 'info' && 'Info'}
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed">
                    {/* Parse the message for better formatting */}
                    {toast.message.includes('Inventory items have been') ? (
                      <div className="space-y-1">
                        <div className="font-medium">{toast.message.split('Inventory items have been')[0].trim()}</div>
                        <div className="text-xs bg-gray-50 p-2 rounded border-l-2 border-gray-300">
                          <div className="font-medium text-gray-600 mb-1">Items processed:</div>
                          {toast.message.split('Inventory items have been deducted: ')[1]?.split(', ').map((item, index) => (
                            <div key={index} className="flex items-center text-gray-600">
                              <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                              {item}
                            </div>
                          )) || toast.message.split('Inventory items have been restored: ')[1]?.split(', ').map((item, index) => (
                            <div key={index} className="flex items-center text-gray-600">
                              <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div>{toast.message}</div>
                    )}
                  </div>
                </div>
                <div className="ml-3 flex-shrink-0">
                  <button
                    className={`rounded-md p-1 inline-flex hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${toast.type === 'success' ? 'text-green-400 hover:text-green-500 focus:ring-green-500' :
                        toast.type === 'error' ? 'text-red-400 hover:text-red-500 focus:ring-red-500' :
                          toast.type === 'warning' ? 'text-yellow-400 hover:text-yellow-500 focus:ring-yellow-500' :
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

      {/* Confirmation Modal */}
      {confirmationModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={confirmationModal.onCancel}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${confirmationModal.type === 'danger' ? 'bg-red-100' :
                      confirmationModal.type === 'warning' ? 'bg-yellow-100' :
                        'bg-blue-100'
                    }`}>
                    {confirmationModal.type === 'danger' && <Warning className="text-red-600" />}
                    {confirmationModal.type === 'warning' && <Warning className="text-yellow-600" />}
                    {confirmationModal.type === 'info' && <Info className="text-blue-600" />}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {confirmationModal.title}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {confirmationModal.message}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${confirmationModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                      confirmationModal.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' :
                        'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                    }`}
                  onClick={confirmationModal.onConfirm}
                >
                  {confirmationModal.confirmText || 'Confirm'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={confirmationModal.onCancel}
                >
                  {confirmationModal.cancelText || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Selection Modal */}
      {inventoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={inventoryModal.onCancel}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Kitchen className="text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                      Select Inventory Items to Deduct
                    </h3>
                    <div className="mt-2 mb-4">
                      <p className="text-sm text-gray-500 mb-2">
                        Preparing {inventoryModal.totalMeals} meals for {inventoryModal.mealSlot}. Select items to deduct from inventory:
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-700">
                          💡 <strong>Tip:</strong> You can skip items or adjust quantities as needed. Only selected items will be deducted from inventory.
                        </p>
                      </div>
                    </div>

                    {/* Inventory Items List */}
                    <div className="max-h-96 overflow-y-auto">
                      {inventoryItems.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Restaurant className="mx-auto mb-2 text-gray-300" style={{ fontSize: '2rem' }} />
                          <p>No inventory items found</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {inventoryItems.map((item) => {
                            const selectedItem = selectedInventoryItems.find(si => si.itemId === item._id)
                            const isSelected = !!selectedItem
                            const quantityToDeduct = selectedItem?.quantityToDeduct || 0

                            return (
                              <div key={item._id} className={`border-2 rounded-lg p-4 transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                                }`}>
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">{item.itemName}</h4>
                                    <p className="text-sm text-gray-600">{item.category}</p>
                                    <p className="text-sm text-gray-500">
                                      Available: {item.quantity} {item.unit}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      if (isSelected) {
                                        setSelectedInventoryItems(prev =>
                                          prev.filter(si => si.itemId !== item._id)
                                        )
                                      } else {
                                        setSelectedInventoryItems(prev => [...prev, {
                                          itemId: item._id,
                                          itemName: item.itemName,
                                          currentQuantity: item.quantity,
                                          quantityToDeduct: 0,
                                          unit: item.unit
                                        }])
                                      }
                                    }}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${isSelected
                                        ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                      }`}
                                  >
                                    {isSelected ? 'Remove' : 'Add'}
                                  </button>
                                </div>

                                {isSelected && (
                                  <div className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                      <label className="text-sm font-medium text-gray-700">
                                        Quantity to deduct:
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max={item.quantity}
                                        step="0.01"
                                        value={quantityToDeduct}
                                        onChange={(e) => {
                                          const value = Math.max(0, Math.min(item.quantity, parseFloat(e.target.value) || 0))
                                          setSelectedInventoryItems(prev =>
                                            prev.map(si =>
                                              si.itemId === item._id
                                                ? { ...si, quantityToDeduct: value }
                                                : si
                                            )
                                          )
                                        }}
                                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                                        placeholder="0"
                                      />
                                      <span className="text-sm text-gray-500">{item.unit}</span>
                                    </div>
                                    {quantityToDeduct > 0 && (
                                      <p className="text-xs text-green-600">
                                        Remaining after deduction: {(item.quantity - quantityToDeduct).toFixed(2)} {item.unit}
                                      </p>
                                    )}
                                    {quantityToDeduct > item.quantity && (
                                      <p className="text-xs text-red-600">
                                        ⚠️ Insufficient stock! Only {item.quantity} {item.unit} available.
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Selected Items Summary */}
                    {selectedInventoryItems.length > 0 && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h4 className="font-medium text-green-800 mb-2">Items to be deducted:</h4>
                        <ul className="text-sm text-green-700 space-y-1">
                          {selectedInventoryItems
                            .filter(item => item.quantityToDeduct > 0)
                            .map(item => (
                              <li key={item.itemId}>
                                • {item.quantityToDeduct} {item.unit} of {item.itemName}
                              </li>
                            ))}
                        </ul>
                        {selectedInventoryItems.filter(item => item.quantityToDeduct > 0).length === 0 && (
                          <p className="text-sm text-yellow-600">No quantities specified yet</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    const validItems = selectedInventoryItems.filter(item => item.quantityToDeduct > 0)
                    inventoryModal.onConfirm(validItems)
                  }}
                >
                  Continue to Mark as Prepared
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={inventoryModal.onCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
