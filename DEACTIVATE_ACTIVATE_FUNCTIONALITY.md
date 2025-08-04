# Member Deactivate/Activate Functionality Documentation

## Overview

The deactivate/activate functionality allows admins to temporarily disable or enable a member's meal participation while keeping them in the mess.

## Functionality Implementation

### 🔴 **Deactivate Member**

When an admin clicks "Deactivate" on a member:

#### Backend Actions:

1. **Member Status Update**: Sets `member.isActive = false` in mess members array
2. **Meal Attendance Control**: Automatically turns off ALL meals (breakfast, lunch, dinner) for:
   - Today (if not already past)
   - All future dates
3. **Notification System**: Sends notification to ALL other members (excluding the deactivated member):
   - **Title**: "Member Meal Deactivated"
   - **Message**: "{Member Name}'s meals have been deactivated by admin."

#### User Experience:

- ✅ Member remains in the mess (not removed)
- ✅ Member's meals are automatically turned off
- ✅ All other members are notified of the deactivation
- ✅ Deactivated member can still access the app but meals are off

### 🟢 **Activate Member**

When an admin clicks "Activate" on a deactivated member:

#### Backend Actions:

1. **Member Status Update**: Sets `member.isActive = true` in mess members array
2. **Meal Attendance Restoration**: Automatically turns on meals for:
   - Today (if not already past)
   - Next 7 days (creates records if they don't exist)
   - Respects mess meal frequency (breakfast only if 3-meal mess)
3. **Notification System**: Sends notification to ALL members (including the activated member):
   - **Title**: "Member Meal Activated"
   - **Message**: "{Member Name}'s meals have been activated by admin."

#### User Experience:

- ✅ Member becomes fully active again
- ✅ Member's meals are automatically turned on with default settings
- ✅ All members are notified of the activation
- ✅ Member can now participate in meals normally

## Technical Implementation

### API Endpoint

- **URL**: `/api/mess/[messId]/members/[userId]`
- **Method**: `PUT`
- **Authentication**: Admin access required
- **Body**: `{ "isActive": boolean }`

### Database Operations

#### Deactivation:

```typescript
// Update member status
mess.members[memberIndex].isActive = false;

// Turn off all future meals
await MealAttendance.updateMany(
  { userId, messId, date: { $gte: today } },
  {
    $set: {
      "breakfast.status": "off",
      "lunch.status": "off",
      "dinner.status": "off",
      // ... update metadata
    },
  }
);
```

#### Activation:

```typescript
// Update member status
mess.members[memberIndex].isActive = true;

// Create/update meal records for next 7 days
// Turn on meals with default settings
await MealAttendance.updateMany(
  { userId, messId, date: { $gte: today } },
  {
    $set: {
      "breakfast.status": mess.mealFrequency === 3 ? "on" : "off",
      "lunch.status": "on",
      "dinner.status": "on",
      // ... update metadata
    },
  }
);
```

### Notification System

```typescript
const notifications = allMembers.map((member) => ({
  messId: messId,
  userId: member._id,
  type: "general",
  title: isActive ? "Member Meal Activated" : "Member Meal Deactivated",
  message: `${memberUser.name}'s meals have been ${
    isActive ? "activated" : "deactivated"
  } by admin.`,
  isRead: false,
  createdAt: new Date(),
}));
```

## Security & Validation

### Admin Protection:

- ✅ Only admins can deactivate/activate members
- ✅ Admins cannot deactivate themselves
- ✅ Proper token validation and mess membership verification

### Data Integrity:

- ✅ Only affects current mess members
- ✅ Only modifies future meal attendance (preserves historical data)
- ✅ Creates meal records if they don't exist during activation

## Use Cases

### **Scenario 1: Temporary Leave**

- Member going on vacation for a week
- Admin deactivates → meals automatically off
- Member returns → Admin activates → meals automatically on

### **Scenario 2: Meal Plan Changes**

- Member wants to temporarily stop eating from mess
- Admin deactivates → member stays in mess but no meals
- Member ready to resume → Admin activates → back to normal

### **Scenario 3: Disciplinary Action**

- Member violated mess rules
- Admin deactivates as temporary suspension
- Issue resolved → Admin activates → member restored

## Frontend Integration

### Mess Settings → Manage Members:

```tsx
<button
  onClick={() => handleMemberToggle(member.userId, member.isActive)}
  className={`px-4 py-2 rounded-lg font-medium ${
    member.isActive
      ? "bg-red-100 text-red-700 hover:bg-red-200" // Deactivate
      : "bg-green-100 text-green-700 hover:bg-green-200" // Activate
  }`}
>
  {member.isActive ? "Deactivate" : "Activate"}
</button>
```

## Status: ✅ **Fully Implemented and Production Ready**

The deactivate/activate functionality is now completely implemented with:

- Full meal attendance automation
- Comprehensive notification system
- Proper security and validation
- Clean user experience for both admins and members
