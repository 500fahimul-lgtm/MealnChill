# Deactivated User Meal Attendance Restrictions

## Overview

This feature prevents deactivated users from modifying their meal attendance while still allowing them to view the meal summary and live mess information.

## Implementation Details

### **🔴 Restrictions for Deactivated Users:**

#### **What They CANNOT Do:**

- ✅ **Toggle Meal Status**: Cannot turn meals on/off (disabled toggle switch)
- ✅ **Modify Extra Meals**: Cannot increase/decrease extra meal count (disabled + and - buttons)
- ✅ **Input Extra Meals**: Cannot manually enter extra meal numbers (disabled input field)
- ✅ **Save Changes**: Cannot save any meal attendance changes (blocked at save function)

#### **What They CAN Still Do:**

- ✅ **View Meal Summary**: Can see today's live mess meal counts
- ✅ **View Meal Status**: Can see their current meal on/off status (read-only)
- ✅ **View Extra Meals**: Can see their current extra meal count (read-only)
- ✅ **View Deadlines**: Can see meal deadlines and timing information
- ✅ **View Preparation Status**: Can see if meals have been prepared

### **Visual Indicators:**

#### **Deactivation Badge:**

- **Location**: Top-right of each meal card
- **Appearance**: Red background with warning icon
- **Text**: "Deactivated - Contact Admin"
- **Visibility**: Only shown to deactivated non-admin users

#### **Disabled Controls:**

- **Toggle Switch**: Grayed out and non-clickable
- **Extra Meal Buttons**: Grayed out with disabled cursor
- **Input Fields**: Grayed background, non-editable
- **Visual Feedback**: Reduced opacity (50%) and scale (95%)

### **User Experience Messages:**

#### **Warning Toast Messages:**

When deactivated users try to interact with controls, they see:

```
"You are deactivated by admin. Please ask admin to activate your meals."
```

- **Type**: Warning toast (orange/yellow styling)
- **Duration**: 5 seconds auto-dismiss
- **Trigger**: Any attempt to modify meal attendance

### **Technical Implementation:**

#### **Frontend State Management:**

```typescript
const [isUserActive, setIsUserActive] = useState<boolean>(true);

// Fetch user's active status from mess members
const fetchUserActiveStatus = useCallback(async () => {
  const response = await fetch(`/api/mess/${messId}`);
  const data = await response.json();
  const currentUserMember = data.mess?.members?.find(
    (member) => member.userId.toString() === userId
  );
  if (currentUserMember) {
    setIsUserActive(currentUserMember.isActive !== false);
  }
}, [messId, userId]);
```

#### **Control Restrictions:**

```typescript
// Example: Toggle button disabled condition
disabled={
  isSaving ||
  (!deadline?.canModify && !isAdmin) ||
  (isMealPrepared && !isAdmin) ||
  (!isUserActive && !isAdmin)  // NEW: Deactivation check
}

// Example: Function-level checks
const toggleMealStatus = (mealSlot: string, currentValue: boolean) => {
  if (!isUserActive && !isAdmin) {
    showToast('You are deactivated by admin. Please ask admin to activate your meals.', 'warning')
    return
  }
  // ... rest of function
}
```

#### **Component Initialization:**

```typescript
useEffect(() => {
  const initializeData = async () => {
    await fetchMessSettings(); // Fetch mess settings
    await fetchUserActiveStatus(); // Fetch user's active status
    await fetchAttendanceData(); // Fetch attendance data
  };
  initializeData();
}, [fetchMessSettings, fetchUserActiveStatus, fetchAttendanceData]);
```

### **Admin Override:**

#### **Admins Are NOT Affected:**

- ✅ Admins can always modify attendance (even if technically "deactivated")
- ✅ Admin override badges still work
- ✅ All admin functionality remains unchanged

### **Backward Compatibility:**

#### **Default Behavior:**

- ✅ Users default to `isActive: true` if status not specified
- ✅ No breaking changes for existing users
- ✅ Graceful degradation if API calls fail

### **Integration with Existing Features:**

#### **Works Alongside:**

- ✅ **Deadline Restrictions**: Deactivation check + deadline check
- ✅ **Meal Preparation Lock**: Deactivation check + preparation check
- ✅ **Admin Override**: Admins bypass all restrictions including deactivation
- ✅ **Save Functionality**: Blocked at multiple levels for security

### **Testing Scenarios:**

#### **Scenario 1: Deactivated Regular User**

1. Admin deactivates user
2. User sees "Deactivated - Contact Admin" badge
3. All controls are disabled (grayed out)
4. Clicking any control shows warning message
5. User can still view meal summary and counts

#### **Scenario 2: Deactivated Admin**

1. Admin cannot deactivate themselves (prevented in backend)
2. If somehow deactivated, admin override still works
3. Admin functionality remains intact

#### **Scenario 3: User Reactivation**

1. Admin activates user
2. Badge disappears immediately
3. Controls become enabled again
4. User can modify attendance normally

## Status: ✅ **Fully Implemented and Production Ready**

The deactivated user restrictions are now complete with:

- ✅ Visual indicators and badges
- ✅ Functional restrictions on all controls
- ✅ Clear user feedback messages
- ✅ Admin override protection
- ✅ Integration with existing features
- ✅ Proper error handling and graceful degradation
