import connectDB from '@/lib/mongodb'
import MealAttendance from '@/models/MealAttendance'
import MealRoutine from '@/models/MealRoutine'
import Mess from '@/models/Mess'
import Notification from '@/models/Notification'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    await connectDB()

    // Get token from Authorization header
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any
    const userId = decoded.userId

    // Get user and mess info
    const user = await User.findById(userId).populate('messId')
    if (!user || !user.messId) {
      return NextResponse.json(
        { message: 'User not found or not part of a mess' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(req.url)
    const dateParam = searchParams.get('date')
    const targetUserId = searchParams.get('targetUserId') // For admin to fetch specific user data
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const fetchUserId = searchParams.get('userId')

    // Handle date range query for dashboard stats
    if (startDateParam && endDateParam && fetchUserId) {
      const startDate = new Date(startDateParam)
      const endDate = new Date(endDateParam)
      
      const attendance = await MealAttendance.find({
        messId: user.messId._id,
        userId: fetchUserId,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      }).sort({ date: 1, slot: 1 })

      return NextResponse.json({
        success: true,
        attendance
      })
    }

    if (!dateParam) {
      return NextResponse.json(
        { message: 'Date is required' },
        { status: 400 }
      )
    }

    const date = new Date(dateParam)
    
    // Normalize the date to avoid timezone issues
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    // Determine which user's data to fetch
    let targetUserIdToFetch = userId // Default to logged-in user
    
    // If targetUserId is provided, check if current user is admin
    if (targetUserId) {
      const mess = await Mess.findById(user.messId)
      if (!mess || !user.isAdmin) {
        return NextResponse.json(
          { message: 'Only admins can fetch other users data' },
          { status: 403 }
        )
      }
      
      // Verify target user is in the same mess
      const targetUserMembership = mess.members.find((member: any) => 
        member.userId.toString() === targetUserId
      )
      
      if (!targetUserMembership) {
        return NextResponse.json(
          { message: 'Target user not found in this mess' },
          { status: 404 }
        )
      }
      
      targetUserIdToFetch = targetUserId
    }

    console.log('Fetching meal attendance for userId:', targetUserIdToFetch, 'date:', dateParam)

    // Get user's attendance for the day
    const userAttendance = await MealAttendance.find({
      userId: targetUserIdToFetch,
      messId: user.messId,
      date: normalizedDate
    })

    console.log('Found attendance records:', userAttendance.map(a => ({
      mealSlot: a.mealSlot,
      isMealOn: a.isMealOn,
      extraMealCount: a.extraMealCount
    })))

    // Get meal routines for the day to show meal names
    const mealRoutines = await MealRoutine.find({
      messId: user.messId,
      date: normalizedDate,
      isActive: true
    })

    // Get mess meal frequency to determine available slots
    const mess = user.messId
    const mealSlots = mess.mealFrequency === 3 
      ? ['breakfast', 'lunch', 'dinner']
      : ['lunch', 'dinner']

    // Build user attendance data with meal names
    const userAttendanceData = mealSlots.map(slot => {
      const attendance = userAttendance.find(a => a.mealSlot === slot)
      const routine = mealRoutines.find(r => r.mealSlot === slot)
      
      return {
        mealSlot: slot,
        mealName: routine?.mealName || 'No meal planned',
        isMealOn: attendance?.isMealOn ?? true, // Default to true
        extraMealCount: attendance?.extraMealCount ?? 0
      }
    })

    // Get collective summary for all users
    const allAttendance = await MealAttendance.find({
      messId: user.messId,
      date: normalizedDate
    })

    console.log(`DEBUG - All attendance records for ${dateParam}:`, allAttendance.map(a => ({
      userId: a.userId.toString(),
      mealSlot: a.mealSlot,
      isMealOn: a.isMealOn,
      extraMealCount: a.extraMealCount
    })))

    // Get all active mess members
    const messData = user.messId
    const activeMembers = messData.members.filter((member: any) => member.isActive)
    
    console.log(`DEBUG - Active members:`, activeMembers.map((m: any) => ({
      userId: m.userId.toString(),
      name: m.name || 'Unknown'
    })))

    const mealSummary = mealSlots.map(slot => {
      const slotAttendance = allAttendance.filter(a => a.mealSlot === slot)
      
      console.log(`DEBUG - ${slot} slot attendance records:`, slotAttendance.map(a => ({
        userId: a.userId.toString(),
        isMealOn: a.isMealOn,
        extraMealCount: a.extraMealCount
      })))
      
      console.log(`DEBUG - ${slot} active members:`, activeMembers.map((m: any) => ({
        userId: m.userId.toString(),
        name: m.name || 'Unknown'
      })))
      
      // For each member, determine their attendance status
      let totalStandardMeals = 0
      let totalExtraMeals = 0
      
      activeMembers.forEach((member: any) => {
        const memberAttendance = slotAttendance.find(a => {
          // Ensure proper ObjectId comparison
          const attendanceUserId = a.userId.toString()
          const memberUserId = member.userId.toString()
          return attendanceUserId === memberUserId
        })
        
        console.log(`DEBUG - ${slot} - Member ${member.userId} (${member.name || 'Unknown'}):`, {
          hasRecord: !!memberAttendance,
          isMealOn: memberAttendance?.isMealOn,
          extraMealCount: memberAttendance?.extraMealCount
        })
        
        if (memberAttendance) {
          // User has explicit attendance record
          if (memberAttendance.isMealOn) {
            totalStandardMeals++ // Count as standard meal if meal is on
            console.log(`  → Counting as standard meal (isMealOn: true)`)
          } else {
            console.log(`  → NOT counting as standard meal (isMealOn: false)`)
          }
          if (memberAttendance.extraMealCount > 0) {
            totalExtraMeals += memberAttendance.extraMealCount // Add the number of extra meals
            console.log(`  → Counting ${memberAttendance.extraMealCount} extra meal(s)`)
          }
        } else {
          // User has no record, default to meal on (standard meal)
          totalStandardMeals++
          console.log(`  → No record found, defaulting to standard meal`)
        }
      })
      
      console.log(`DEBUG - ${slot} totals: standard=${totalStandardMeals}, extra=${totalExtraMeals}`)
      
      const routine = mealRoutines.find(r => r.mealSlot === slot)

      return {
        mealSlot: slot,
        mealName: routine?.mealName || 'No meal planned',
        totalStandardMeals,
        totalExtraMeals,
        overallTotalMeals: totalStandardMeals + totalExtraMeals,
        isMealPrepared: routine?.isMealPrepared ?? false
      }
    })

    // Get deadline status for each meal slot
    const mealDeadlines = messData.mealDeadlines || {
      breakfast: '10:00',
      lunch: '14:00',
      dinner: '20:00'
    }
    
    const currentTime = new Date()
    const requestDate = new Date(dateParam)
    const isToday = requestDate.toDateString() === new Date().toDateString()
    
    const deadlineStatus = mealSlots.reduce((acc, slot) => {
      const deadlineTime = mealDeadlines[slot as keyof typeof mealDeadlines]
      if (deadlineTime && isToday) {
        const [hours, minutes] = deadlineTime.split(':').map(Number)
        const deadlineDateTime = new Date()
        deadlineDateTime.setHours(hours, minutes, 0, 0)
        
        acc[slot] = {
          deadline: deadlineTime,
          isPassed: currentTime > deadlineDateTime,
          canModify: currentTime <= deadlineDateTime
        }
      } else {
        acc[slot] = {
          deadline: deadlineTime,
          isPassed: false,
          canModify: true
        }
      }
      return acc
    }, {} as Record<string, { deadline: string; isPassed: boolean; canModify: boolean }>)

    return NextResponse.json({
      userAttendance: userAttendanceData,
      mealSummary,
      deadlineStatus
    })
  } catch (error) {
    console.error('Get meal attendance error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    // Get token from Authorization header
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json(
        { message: 'No token provided' },
        { status: 401 }
      )
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any
    const userId = decoded.userId

    // Get user and mess info
    const user = await User.findById(userId).populate('messId')
    if (!user || !user.messId) {
      return NextResponse.json(
        { message: 'User not found or not part of a mess' },
        { status: 404 }
      )
    }

    const { date, mealSlot, isMealOn, extraMealCount, targetUserId, isAdminOverride } = await req.json()

    console.log(`DEBUG: POST /api/meal-attendance received:`, {
      date,
      mealSlot,
      isMealOn,
      extraMealCount,
      userId,
      targetUserId,
      isAdminOverride
    })

    // Validate required fields
    if (!date || !mealSlot) {
      return NextResponse.json(
        { message: 'Date and meal slot are required' },
        { status: 400 }
      )
    }

    // Validate meal slot
    if (!['breakfast', 'lunch', 'dinner'].includes(mealSlot)) {
      return NextResponse.json(
        { message: 'Invalid meal slot' },
        { status: 400 }
      )
    }

    // Check if deadline has passed for this meal slot (except for admins)
    const mess = user.messId
    const currentTime = new Date()
    const requestDate = new Date(date)
    
    // Determine target user ID (for admin override)
    let targetUserIdToUpdate = userId // Default to logged-in user
    
    // Check if user is admin using the isAdmin field from User model
    const currentUser = await User.findById(userId)
    if (!currentUser || !currentUser.isAdmin) {
      // If not admin and trying to modify another user's data
      if (targetUserId && targetUserId !== userId) {
        return NextResponse.json(
          { message: 'Only admins can modify other users\' meal attendance' },
          { status: 403 }
        )
      }
    }
    
    // Handle admin override for specific user
    if (targetUserId && targetUserId !== userId) {
      
      // Verify target user is in the same mess
      const targetUserMembership = mess.members.find((member: any) => 
        member.userId.toString() === targetUserId
      )
      
      if (!targetUserMembership) {
        return NextResponse.json(
          { message: 'Target user not found in this mess' },
          { status: 404 }
        )
      }
      
      targetUserIdToUpdate = targetUserId
    }
    
    const attendanceDate = new Date(date)
    
    // Ensure we use the correct date format (YYYY-MM-DD as UTC date)
    const normalizedDate = new Date(attendanceDate.getFullYear(), attendanceDate.getMonth(), attendanceDate.getDate())
    
    // Only check deadline if not admin override and user is not admin
    const shouldCheckDeadline = !isAdminOverride && !currentUser?.isAdmin && requestDate.getTime() >= new Date().setHours(0, 0, 0, 0)
    
    // Check if meal has been marked as prepared/performed - this blocks all member changes
    const mealRoutine = await MealRoutine.findOne({
      messId: user.messId,
      date: normalizedDate,
      mealSlot: mealSlot,
      isActive: true
    })
    
    if (mealRoutine && mealRoutine.isMealPrepared && !currentUser?.isAdmin) {
      return NextResponse.json(
        { 
          message: `Cannot modify ${mealSlot} attendance. This meal has already been prepared and served by admin. Contact admin if you need assistance.`,
          mealPrepared: true
        },
        { status: 400 }
      )
    }
    
    if (shouldCheckDeadline) {
      const mealDeadlines = mess.mealDeadlines || {
        breakfast: '10:00',
        lunch: '14:00',
        dinner: '20:00'
      }
      
      const deadlineTime = mealDeadlines[mealSlot as keyof typeof mealDeadlines]
      if (deadlineTime) {
        const [hours, minutes] = deadlineTime.split(':').map(Number)
        const deadlineDateTime = new Date()
        deadlineDateTime.setHours(hours, minutes, 0, 0)
        
        // Check if current time is past the deadline for today's meal
        const isToday = requestDate.toDateString() === new Date().toDateString()
        if (isToday && currentTime > deadlineDateTime) {
          return NextResponse.json(
            { 
              message: `Cannot modify ${mealSlot} attendance. Deadline (${deadlineTime}) has passed. Contact admin for changes.`,
              deadlineTime: deadlineTime
            },
            { status: 400 }
          )
        }
      }
    }

    // Prepare update data (don't include query fields)
    const updateData: any = {}

    // Only update the field that was changed
    if (typeof isMealOn !== 'undefined') {
      updateData.isMealOn = isMealOn
    }
    if (typeof extraMealCount !== 'undefined') {
      updateData.extraMealCount = extraMealCount
    }

    // For upsert, set the full document data (exclude fields that are being updated)
    const setOnInsert: any = {
      userId: targetUserIdToUpdate, // Use target user ID instead of logged-in user ID
      messId: user.messId,
      date: normalizedDate,
      mealSlot: mealSlot
    }

    // Only include default values for fields that are NOT being updated
    if (typeof isMealOn === 'undefined') {
      setOnInsert.isMealOn = true
    }
    if (typeof extraMealCount === 'undefined') {
      setOnInsert.extraMealCount = 0
    }

    const attendance = await MealAttendance.findOneAndUpdate(
      {
        userId: targetUserIdToUpdate, // Use target user ID instead of logged-in user ID
        messId: user.messId,
        date: normalizedDate,
        mealSlot: mealSlot
      },
      { 
        $set: updateData,
        $setOnInsert: setOnInsert
      },
      { 
        upsert: true, 
        new: true 
      }
    )

    console.log(`DEBUG: Updated attendance record:`, attendance)

    // Create notifications for attendance changes (use the actual user who made the change)
    const mealSlotName = mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)
    const dateStr = new Date(date).toLocaleDateString()
    
    // Get the target user details for notifications if different from logged-in user
    let targetUser = user
    if (targetUserId && targetUserId !== userId) {
      targetUser = await User.findById(targetUserId)
    }

    if (typeof isMealOn !== 'undefined' && !isMealOn) {
      // Meal Off notification
      const notificationMessage = targetUserId && targetUserId !== userId 
        ? `${user.name} (admin) turned off ${mealSlotName} for ${targetUser?.name} on ${dateStr}`
        : `${targetUser?.name} has turned off ${mealSlotName} on ${dateStr}`
        
      await Notification.create({
        messId: user.messId,
        recipientId: null, // Send to all mess members
        type: 'meal_off',
        title: 'Meal Status Update',
        message: notificationMessage,
        relatedData: {
          userId: targetUserIdToUpdate,
          userName: targetUser?.name,
          mealSlot: mealSlot,
          date: dateStr,
          changedBy: user.name,
          isAdminOverride: targetUserId && targetUserId !== userId
        },
        priority: 'medium'
      })
    }

    if (typeof extraMealCount !== 'undefined' && extraMealCount > 0) {
      // Extra Meal notification
      const notificationMessage = targetUserId && targetUserId !== userId 
        ? `${user.name} (admin) added ${extraMealCount} extra meal(s) for ${targetUser?.name} for ${mealSlotName} on ${dateStr}`
        : `${targetUser?.name} will take ${extraMealCount} extra meal(s) for ${mealSlotName} on ${dateStr}`
        
      await Notification.create({
        messId: user.messId,
        recipientId: null, // Send to all mess members
        type: 'extra_meal',
        title: 'Extra Meal Request',
        message: notificationMessage,
        relatedData: {
          userId: targetUserIdToUpdate,
          userName: targetUser?.name,
          mealSlot: mealSlot,
          date: dateStr,
          changedBy: user.name,
          isAdminOverride: targetUserId && targetUserId !== userId,
          extraMealCount
        },
        priority: 'medium'
      })
    }

    return NextResponse.json({
      message: 'Attendance updated successfully',
      attendance: {
        mealSlot: attendance.mealSlot,
        isMealOn: attendance.isMealOn,
        extraMealCount: attendance.extraMealCount
      }
    })
  } catch (error) {
    console.error('Update meal attendance error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
