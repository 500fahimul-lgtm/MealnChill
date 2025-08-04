import connectDB from '@/lib/mongodb'
import MealAttendance from '@/models/MealAttendance'
import Mess from '@/models/Mess'
import Notification from '@/models/Notification'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest, 
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const resolvedParams = await params
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
    const currentUserId = decoded.userId

    const { id: messId, userId: targetUserId } = resolvedParams

    // Get current user to verify they belong to this mess and are admin
    const currentUser = await User.findById(currentUserId)
    if (!currentUser || !currentUser.messId || currentUser.messId.toString() !== messId) {
      return NextResponse.json(
        { message: 'Access denied' },
        { status: 403 }
      )
    }

    // Get mess and verify admin access
    const mess = await Mess.findById(messId)
    if (!mess) {
      return NextResponse.json(
        { message: 'Mess not found' },
        { status: 404 }
      )
    }

    // Check if current user is admin
    if (!currentUser.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      )
    }

    // Prevent admin from deactivating themselves
    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { message: 'Cannot modify your own membership status' },
        { status: 400 }
      )
    }

    // Get update data from request body
    const { isActive } = await req.json()

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { message: 'isActive must be a boolean value' },
        { status: 400 }
      )
    }

    // Find and update the target member
    const targetMemberIndex = mess.members.findIndex((member: any) => 
      member.userId.toString() === targetUserId
    )

    if (targetMemberIndex === -1) {
      return NextResponse.json(
        { message: 'Member not found in this mess' },
        { status: 404 }
      )
    }

    // Get member details for notifications
    const memberUser = await User.findById(targetUserId)
    if (!memberUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    // Update the member status
    mess.members[targetMemberIndex].isActive = isActive
    await mess.save()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (!isActive) {
      // DEACTIVATING: Turn off all meals for today and future
      const mealSlots = ['breakfast', 'lunch', 'dinner']
      
      for (const slot of mealSlots) {
        await MealAttendance.updateMany(
          {
            userId: targetUserId,
            messId: messId,
            date: { $gte: today },
            mealSlot: slot
          },
          {
            $set: {
              isMealOn: false,
              updatedAt: new Date()
            }
          }
        )
      }

      // Send notification to all members about deactivation
      const allMembers = await User.find({
        messId: messId,
        _id: { $ne: targetUserId } // Exclude the deactivated user themselves
      })

      const notifications = allMembers.map(member => ({
        messId: messId,
        userId: member._id,
        type: 'general',
        title: 'Member Meal Deactivated',
        message: `${memberUser.name}'s meals have been deactivated by admin.`,
        isRead: false,
        createdAt: new Date()
      }))

      if (notifications.length > 0) {
        await Notification.insertMany(notifications)
      }

    } else {
      // ACTIVATING: Turn on meals with default status
      const endDate = new Date(today)
      endDate.setDate(endDate.getDate() + 7) // Next 7 days
      
      const mealSlots = mess.mealFrequency === 3 ? ['breakfast', 'lunch', 'dinner'] : ['lunch', 'dinner']

      // Create records for each date and meal slot if they don't exist
      for (let d = new Date(today); d < endDate; d.setDate(d.getDate() + 1)) {
        for (const slot of mealSlots) {
          const existingRecord = await MealAttendance.findOne({
            userId: targetUserId,
            messId: messId,
            date: d,
            mealSlot: slot
          })

          if (!existingRecord) {
            await MealAttendance.create({
              userId: targetUserId,
              messId: messId,
              date: new Date(d),
              mealSlot: slot,
              isMealOn: true,
              extraMealCount: 0
            })
          } else {
            // Update existing record to turn meal on
            await MealAttendance.updateOne(
              {
                userId: targetUserId,
                messId: messId,
                date: d,
                mealSlot: slot
              },
              {
                $set: {
                  isMealOn: true,
                  updatedAt: new Date()
                }
              }
            )
          }
        }
      }

      // Send notification to all members about activation
      const allMembers = await User.find({
        messId: messId
      })

      const notifications = allMembers.map(member => ({
        messId: messId,
        userId: member._id,
        type: 'general',
        title: 'Member Meal Activated',
        message: `${memberUser.name}'s meals have been activated by admin.`,
        isRead: false,
        createdAt: new Date()
      }))

      if (notifications.length > 0) {
        await Notification.insertMany(notifications)
      }
    }

    return NextResponse.json({ 
      message: `Member ${isActive ? 'activated' : 'deactivated'} successfully`,
      member: {
        userId: memberUser._id,
        name: memberUser.name,
        isActive: isActive
      }
    })
  } catch (error) {
    console.error('Update member status error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
