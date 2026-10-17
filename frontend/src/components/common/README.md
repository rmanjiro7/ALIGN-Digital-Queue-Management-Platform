# Shared Common Components

This directory contains reusable UI components used across the ALIGN application.

## Toast / Notification System

### Usage

The toast system provides non-blocking, dismissible notifications for user feedback.

#### Using the React Hook (Recommended for Components)

```typescript
import { useToast } from '../components/common/Toast';

function MyComponent() {
  const toast = useToast();
  
  const handleAction = async () => {
    try {
      await someAsyncOperation();
      toast.success('Operation completed successfully');
    } catch (error) {
      toast.error('Operation failed', 'Error');
    }
  };
  
  return <button onClick={handleAction}>Do Something</button>;
}
```

#### Using the Imperative API (For Non-Component Code)

```typescript
import { toast } from '../components/common/Toast';

// In service files, utilities, or event handlers
export const performExport = () => {
  downloadFile();
  toast.success('CSV exported successfully');
};
```

### Toast Types

- **`success`**: Positive feedback (e.g., "Export completed", "Changes saved")
- **`error`**: Error messages (e.g., "Failed to load data", "Invalid credentials")
- **`warning`**: Cautionary messages (e.g., "Location permission required", "Session expiring soon")
- **`info`**: Informational messages (e.g., "Queue status updated", "Location detected")

### API

```typescript
// All variants support the same signature:
toast.success(message: string, title?: string, duration?: number)
toast.error(message: string, title?: string, duration?: number)
toast.warning(message: string, title?: string, duration?: number)
toast.info(message: string, title?: string, duration?: number)

// Examples:
toast.success('Export completed');
toast.error('Failed to load analytics', 'Error');
toast.warning('Location permission required', 'Permission Needed', 8000);
toast.info('Queue position updated');
```

### Default Behavior

- **Duration**: 5000ms (5 seconds) - can be overridden per toast
- **Position**: Top-right corner (desktop), full-width at top (mobile)
- **Dismissible**: Yes, via X button or Escape key
- **Stacking**: Multiple toasts stack vertically
- **Auto-remove**: Toasts automatically disappear after duration
- **Accessible**: Proper ARIA roles and live regions

### Design

The toast system follows the ALIGN design language:
- Dark/monochrome backgrounds
- Restrained cyan accent for info toasts
- Semantic colors for success/error/warning
- Subtle borders, no excessive shadows
- Clean typography, adequate contrast
- Responsive on all screen sizes

### Browser Alert Migration

This toast system replaces all browser `alert()` calls throughout the application.

**Before (browser alert):**
```typescript
alert('CSV downloaded');
```

**After (toast notification):**
```typescript
toast.success('CSV downloaded');
```

### Current Alert Locations to be Replaced

The following 12 browser alerts will be replaced in future work units:

1. `Screen17Analytics.tsx:228` - Summary CSV export
2. `Screen17Analytics.tsx:257` - Queue CSV export
3. `Screen17Analytics.tsx:270` - Staff CSV export
4. `Screen02Discovery.tsx:139` - GPS location detection
5. `Screen12OrgDashboard.tsx:129` - Operations report export
6. `Screen15PlatformDashboard.tsx:212` - Infrastructure logs
7. `Screen16TenantManagement.tsx:166` - Tenant filter
8. `Screen16TenantManagement.tsx:173` - Tenant registry export
9. `Screen08Login.tsx:42` - Login error
10. `Screen08Login.tsx:152` - Password reset
11. `TopBar.tsx:150` - System notifications
12. `SideNav.tsx:215` - Help documentation

### Accessibility

- **Success/Warning/Info**: `role="status"`, `aria-live="polite"`
- **Error**: `role="alert"`, `aria-live="assertive"`
- **Keyboard**: Escape key dismisses toast
- **Focus management**: Dismiss button is keyboard accessible
- **Screen readers**: Toasts are announced appropriately
- **Color**: Not relied upon alone (icons differentiate types)

### Mobile Responsiveness

- Fixed positioning adapts to mobile viewports
- Touch-friendly dismiss button (44px+ target)
- No horizontal overflow on narrow screens
- Toasts don't cover critical UI elements
- Readable text at all screen sizes
