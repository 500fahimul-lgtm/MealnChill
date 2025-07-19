import { logInventoryChange } from '@/lib/inventoryLogger'
import connectDB from '@/lib/mongodb'
import Inventory from '@/models/Inventory'
import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

const verifyToken = async (token: string) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return decoded
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.messId) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 })
    }

    const inventory = await Inventory.find({ messId: decoded.messId })
      .sort({ name: 1 })
      .lean()

    return NextResponse.json({ inventory })
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.messId || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const { itemName, quantity, unit, category } = await request.json()

    // Validate required fields
    if (!itemName || !quantity || !unit) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    // Check if item already exists
    let existingItem = await Inventory.findOne({
      messId: decoded.messId,
      itemName: { $regex: new RegExp(`^${itemName}$`, 'i') },
      unit: unit.toLowerCase()
    })

    let savedItem
    let action: 'ADD' | 'UPDATE' = 'ADD'
    let previousQuantity = 0

    if (existingItem) {
      // Update existing item
      previousQuantity = existingItem.quantity
      existingItem.quantity += parseFloat(quantity)
      existingItem.category = category || existingItem.category
      existingItem.updatedByUserId = decoded.userId
      savedItem = await existingItem.save()
      action = 'UPDATE'
    } else {
      // Create new item
      const inventoryItem = new Inventory({
        messId: decoded.messId,
        itemName,
        quantity: parseFloat(quantity),
        unit: unit.toLowerCase(),
        category: category || 'Other',
        updatedByUserId: decoded.userId
      })
      savedItem = await inventoryItem.save()
    }

    // Log the change
    await logInventoryChange({
      messId: decoded.messId,
      inventoryItemId: savedItem._id.toString(),
      itemName: savedItem.itemName,
      action,
      previousQuantity,
      newQuantity: savedItem.quantity,
      unit: savedItem.unit,
      category: savedItem.category,
      reason: action === 'ADD' ? 'New item added' : `Added ${quantity} ${unit}`,
      performedBy: decoded.userId
    })

    return NextResponse.json({
      message: action === 'ADD' ? 'Inventory item added successfully' : 'Inventory item updated successfully',
      item: savedItem
    })
  } catch (error) {
    console.error('Error adding inventory item:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.messId || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const { id, quantity, itemName, category, unit } = await request.json()

    if (!id || quantity === undefined) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const item = await Inventory.findOne({ _id: id, messId: decoded.messId })

    if (!item) {
      return NextResponse.json({ message: 'Inventory item not found' }, { status: 404 })
    }

    const previousQuantity = item.quantity
    const previousItemName = item.itemName
    const previousCategory = item.category
    const previousUnit = item.unit

    // Update the item with new values
    if (itemName) item.itemName = itemName.trim()
    if (category) item.category = category
    if (unit) item.unit = unit.toLowerCase()
    item.quantity = parseFloat(quantity)
    item.updatedByUserId = decoded.userId
    const savedItem = await item.save()

    // Create more detailed reason for logging
    let reason = 'Item updated:'
    const changes = []
    if (previousQuantity !== savedItem.quantity) {
      changes.push(`quantity from ${previousQuantity} to ${savedItem.quantity} ${savedItem.unit}`)
    }
    if (itemName && previousItemName !== savedItem.itemName) {
      changes.push(`name from "${previousItemName}" to "${savedItem.itemName}"`)
    }
    if (category && previousCategory !== savedItem.category) {
      changes.push(`category from "${previousCategory}" to "${savedItem.category}"`)
    }
    if (unit && previousUnit !== savedItem.unit) {
      changes.push(`unit from "${previousUnit}" to "${savedItem.unit}"`)
    }
    if (changes.length > 0) {
      reason += ' ' + changes.join(', ')
    } else {
      reason = `Quantity updated from ${previousQuantity} to ${savedItem.quantity}`
    }

    // Log the change
    await logInventoryChange({
      messId: decoded.messId,
      inventoryItemId: savedItem._id.toString(),
      itemName: savedItem.itemName,
      action: 'UPDATE',
      previousQuantity,
      newQuantity: savedItem.quantity,
      unit: savedItem.unit,
      category: savedItem.category,
      reason,
      performedBy: decoded.userId
    })

    return NextResponse.json({
      message: 'Inventory updated successfully',
      item: savedItem
    })
  } catch (error) {
    console.error('Error updating inventory:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB()

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded || !decoded.messId || decoded.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })
    }

    const url = new URL(request.url)
    const itemId = url.searchParams.get('id')

    if (!itemId) {
      return NextResponse.json({ message: 'Item ID is required' }, { status: 400 })
    }

    const item = await Inventory.findOne({ _id: itemId, messId: decoded.messId })

    if (!item) {
      return NextResponse.json({ message: 'Inventory item not found' }, { status: 404 })
    }

    // Log the deletion before removing
    await logInventoryChange({
      messId: decoded.messId,
      inventoryItemId: item._id.toString(),
      itemName: item.itemName,
      action: 'REMOVE',
      previousQuantity: item.quantity,
      newQuantity: 0,
      unit: item.unit,
      category: item.category,
      reason: `Item deleted - had ${item.quantity} ${item.unit} in stock`,
      performedBy: decoded.userId
    })

    // Delete the item
    await Inventory.deleteOne({ _id: itemId, messId: decoded.messId })

    return NextResponse.json({
      message: 'Inventory item deleted successfully',
      deletedItem: {
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit
      }
    })
  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
