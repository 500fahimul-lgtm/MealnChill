'use client'

import {
  Add,
  ChevronLeft,
  ChevronRight,
  Close,
  DarkMode,
  Edit,
  RestaurantMenu,
  Save,
  WbSunny,
  WbTwilight
} from '@mui/icons-material'
import { useCallback, useEffect, useState } from 'react'

interface MealRoutineItem {
  id: string
  date: string
  mealSlot: string
  mealName: string
  mealDescription: string
}

interface MealRoutineProps {
  messId: string
  isAdmin: boolean
  mealFrequency: number
}

export default function MealRoutine({ messId, isAdmin, mealFrequency }: MealRoutineProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [mealRoutines, setMealRoutines] = useState<MealRoutineItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingMeal, setEditingMeal] = useState<{date: string, slot: string} | null>(null)
  const [editForm, setEditForm] = useState({
    mealName: '',
    mealDescription: ''
  })

  const daysOfWeek = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const mealSlots = mealFrequency === 3 
    ? [{ key: 'breakfast', name: 'Breakfast' }, { key: 'lunch', name: 'Lunch' }, { key: 'dinner', name: 'Dinner' }]
    : [{ key: 'lunch', name: 'Lunch' }, { key: 'dinner', name: 'Dinner' }]

  const getWeekDates = (startDate: Date) => {
    const dates = []
    const start = new Date(startDate)
    // Find the Saturday of the current week
    const dayOfWeek = start.getDay()
    const saturdayOffset = dayOfWeek === 6 ? 0 : (dayOfWeek + 1) % 7
    start.setDate(start.getDate() - saturdayOffset)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  // Helper function to format date without timezone issues
  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Validation function to ensure meal routines match the correct date
  const validateMealForDate = (meal: MealRoutineItem, date: Date) => {
    const expectedDateStr = formatDateForAPI(date)
    return meal.date === expectedDateStr
  }

  const fetchMealRoutines = useCallback(async () => {
    try {
      const token = localStorage.getItem('token')
      const weekDates = getWeekDates(currentWeek)
      const startDate = formatDateForAPI(weekDates[0])
      const endDate = formatDateForAPI(weekDates[6])
      
      const response = await fetch(`/api/meal-routine?startDate=${startDate}&endDate=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        
        // Validate that all received routines are within the expected date range
        const validRoutines = data.routines.filter((routine: MealRoutineItem) => {
          return routine.date >= startDate && routine.date <= endDate
        })
        
        setMealRoutines(validRoutines)
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false)
    }
  }, [currentWeek])

  useEffect(() => {
    fetchMealRoutines()
  }, [fetchMealRoutines])

  const handlePreviousWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentWeek(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(currentWeek)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentWeek(newDate)
  }

  const getMealForSlot = (date: Date, slot: string) => {
    const dateStr = formatDateForAPI(date)
    const meal = mealRoutines.find(meal => 
      meal.date === dateStr && meal.mealSlot === slot
    )
    
    // Double-check that the meal actually belongs to this date
    if (meal && !validateMealForDate(meal, date)) {
      return undefined
    }
    
    return meal
  }

  const handleEditMeal = (date: Date, slot: string) => {
    const dateStr = formatDateForAPI(date)
    const existingMeal = getMealForSlot(date, slot)
    
    if (existingMeal) {
      setEditForm({
        mealName: existingMeal.mealName,
        mealDescription: existingMeal.mealDescription || ''
      })
    } else {
      setEditForm({
        mealName: '',
        mealDescription: ''
      })
    }
    
    setEditingMeal({ date: dateStr, slot })
  }

  const handleSaveMeal = async () => {
    if (!editingMeal) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/meal-routine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: editingMeal.date,
          mealSlot: editingMeal.slot,
          ...editForm
        })
      })

      if (response.ok) {
        await fetchMealRoutines()
        setEditingMeal(null)
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const weekDates = getWeekDates(currentWeek)

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4"></div>
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center">
          <RestaurantMenu className="mr-2 text-blue-600" />
          Meal Routine
        </h3>
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePreviousWeek}
              className="px-4 py-2.5 text-sm bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-lg hover:from-sky-600 hover:to-sky-700 transition-all duration-200 flex items-center shadow-md hover:shadow-lg"
            >
              <ChevronLeft className="mr-1.5 text-white" style={{ fontSize: '1.1rem' }} />
              <span className="hidden sm:inline">Previous</span>
            </button>
            <button
              onClick={handleNextWeek}
              className="px-4 py-2.5 text-sm bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 flex items-center shadow-md hover:shadow-lg"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="ml-1.5 text-white" style={{ fontSize: '1.1rem' }} />
            </button>
          </div>
          <div className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
            {weekDates[0].toLocaleDateString()} - {weekDates[6].toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {weekDates.map((date, index) => (
          <div key={index} className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-white hover:shadow-md transition-shadow duration-200">
            <div className="text-center mb-3">
              <div className="text-sm sm:text-base font-bold text-gray-800">{daysOfWeek[index]}</div>
              <div className="text-xs sm:text-sm text-gray-500 bg-gray-100 rounded-full px-2 py-1 mt-1 inline-block">
                {date.getDate()}/{date.getMonth() + 1}
              </div>
            </div>
            
            <div className="space-y-3">
              {mealSlots.map(slot => {
                const meal = getMealForSlot(date, slot.key)
                return (
                  <div key={slot.key} className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors duration-200">
                    <div className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide flex items-center">
                      {slot.key === 'breakfast' && <WbTwilight className="mr-1 text-orange-500" style={{ fontSize: '1rem' }} />}
                      {slot.key === 'lunch' && <WbSunny className="mr-1 text-yellow-500" style={{ fontSize: '1rem' }} />}
                      {slot.key === 'dinner' && <DarkMode className="mr-1 text-purple-500" style={{ fontSize: '1rem' }} />}
                      {slot.name}
                    </div>
                    {meal ? (
                      <div>
                        <div className="text-sm font-semibold text-gray-900 mb-2 leading-tight">{meal.mealName}</div>
                        {meal.mealDescription && (
                          <div className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-2 italic">
                            {meal.mealDescription}
                          </div>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => handleEditMeal(date, slot.key)}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-2 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors duration-200 font-medium flex items-center"
                          >
                            <Edit className="mr-1" style={{ fontSize: '0.875rem' }} />
                            Edit
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm text-gray-400 mb-2 italic">No meal planned</div>
                        {isAdmin && (
                          <button
                            onClick={() => handleEditMeal(date, slot.key)}
                            className="text-xs text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2 py-1 rounded transition-colors duration-200 font-medium flex items-center"
                          >
                            <Add className="mr-1" style={{ fontSize: '0.875rem' }} />
                            Add Meal
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xl font-bold text-gray-900 flex items-center">
                <RestaurantMenu className="mr-2 text-blue-600" />
                {getMealForSlot(new Date(editingMeal.date), editingMeal.slot) ? 'Edit Meal' : 'Add New Meal'}
              </h4>
              <button
                onClick={() => setEditingMeal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Close style={{ fontSize: '2rem' }} />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Meal Name *
                </label>
                <input
                  type="text"
                  value={editForm.mealName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, mealName: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400"
                  placeholder="e.g., Chicken Biryani"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Meal Description</label>
                <textarea
                  value={editForm.mealDescription}
                  onChange={(e) => setEditForm(prev => ({ ...prev, mealDescription: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-400 resize-vertical"
                  placeholder="Describe the meal ingredients, preparation method, or any special notes..."
                  rows={4}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-8">
              <button
                onClick={() => setEditingMeal(null)}
                className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMeal}
                disabled={!editForm.mealName.trim()}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 font-medium flex items-center justify-center"
              >
                <Save className="mr-2" />
                Save Meal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
