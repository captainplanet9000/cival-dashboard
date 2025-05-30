# Trading Farm Modal System Documentation

## Overview

The Trading Farm modal system provides a centralized and consistent way to manage modals throughout the application. It's built on top of shadcn/ui's Dialog component and includes features for form validation, real-time data synchronization, and state management.

## Architecture

The modal system consists of several key components:

1. **Modal Controller**: Central management system for all modals
2. **Modal Components**: Individual modals for different features
3. **Data Hooks**: Custom hooks for managing data in modals
4. **Form Validation**: Utilities for validating user input

### 1. Modal Controller

The `ModalController` serves as the central hub for all modals, managing their open state, props, and rendering. It uses React Context to make modal functionality accessible throughout the application.

**File location**: `src/components/ui/modal-controller.tsx`

#### Key Features:

- **Context-based state management**: Makes modal state accessible anywhere
- **Type-safe modal props**: Enforces proper props for each modal type
- **Centralized event logging**: Tracks modal usage for analytics
- **Error boundary integration**: Protects against modal rendering errors

#### Usage Example:

```tsx
import { useModal } from "@/components/ui/modal-controller";

function MyComponent() {
  const { openModal } = useModal();
  
  const handleOpenAccountSettings = () => {
    openModal("account-settings", { section: "profile" });
  };
  
  return (
    <Button onClick={handleOpenAccountSettings}>
      Account Settings
    </Button>
  );
}
```

### 2. Modal Components

Each modal is a standalone component that receives data via props and manages its internal state. All modals follow a consistent pattern:

- Receive `isOpen` and `onClose` props from the controller
- Use custom hooks for data fetching and management
- Implement form validation using shared utilities
- Handle error states and loading indicators

#### Key Modal Components:

- **AccountSettingsModal**: User profile and preferences management
- **PositionDetailsModal**: Individual position inspection and management
- **NotificationsModal**: Notification viewing and management
- **TradingTerminalModal**: Order entry and market data

### 3. Data Hooks

Custom hooks provide data fetching, caching, and real-time updates for modals. They separate data concerns from UI rendering.

#### Core Hooks:

- **usePositionData**: Fetches and updates position data
- **useNotificationsData**: Manages notification state
- **useAccountSettings**: Handles user profile data
- **useSupabaseRealtime**: Provides real-time data synchronization

### 4. Form Validation

The validation system uses Zod schemas to ensure data integrity and provide consistent error messages.

**File location**: `src/utils/formValidation.ts`

#### Key Components:

- **Schema definitions**: Type-safe validation rules for forms
- **Validation functions**: Utilities to validate form data
- **Error handling**: Consistent error reporting and display

## Best Practices

### Implementing a New Modal

1. **Create the modal component**:
   - Use the Dialog component from shadcn/ui
   - Follow the pattern of existing modals (PositionDetailsModal, AccountSettingsModal)
   - Implement appropriate form validation

2. **Create a data hook (if needed)**:
   - Separate data fetching and mutation from UI
   - Use useSupabaseRealtime for real-time updates

3. **Register in the modal controller**:
   - Add your modal to the ModalType types
   - Add modal-specific props to ModalProps
   - Add rendering logic to the ModalProvider

### Form Validation Implementation

1. **Define a Zod schema**:
   - Add to `src/utils/formValidation.ts`
   - Define appropriate validation rules

2. **In your modal component**:
   ```tsx
   // Set up state for validation errors
   const [formErrors, setFormErrors] = useState<ValidationError[]>([]);

   // Validate on submit
   const handleSubmit = () => {
     const validationResult = validateForm(mySchema, formData);
     if (!validationResult.success) {
       setFormErrors(validationResult.errors || []);
       return;
     }
     
     // Proceed with submission
   };
   
   // Display errors
   {getFieldError('fieldName') && (
     <p className="text-sm text-destructive">{getFieldError('fieldName')}</p>
   )}
   ```

## Troubleshooting Common Issues

### Modal Not Opening

1. Check if the modal is registered in the modal controller
2. Verify the modal type is used correctly in openModal
3. Check for console errors that might indicate prop type issues

### Form Validation Not Working

1. Verify your Zod schema matches your form data structure
2. Check that error messages are being displayed
3. Confirm validation is run before form submission

### Data Not Updating in Real-time

1. Ensure useSupabaseRealtime is set up correctly
2. Check that queryKey is properly defined
3. Verify the subscription is connected (isConnected state)

## Performance Considerations

- **Lazy Loading**: Modal content is only rendered when needed
- **Optimistic Updates**: UI updates immediately without waiting for server responses
- **Connection Management**: Real-time connections are cleaned up properly

## Future Enhancements

1. **Mobile Optimization**: Further improvements for small screens
2. **Animation Customization**: Allow for custom transition effects
3. **Integration with Router**: Deep linking to specific modals via URL
4. **UI Theme Customization**: Allow for more UI customization
5. **Accessibility Improvements**: Keyboard navigation and screen reader support

## Security Considerations

1. **Input Validation**: All user inputs are validated before processing
2. **Error Handling**: Errors are caught and displayed without revealing sensitive information
3. **Authentication**: Modal actions respect user permissions
