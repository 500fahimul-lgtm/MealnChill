import { logInventoryChange } from '@/lib/inventoryLogger'
import connectDB from '@/lib/mongodb'
import Inventory from '@/models/Inventory'
import InventoryRecord from '@/models/InventoryRecord'
import MealAttendance from '@/models/MealAttendance'
import MealRoutine from '@/models/MealRoutine'
import Notification from '@/models/Notification'
import User from '@/models/User'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

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

    console.log(`DEBUG: User ${userId} requesting meal preparation`)

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

    console.log(`DEBUG: User messId: ${messId}, type: ${typeof messId}`)
    console.log(`DEBUG: Processing meal preparation for ${mealSlot} on ${date}`)

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
      console.log(`DEBUG: No meal routine found for ${mealSlot} on ${date}. Creating default routine.`)
      
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
      console.log(`DEBUG: Created default meal routine for ${mealSlot} on ${date}`)
    }

    // Check if meal is already prepared
    if (mealRoutine.isMealPrepared) {
      return NextResponse.json({ message: 'This meal has already been marked as prepared' }, { status: 400 })
    }

    // Ensure admin's attendance is set to "meal on" if no attendance record exists
    // This fixes the issue where admin can't mark meal as done if they don't have attendance set
    const adminAttendanceResult = await MealAttendance.findOneAndUpdate(
      {
        userId,
        messId,
        date: mealDate,
        mealSlot
      },
      {
        $setOnInsert: {
          userId,
          messId,
          date: mealDate,
          mealSlot,
          isMealOn: true,  // Default admin to meal on
          extraMealCount: 0
        }
      },
      { 
        upsert: true,
        setDefaultsOnInsert: true,
        new: true
      }
    )

    // Log if admin attendance was created/ensured
    console.log(`Admin attendance ensured for ${mealSlot} on ${date}:`, {
      adminUserId: userId,
      isMealOn: adminAttendanceResult.isMealOn,
      wasNewRecord: !adminAttendanceResult.createdAt || new Date(adminAttendanceResult.createdAt) > new Date(Date.now() - 1000)
    })

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

    console.log(`DEBUG: Processing ${inventoryItems.length} custom inventory items`)
    console.log(`DEBUG: Received inventory items:`, JSON.stringify(inventoryItems, null, 2))

    // Process custom inventory items selected by admin
    const inventoryResults = []
    for (const customItem of inventoryItems) {
      try {
        // Find inventory item by ID
        console.log(`DEBUG: Looking for inventory item with ID: ${customItem.itemId} in mess: ${messId}`)
        
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
        
        console.log(`DEBUG: Found inventory item:`, inventoryItem ? inventoryItem.itemName : 'NOT FOUND')
        if (inventoryItem && inventoryItem.messId.toString() !== messId.toString()) {
          console.log(`DEBUG: Item has different messId. Item messId: ${inventoryItem.messId}, Expected messId: ${messId}`)
          console.log(`DEBUG: Updating item messId to match current user's mess`)
          // Update the messId to match the current user's mess
          inventoryItem.messId = messId
        }

        if (inventoryItem) {
          const quantityToDeduct = parseFloat(customItem.quantityToDeduct)
          console.log(`DEBUG: Processing ${inventoryItem.itemName}: current=${inventoryItem.quantity}, toDeduct=${quantityToDeduct}, type=${typeof quantityToDeduct}`)
          
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
            // Deduct from inventory
            inventoryItem.quantity -= quantityToDeduct
            inventoryItem.lastUpdated = new Date()
            inventoryItem.updatedByUserId = userId
            
            console.log(`DEBUG: About to save inventory item. New quantity: ${inventoryItem.quantity}`)
            await inventoryItem.save()
            console.log(`DEBUG: Successfully saved inventory item ${inventoryItem.itemName}`)
            
            // Log the inventory change
            console.log(`DEBUG: About to log inventory change`)
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
            console.log(`DEBUG: Successfully logged inventory change`)
            
            inventoryResults.push({
              item: inventoryItem.itemName,
              status: 'deducted',
              deducted: quantityToDeduct,
              remaining: inventoryItem.quantity,
              unit: inventoryItem.unit
            })
            
            console.log(`DEBUG: Deducted ${quantityToDeduct} ${inventoryItem.unit} of ${inventoryItem.itemName}. Remaining: ${inventoryItem.quantity}`)
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
      console.log(`DEBUG: Notification created for meal served: ${mealSlot}`)
    } catch (notificationError) {
      console.error('ERROR: Failed to create notification for meal served:', notificationError)
      // Don't fail the main operation if notification creation fails
    }

    console.log(`DEBUG: Meal ${mealSlot} marked as prepared successfully`)

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

    console.log(`DEBUG: User ${userId} requesting meal undone`)

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

    console.log(`DEBUG: Processing meal undone for ${mealSlot} on ${date}`)

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
    console.log(`DEBUG: Current attendance shows ${totalMeals} meals (${standardMeals} standard, ${extraMeals} extra)`)

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

    console.log(`DEBUG: Found ${deductionRecords.length} deduction records for ${mealSlot} on ${date}`)
    
    // If we found deduction records, extract the meal count from the reason
    let originalTotalMeals = totalMeals
    if (deductionRecords.length > 0) {
      const reasonMatch = deductionRecords[0].reason.match(/for (\d+) meals/)
      if (reasonMatch) {
        originalTotalMeals = parseInt(reasonMatch[1])
        console.log(`DEBUG: Extracted original meal count from deduction record: ${originalTotalMeals}`)
      }
    }
    
    console.log(`DEBUG: Restoring inventory for ${originalTotalMeals} meals (using original meal count from deduction records)`)

    console.log(`DEBUG: Found ${deductionRecords.length} deduction records to restore`)

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

    console.log(`DEBUG: Found ${unrestoredDeductions.length} unrestored deduction records`)

    if (unrestoredDeductions.length === 0) {
      console.log('DEBUG: All deductions for this meal have already been restored')
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
            console.log(`DEBUG: Updating restoration item messId from ${inventoryItem.messId} to ${messId}`)
            inventoryItem.messId = messId
          }
          
          const quantityToRestore = record.previousQuantity - record.newQuantity // Amount that was deducted
          const previousQuantity = inventoryItem.quantity
          
          // Add back to inventory
          inventoryItem.quantity += quantityToRestore
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
          
          console.log(`DEBUG: Restored ${quantityToRestore} ${inventoryItem.unit} of ${inventoryItem.itemName}. New total: ${inventoryItem.quantity}`)
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
      console.log(`DEBUG: Notification created for meal undone: ${mealSlot}`)
    } catch (notificationError) {
      console.error('ERROR: Failed to create notification for meal undone:', notificationError)
      // Don't fail the main operation if notification creation fails
    }

    console.log(`DEBUG: Meal ${mealSlot} marked as undone successfully`)

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
