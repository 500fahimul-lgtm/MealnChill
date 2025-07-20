# MealNChill Universal Styling Guide

This guide documents the universal CSS classes available in the MealNChill application for consistent form styling and UI components.

## Overview

All universal styles are defined in `src/app/globals.css` using Tailwind's `@layer components` directive. This approach provides:
- Consistent styling across all components
- Easy maintenance and updates
- Reduced code duplication
- Better developer experience

## Form Components

### Input Fields

#### Basic Input
```jsx
<input className="input-base" type="text" placeholder="Enter text..." />
```

#### Size Variants
```jsx
<input className="input-large" />  // Larger padding
<input className="input-small" />  // Smaller, compact
<input className="input-xs" />     // Extra small for tight spaces
```

#### Specialized Inputs
```jsx
<input className="input-number" type="number" />           // Center-aligned numbers
<input className="input-number-small" type="number" />     // Small counter/quantity
<input className="input-search" type="text" />             // Search with icon space
<input className="input-time" type="time" />               // Time picker with monospace
```

### Select Dropdowns

```jsx
<select className="select-base">
  <option>Choose option...</option>
</select>

<select className="select-large">...</select>  // Larger variant
<select className="select-small">...</select>  // Smaller variant
<select className="select-xs">...</select>     // Extra small variant
```

### Textarea

```jsx
<textarea className="textarea-base" rows={4} placeholder="Enter description..."></textarea>
```

### Labels

```jsx
<label className="label-base">Field Name</label>
<label className="label-required">Required Field</label>  // Adds red asterisk
```

## Buttons

### Primary Actions
```jsx
<button className="btn-primary">Save Changes</button>
<button className="btn-primary btn-large">Large Action</button>
<button className="btn-primary btn-small">Small Action</button>
```

### Button Variants
```jsx
<button className="btn-secondary">Cancel</button>
<button className="btn-success">Approve</button>
<button className="btn-danger">Delete</button>
```

## Layout Components

### Form Groups
```jsx
<div className="form-group">
  <label className="label-base">Email</label>
  <input className="input-base" type="email" />
  <p className="form-help">We'll never share your email</p>
</div>

<div className="form-group-inline">
  <label className="label-base">Enable notifications</label>
  <input type="checkbox" />
</div>
```

### Form Sections
```jsx
<div className="form-section">
  <h3>User Information</h3>
  <div className="form-grid">
    <div className="form-group">...</div>
    <div className="form-group">...</div>
  </div>
</div>
```

### Grid Layouts
```jsx
<div className="form-grid">     // 2-column on md screens
  <div>Column 1</div>
  <div>Column 2</div>
</div>

<div className="form-grid-3">   // 3-column on md screens
  <div>Column 1</div>
  <div>Column 2</div>
  <div>Column 3</div>
</div>
```

## Search Components

```jsx
<div className="search-container">
  <div className="search-icon">
    <SearchIcon />
  </div>
  <input className="input-search" placeholder="Search..." />
  <div className="search-clear">
    <ClearIcon />
  </div>
</div>
```

## Status Indicators

```jsx
<span className="status-active">Active</span>
<span className="status-inactive">Inactive</span>
<span className="status-pending">Pending</span>
```

## Cards and Containers

```jsx
<div className="card-base">
  <h3>Card Title</h3>
  <p>Card content...</p>
</div>

<div className="card-border">
  <p>Simple bordered card</p>
</div>
```

## Feedback Messages

```jsx
<div className="form-group">
  <input className="input-base" />
  <p className="form-error">This field is required</p>
</div>

<div className="form-group">
  <input className="input-base" />
  <p className="form-help">Password must be at least 8 characters</p>
</div>
```

## Complete Form Example

```jsx
<div className="form-section">
  <h2>User Registration</h2>
  
  <div className="form-grid">
    <div className="form-group">
      <label className="label-required">First Name</label>
      <input className="input-base" type="text" required />
    </div>
    
    <div className="form-group">
      <label className="label-required">Last Name</label>
      <input className="input-base" type="text" required />
    </div>
  </div>
  
  <div className="form-group">
    <label className="label-required">Email</label>
    <input className="input-base" type="email" required />
    <p className="form-help">We'll use this for account verification</p>
  </div>
  
  <div className="form-group">
    <label className="label-base">Role</label>
    <select className="select-base">
      <option>Select role...</option>
      <option>Member</option>
      <option>Admin</option>
    </select>
  </div>
  
  <div className="form-group-inline">
    <button className="btn-secondary">Cancel</button>
    <button className="btn-primary">Create User</button>
  </div>
</div>
```

## Migration Guide

### Before (Inline Tailwind)
```jsx
<input 
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
  type="text" 
/>
```

### After (Universal Classes)
```jsx
<input className="input-base" type="text" />
```

## Benefits

1. **Consistency**: All form elements look and behave the same way
2. **Maintainability**: Changes to styles only need to be made in one place
3. **Developer Experience**: Less verbose code, easier to read and write
4. **Performance**: Reduced CSS bundle size through class reuse
5. **Accessibility**: Built-in focus states and proper contrast ratios

## Customization

To modify styles, edit the classes in `src/app/globals.css` within the `@layer components` block. The Tailwind build process will automatically apply your changes across all components using these classes.

## Best Practices

1. Always use universal classes for form elements instead of inline Tailwind
2. Combine universal classes with utility classes when needed: `className="input-base mb-4"`
3. Use semantic class names: `btn-danger` for delete actions, `status-active` for active states
4. Maintain consistent spacing using form-group containers
5. Provide proper labels and help text for accessibility
