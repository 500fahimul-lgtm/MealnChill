import connectDB from '@/lib/mongodb'
import Inventory from '@/models/Inventory'
import MealAttendance from '@/models/MealAttendance'
import MealRoutine from '@/models/MealRoutine'
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

    const { date, mealSlot } = await req.json()
    
    if (!date || !mealSlot) {
      return NextResponse.json({ message: 'Date and meal slot are required' }, { status: 400 })
    }

    const messId = user.messId
    if (!messId) {
      return NextResponse.json({ message: 'User is not part of any mess' }, { status: 400 })
    }

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

    // Calculate inventory deductions
    const inventoryUpdates = []
    
    // Eggs
    if (mealRoutine.eggPerPersonQty > 0) {
      const totalEggs = mealRoutine.eggPerPersonQty * totalMeals
      inventoryUpdates.push({
        itemName: 'Eggs',
        unit: 'pieces',
        quantityToDeduct: totalEggs
      })
    }

    // Chicken pieces
    if (mealRoutine.chickenPiecePerPersonQty > 0) {
      const totalChickenPieces = mealRoutine.chickenPiecePerPersonQty * totalMeals
      inventoryUpdates.push({
        itemName: 'Chicken Pieces',
        unit: 'pieces',
        quantityToDeduct: totalChickenPieces
      })
    }

    // Fish pieces
    if (mealRoutine.fishPiecePerPersonQty > 0) {
      const totalFishPieces = mealRoutine.fishPiecePerPersonQty * totalMeals
      inventoryUpdates.push({
        itemName: 'Fish Pieces',
        unit: 'pieces',
        quantityToDeduct: totalFishPieces
      })
    }

    console.log(`DEBUG: Inventory updates needed:`, inventoryUpdates)

    // Update inventory items
    const inventoryResults = []
    for (const update of inventoryUpdates) {
      try {
        // Find inventory item (case-insensitive search)
        const inventoryItem = await Inventory.findOne({
          messId,
          itemName: { $regex: new RegExp(`^${update.itemName}$`, 'i') },
          unit: update.unit
        })

        if (inventoryItem) {
          if (inventoryItem.quantity < update.quantityToDeduct) {
            console.log(`WARNING: Insufficient ${update.itemName} in inventory. Available: ${inventoryItem.quantity}, Needed: ${update.quantityToDeduct}`)
            inventoryResults.push({
              item: update.itemName,
              status: 'insufficient',
              available: inventoryItem.quantity,
              needed: update.quantityToDeduct
            })
          } else {
            // Deduct from inventory
            inventoryItem.quantity -= update.quantityToDeduct
            inventoryItem.lastUpdated = new Date()
            inventoryItem.updatedByUserId = userId
            await inventoryItem.save()
            
            inventoryResults.push({
              item: update.itemName,
              status: 'deducted',
              deducted: update.quantityToDeduct,
              remaining: inventoryItem.quantity
            })
            
            console.log(`DEBUG: Deducted ${update.quantityToDeduct} ${update.unit} of ${update.itemName}. Remaining: ${inventoryItem.quantity}`)
          }
        } else {
          console.log(`WARNING: ${update.itemName} not found in inventory`)
          inventoryResults.push({
            item: update.itemName,
            status: 'not_found'
          })
        }
      } catch (error) {
        console.error(`ERROR: Failed to update inventory for ${update.itemName}:`, error)
        inventoryResults.push({
          item: update.itemName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        })
      }
    }

    // Mark meal as prepared
    mealRoutine.isMealPrepared = true
    await mealRoutine.save()

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
    console.log(`DEBUG: Restoring inventory for ${totalMeals} meals (${standardMeals} standard, ${extraMeals} extra)`)

    // Restore inventory items (add back what was deducted)
    const inventoryUpdates = []

    // Eggs
    if (mealRoutine.eggPerPersonQty > 0) {
      const totalEggs = mealRoutine.eggPerPersonQty * totalMeals
      inventoryUpdates.push({
        itemName: 'Eggs',
        unit: 'pieces',
        quantityToRestore: totalEggs
      })
    }

    // Chicken pieces
    if (mealRoutine.chickenPiecePerPersonQty > 0) {
      const totalChickenPieces = mealRoutine.chickenPiecePerPersonQty * totalMeals
      inventoryUpdates.push({
        itemName: 'Chicken Pieces',
        unit: 'pieces',
        quantityToRestore: totalChickenPieces
      })
    }

    // Fish pieces
    if (mealRoutine.fishPiecePerPersonQty > 0) {
      const totalFishPieces = mealRoutine.fishPiecePerPersonQty * totalMeals
      inventoryUpdates.push({
        itemName: 'Fish Pieces',
        unit: 'pieces',
        quantityToRestore: totalFishPieces
      })
    }

    console.log(`DEBUG: Inventory updates needed for restoration:`, inventoryUpdates)

    // Restore inventory items
    const inventoryResults = []
    for (const update of inventoryUpdates) {
      try {
        // Find inventory item (case-insensitive search)
        const inventoryItem = await Inventory.findOne({
          messId,
          itemName: { $regex: new RegExp(`^${update.itemName}$`, 'i') },
          unit: update.unit
        })

        if (inventoryItem) {
          // Add back to inventory
          inventoryItem.quantity += update.quantityToRestore
          inventoryItem.lastUpdated = new Date()
          inventoryItem.updatedByUserId = userId
          await inventoryItem.save()
          
          inventoryResults.push({
            item: update.itemName,
            status: 'restored',
            restored: update.quantityToRestore,
            newTotal: inventoryItem.quantity
          })
          
          console.log(`DEBUG: Restored ${update.quantityToRestore} ${update.unit} of ${update.itemName}. New total: ${inventoryItem.quantity}`)
        } else {
          console.log(`WARNING: ${update.itemName} not found in inventory for restoration`)
          inventoryResults.push({
            item: update.itemName,
            status: 'not_found'
          })
        }
      } catch (error) {
        console.error(`ERROR: Failed to restore inventory for ${update.itemName}:`, error)
        inventoryResults.push({
          item: update.itemName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Mark meal as not prepared
    mealRoutine.isMealPrepared = false
    await mealRoutine.save()

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
