import { logInventoryChange } from '@/lib/inventoryLogger'
import connectDB from '@/lib/mongodb'
import Inventory from '@/models/Inventory'
import InventoryRecord from '@/models/InventoryRecord'
import MealAttendance from '@/models/MealAttendance'
import MealRoutine from '@/models/MealRoutine'
import Mess from '@/models/Mess'
import Notification from '@/models/Notification'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

// Helper function to handle floating point precision issues
const parseQuantity = (value: string | number): number => {
  const parsed = typeof value === 'string' ? parseFloat(value) : value
  // Round to 2 decimal places to avoid floating point precision issues
  return Math.round(parsed * 100) / 100
}

export async function POST(req: NextRequest) {
  try {
    await connectDB()

    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const userId = decoded.userId



    // Get user to check admin status
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ message: 'Only admins can mark meals as prepared' }, { status: 403 })
    }

    const { date, mealSlot, inventoryItems = [] } = await req.json()
    
    if (!date || !mealSlot) {
      return NextResponse.json({ message: 'Date and meal slot are required' }, { status: 400 })
    }

    const messId = user.messId
    if (!messId) {
      return NextResponse.json({ message: 'User is not part of any mess' }, { status: 400 })
    }

    // Check if mess is started before allowing meal preparation
    const mess = await Mess.findById(messId)
    if (!mess) {
      return NextResponse.json({ message: 'Mess not found' }, { status: 404 })
    }

    if (!mess.isStarted || mess.messStatus !== 'started') {
      return NextResponse.json({ message: 'Mess has not been started yet. Cannot prepare meals until mess is started.' }, { status: 403 })
    }

    // Parse date to ensure proper format
    const mealDate = new Date(date)
    if (isNaN(mealDate.getTime())) {
      return NextResponse.json({ message: 'Invalid date format' }, { status: 400 })
    }

    // Normalize date to start of day
    mealDate.setHours(0, 0, 0, 0)

    // Check if meal routine exists for this date and slot
    let mealRoutine = await MealRoutine.findOne({
      messId,
      date: mealDate,
      mealSlot,
      isActive: true
    })

    if (!mealRoutine) {
      // Create a default meal routine with basic values
      const defaultMealName = mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)
      
      mealRoutine = new MealRoutine({
        messId,
        date: mealDate,
        mealSlot,
        mealName: defaultMealName,
        eggPerPersonQty: 0,
        chickenPiecePerPersonQty: 0,
        fishPiecePerPersonQty: 0,
        isMealPrepared: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      
      await mealRoutine.save()

    }

    // Check if meal is already prepared
    if (mealRoutine.isMealPrepared) {
      return NextResponse.json({ message: 'This meal has already been marked as prepared' }, { status: 400 })
    }

    // Get all active mess members
    const messData = await Mess.findById(messId)
    if (!messData) {
      return NextResponse.json({ message: 'Mess not found' }, { status: 404 })
    }
    
    const activeMembers = messData.members.filter((member: any) => member.isActive)
    


    // Ensure ALL active members have attendance records for this meal slot
    // This fixes the issue where members without records don't get counted properly
    for (const member of activeMembers) {
      const memberAttendanceResult = await MealAttendance.findOneAndUpdate(
        {
          userId: member.userId,
          messId,
          date: mealDate,
          mealSlot
        },
        {
          $setOnInsert: {
            userId: member.userId,
            messId,
            date: mealDate,
            mealSlot,
            isMealOn: true,  // Default all members to meal on
            extraMealCount: 0
          }
        },
        { 
          upsert: true,
          setDefaultsOnInsert: true,
          new: true
        }
      )

      const wasNewRecord = !memberAttendanceResult.updatedAt || 
        (memberAttendanceResult.createdAt && 
         new Date(memberAttendanceResult.createdAt) > new Date(Date.now() - 1000))
      
      if (wasNewRecord) {
        console.log(`Created default attendance record for member ${member.userId} (${member.name || 'Unknown'})`)
      }
    }

    // Get attendance data to calculate total meals needed
    const attendanceData = await MealAttendance.find({
      messId,
      date: mealDate,
      mealSlot,
      isMealOn: true
    })

    const standardMeals = attendanceData.filter(a => !a.extraMealCount || a.extraMealCount === 0).length
    const extraMeals = attendanceData.reduce((sum, a) => sum + (a.extraMealCount || 0), 0)
    const totalMeals = standardMeals + extraMeals

    if (totalMeals === 0) {
      return NextResponse.json({ message: 'No meals to prepare for this slot' }, { status: 400 })
    }




    // Process custom inventory items selected by admin
    const inventoryResults = []
    for (const customItem of inventoryItems) {
      try {
        // Find inventory item by ID

        
        // Validate ObjectId format
        if (!customItem.itemId || !customItem.itemId.match(/^[0-9a-fA-F]{24}$/)) {
          console.log(`ERROR: Invalid ObjectId format: ${customItem.itemId}`)
          inventoryResults.push({
            itemId: customItem.itemId,
            status: 'invalid_id'
          })
          continue
        }
        
        const inventoryItem = await Inventory.findOne({
          _id: customItem.itemId
        })
        

        if (inventoryItem && inventoryItem.messId.toString() !== messId.toString()) {


          // Update the messId to match the current user's mess
          inventoryItem.messId = messId
        }

        if (inventoryItem) {
          const quantityToDeduct = parseQuantity(customItem.quantityToDeduct)

          
          if (isNaN(quantityToDeduct) || quantityToDeduct <= 0) {
            console.log(`ERROR: Invalid quantity to deduct: ${customItem.quantityToDeduct}`)
            inventoryResults.push({
              item: inventoryItem.itemName,
              status: 'invalid_quantity',
              provided: customItem.quantityToDeduct
            })
            continue
          }
          
          if (inventoryItem.quantity < quantityToDeduct) {
            console.log(`WARNING: Insufficient ${inventoryItem.itemName} in inventory. Available: ${inventoryItem.quantity}, Requested: ${quantityToDeduct}`)
            inventoryResults.push({
              item: inventoryItem.itemName,
              status: 'insufficient',
              available: inventoryItem.quantity,
              requested: quantityToDeduct
            })
          } else {
            const previousQuantity = inventoryItem.quantity
            // Deduct from inventory with proper precision handling
            inventoryItem.quantity = parseQuantity(inventoryItem.quantity - quantityToDeduct)
            inventoryItem.lastUpdated = new Date()
            inventoryItem.updatedByUserId = userId
            

            await inventoryItem.save()

            
            // Log the inventory change

            await logInventoryChange({
              messId,
              inventoryItemId: inventoryItem._id.toString(),
              itemName: inventoryItem.itemName,
              action: 'DEDUCT',
              previousQuantity,
              newQuantity: inventoryItem.quantity,
              unit: inventoryItem.unit,
              category: inventoryItem.category,
              reason: `Meal preparation: ${mealSlot} for ${totalMeals} meals (${standardMeals} standard, ${extraMeals} extra)`,
              performedBy: userId
            })

            
            inventoryResults.push({
              item: inventoryItem.itemName,
              status: 'deducted',
              deducted: quantityToDeduct,
              remaining: inventoryItem.quantity,
              unit: inventoryItem.unit
            })
            

          }
        } else {
          console.log(`WARNING: Inventory item with ID ${customItem.itemId} not found`)
          inventoryResults.push({
            itemId: customItem.itemId,
            status: 'not_found'
          })
        }
      } catch (error) {
        console.error(`ERROR: Failed to update inventory for item ${customItem.itemId}:`, error)
        inventoryResults.push({
          itemId: customItem.itemId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })
      }
    }

    // Mark meal as prepared
    mealRoutine.isMealPrepared = true
    await mealRoutine.save()

    // Create notification for meal served
    try {
      const notification = new Notification({
        messId: messId,
        type: 'meal_preparation',
        title: `${mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)} Meal Served`,
        message: `${mealRoutine.mealName} has been prepared and served for ${totalMeals} members (${standardMeals} standard + ${extraMeals} extra)`,
        priority: 'medium',
        relatedData: {
          date,
          mealSlot,
          mealName: mealRoutine.mealName,
          totalMeals,
          standardMeals,
          extraMeals,
          inventoryUpdated: inventoryResults.length > 0
        }
      })
      await notification.save()

    } catch (notificationError) {
      console.error('ERROR: Failed to create notification for meal served:', notificationError)
      // Don't fail the main operation if notification creation fails
    }



    return NextResponse.json({
      message: 'Meal marked as prepared successfully',
      mealDetails: {
        mealSlot,
        mealName: mealRoutine.mealName,
        totalMeals,
        standardMeals,
        extraMeals
      },
      inventoryUpdates: inventoryResults
    })

  } catch (error) {
    console.error('Error in meal preparation API:', error)
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB()

    // Get token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    const userId = decoded.userId



    // Get user to check admin status
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ message: 'Only admins can mark meals as undone' }, { status: 403 })
    }

    const { date, mealSlot } = await req.json()
    
    if (!date || !mealSlot) {
      return NextResponse.json({ message: 'Date and meal slot are required' }, { status: 400 })
    }

    const messId = user.messId
    if (!messId) {
      return NextResponse.json({ message: 'User is not part of any mess' }, { status: 400 })
    }



    // Parse date to ensure proper format
    const mealDate = new Date(date)
    const startOfDay = new Date(mealDate.getFullYear(), mealDate.getMonth(), mealDate.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    // Find the meal routine
    let mealRoutine = await MealRoutine.findOne({
      messId,
      date: { $gte: startOfDay, $lt: endOfDay },
      mealSlot
    })

    if (!mealRoutine) {
      return NextResponse.json({ message: 'No meal routine found for this date and slot' }, { status: 404 })
    }

    if (!mealRoutine.isMealPrepared) {
      return NextResponse.json({ message: 'This meal has not been marked as prepared yet' }, { status: 400 })
    }

    // Get attendance data to calculate totals
    const attendanceData = await MealAttendance.find({
      messId,
      date: mealDate,
      mealSlot,
      isMealOn: true
    })

    const standardMeals = attendanceData.filter(a => !a.extraMealCount || a.extraMealCount === 0).length
    const extraMeals = attendanceData.reduce((sum, a) => sum + (a.extraMealCount || 0), 0)
    const totalMeals = standardMeals + extraMeals


    // Get the inventory deduction records for this meal preparation
    // Look for any records matching the meal slot and date pattern
    const deductionRecords = await InventoryRecord.find({
      action: 'DEDUCT',
      reason: { $regex: `Meal preparation: ${mealSlot}.*meals` },
      timestamp: {
        $gte: new Date(mealDate.getTime()),
        $lt: new Date(mealDate.getTime() + 24 * 60 * 60 * 1000)
      }
    }).sort({ timestamp: -1 })


    
    // If we found deduction records, extract the meal count from the reason
    let originalTotalMeals = totalMeals
    if (deductionRecords.length > 0) {
      const reasonMatch = deductionRecords[0].reason.match(/for (\d+) meals/)
      if (reasonMatch) {
        originalTotalMeals = parseInt(reasonMatch[1])

      }
    }
    




    // Check if any of these deductions have already been restored
    const restorationRecords = await InventoryRecord.find({
      action: 'UPDATE',
      reason: { $regex: `Meal undone restoration: ${mealSlot}` },
      timestamp: {
        $gte: new Date(mealDate.getTime()),
        $lt: new Date(mealDate.getTime() + 24 * 60 * 60 * 1000)
      }
    })

    // Filter out deduction records that have already been restored
    const unrestoredDeductions = deductionRecords.filter(deductionRecord => {
      return !restorationRecords.some(restorationRecord => 
        restorationRecord.inventoryItemId.toString() === deductionRecord.inventoryItemId.toString() &&
        restorationRecord.timestamp > deductionRecord.timestamp
      )
    })



    if (unrestoredDeductions.length === 0) {

    }

    // Restore inventory items based on the unrestored deduction records
    const inventoryResults = []
    for (const record of unrestoredDeductions) {
      try {
        // Find inventory item by ID (without messId restriction since it might have changed)
        const inventoryItem = await Inventory.findOne({
          _id: record.inventoryItemId
        })

        if (inventoryItem) {
          // Update messId to current user's mess if it's different
          if (inventoryItem.messId.toString() !== messId.toString()) {

            inventoryItem.messId = messId
          }
          
          const quantityToRestore = record.previousQuantity - record.newQuantity // Amount that was deducted
          const previousQuantity = inventoryItem.quantity
          
          // Add back to inventory with proper precision handling
          inventoryItem.quantity = parseQuantity(inventoryItem.quantity + quantityToRestore)
          inventoryItem.lastUpdated = new Date()
          inventoryItem.updatedByUserId = userId
          await inventoryItem.save()
          
          // Log the restoration
          await logInventoryChange({
            messId,
            inventoryItemId: inventoryItem._id.toString(),
            itemName: inventoryItem.itemName,
            action: 'UPDATE',
            previousQuantity,
            newQuantity: inventoryItem.quantity,
            unit: inventoryItem.unit,
            category: inventoryItem.category,
            reason: `Meal undone restoration: ${mealSlot} - restored ${quantityToRestore} ${inventoryItem.unit}`,
            performedBy: userId
          })
          
          inventoryResults.push({
            item: inventoryItem.itemName,
            status: 'restored',
            restored: quantityToRestore,
            newTotal: inventoryItem.quantity,
            unit: inventoryItem.unit
          })
          

        } else {
          console.log(`WARNING: Inventory item with ID ${record.inventoryItemId} not found for restoration`)
          inventoryResults.push({
            item: record.itemName,
            status: 'not_found'
          })
        }
      } catch (error) {
        console.error(`ERROR: Failed to restore inventory for ${record.itemName}:`, error)
        inventoryResults.push({
          item: record.itemName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Mark meal as not prepared
    mealRoutine.isMealPrepared = false
    await mealRoutine.save()

    // Create notification for meal undone
    try {
      const notification = new Notification({
        messId: messId,
        type: 'meal_preparation',
        title: `${mealSlot.charAt(0).toUpperCase() + mealSlot.slice(1)} Meal Undone`,
        message: `${mealRoutine.mealName} serving has been cancelled. Inventory items have been restored.`,
        priority: 'medium',
        relatedData: {
          date,
          mealSlot,
          mealName: mealRoutine.mealName,
          totalMeals,
          standardMeals,
          extraMeals,
          inventoryRestored: inventoryResults.length > 0,
          restoredItems: inventoryResults.filter(item => item.status === 'restored').length
        }
      })
      await notification.save()

    } catch (notificationError) {
      console.error('ERROR: Failed to create notification for meal undone:', notificationError)
      // Don't fail the main operation if notification creation fails
    }



    return NextResponse.json({
      message: 'Meal marked as undone successfully',
      mealDetails: {
        mealSlot,
        mealName: mealRoutine.mealName,
        totalMeals,
        standardMeals,
        extraMeals
      },
      inventoryUpdates: inventoryResults
    })

  } catch (error) {
    console.error('Error in meal undone API:', error)
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
}
