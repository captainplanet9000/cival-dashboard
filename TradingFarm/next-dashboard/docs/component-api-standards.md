# Trading Farm Component API Standards

## Overview

This document establishes standardized API patterns for React components in the Trading Farm Dashboard. Consistent component APIs improve developer experience, code maintainability, and reduce bugs. Follow these standards when creating or modifying components.

## Core Principles

1. **Prop Consistency** - Use consistent prop names and types across similar components
2. **TypeScript First** - Always define prop interfaces with comprehensive TypeScript types
3. **Composition Over Configuration** - Prefer component composition over complex prop APIs
4. **Accessibility Built-in** - Accessibility features should be core to component implementation
5. **Documentation Driven** - Document components with JSDoc comments before implementation

## Component Structure Template

```tsx
/**
 * @component ComponentName
 * @description Brief description of the component's purpose and functionality
 * 
 * @example
 * // Basic usage
 * <ComponentName prop1="value" prop2={value} />
 * 
 * // With children
 * <ComponentName>
 *   <ChildComponent />
 * </ComponentName>
 */
import React from 'react';
import { cn } from '@/lib/utils';

// Component prop interface
export interface ComponentNameProps {
  /** Description of children prop */
  children?: React.ReactNode;
  /** Description of className prop */
  className?: string;
  /** Description of additional props */
  [key: string]: any;
}

export function ComponentName({
  children,
  className,
  ...props
}: ComponentNameProps) {
  // Component implementation
  return (
    <div className={cn('base-classes', className)} {...props}>
      {children}
    </div>
  );
}
```

## Standard Props

### Common Props

These props should be consistently implemented across all applicable components:

```tsx
// Common props included in most components
interface CommonProps {
  /** Custom CSS class names */
  className?: string;
  
  /** Custom inline styles */
  style?: React.CSSProperties;
  
  /** ID for the component */
  id?: string;
  
  /** Data attribute for testing */
  'data-testid'?: string;
  
  /** Makes element focusable and part of tab order */
  tabIndex?: number;
  
  /** Disables the interactive element */
  disabled?: boolean;
  
  /** Additional attributes spread to the DOM element */
  [key: string]: any;
}
```

### Event Handler Props

Use consistent naming for event handlers:

```tsx
// Event handler props
interface EventHandlerProps {
  /** Called when element is clicked */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  
  /** Called when focused element receives keydown */
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
  
  /** Called when element receives focus */
  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
  
  /** Called when element loses focus */
  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  
  /** Called when mouse enters element */
  onMouseEnter?: (event: React.MouseEvent<HTMLElement>) => void;
  
  /** Called when mouse leaves element */
  onMouseLeave?: (event: React.MouseEvent<HTMLElement>) => void;
}
```

### Modal Component Props

For modal/dialog components:

```tsx
interface ModalProps {
  /** Controls whether the modal is displayed */
  isOpen: boolean;
  
  /** Called when the modal should close */
  onClose: () => void;
  
  /** Called when modal action completes successfully */
  onSuccess?: (data?: any) => void;
  
  /** Modal title displayed in the header */
  title?: string;
  
  /** Modal content */
  children: React.ReactNode;
  
  /** Controls whether closing via escape/backdrop is allowed */
  closeOnOutsideClick?: boolean;
  
  /** Controls modal size */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}
```

### Form Component Props

For form components:

```tsx
interface FormFieldProps {
  /** Unique identifier for the field */
  id: string;
  
  /** Field name, used with form state */
  name: string;
  
  /** Field label displayed to user */
  label?: string;
  
  /** Helper text displayed below the field */
  helperText?: string;
  
  /** Error message when validation fails */
  error?: string;
  
  /** Whether the field is required */
  required?: boolean;
  
  /** Whether the field is disabled */
  disabled?: boolean;
  
  /** Current field value */
  value?: any;
  
  /** Called when value changes */
  onChange?: (value: any) => void;
  
  /** Called when field is blurred */
  onBlur?: () => void;
}
```

### Data Display Component Props

For data visualization and display components:

```tsx
interface DataDisplayProps {
  /** Data to display */
  data: any[] | Record<string, any>;
  
  /** Controls loading state */
  isLoading?: boolean;
  
  /** Error state */
  error?: Error | null;
  
  /** Empty state message */
  emptyMessage?: string;
  
  /** Function to render custom items */
  renderItem?: (item: any, index: number) => React.ReactNode;
}
```

## Component Variants

Use consistent pattern for component variants:

```tsx
interface ButtonProps {
  /** Button style variant */
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
  
  /** Button size variant */
  size?: 'sm' | 'md' | 'lg';
}
```

## Composition Patterns

### Compound Components

For related component sets, use the compound component pattern:

```tsx
/**
 * @component Tabs
 * @description Tab navigation component with associated content panels
 */
export function Tabs({ children, ...props }: TabsProps) {
  // Implementation
}

/**
 * @component TabsList
 * @description Container for tab triggers
 */
Tabs.List = function TabsList({ children, ...props }: TabsListProps) {
  // Implementation
}

/**
 * @component TabsTrigger
 * @description Individual tab button
 */
Tabs.Trigger = function TabsTrigger({ children, ...props }: TabsTriggerProps) {
  // Implementation
}

/**
 * @component TabsContent
 * @description Content panel for a tab
 */
Tabs.Content = function TabsContent({ children, ...props }: TabsContentProps) {
  // Implementation
}

// Usage:
<Tabs defaultValue="account">
  <Tabs.List>
    <Tabs.Trigger value="account">Account</Tabs.Trigger>
    <Tabs.Trigger value="password">Password</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="account">Account settings...</Tabs.Content>
  <Tabs.Content value="password">Password settings...</Tabs.Content>
</Tabs>
```

### Render Props

For flexible rendering with shared logic:

```tsx
interface CollapsibleProps {
  children: (state: { isOpen: boolean; toggle: () => void }) => React.ReactNode;
  defaultOpen?: boolean;
}

export function Collapsible({ 
  children, 
  defaultOpen = false 
}: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  
  return children({ isOpen, toggle });
}

// Usage:
<Collapsible>
  {({ isOpen, toggle }) => (
    <>
      <button onClick={toggle}>
        {isOpen ? 'Hide Details' : 'Show Details'}
      </button>
      {isOpen && <div>Collapsible content here...</div>}
    </>
  )}
</Collapsible>
```

## Higher-Order Components

For reusable component logic:

```tsx
/**
 * Higher-order component that adds loading state
 */
export function withLoading<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P & { isLoading?: boolean }> {
  return function WithLoadingComponent({ 
    isLoading = false, 
    ...props 
  }: P & { isLoading?: boolean }) {
    if (isLoading) {
      return <Spinner />;
    }
    
    return <Component {...(props as P)} />;
  };
}

// Usage:
const TableWithLoading = withLoading(Table);

<TableWithLoading 
  isLoading={isLoading} 
  data={data} 
/>
```

## Hooks for Component Logic

Extract complex component logic into custom hooks:

```tsx
/**
 * Hook for pagination logic
 */
export function usePagination<T>(
  items: T[],
  initialPage = 1,
  itemsPerPage = 10
) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);
  
  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(validPage);
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [goToPage, currentPage]);
  
  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [goToPage, currentPage]);
  
  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
}

// Usage:
function PaginatedTable({ data }) {
  const {
    paginatedItems,
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    hasNext,
    hasPrev,
  } = usePagination(data);
  
  return (
    <>
      <Table data={paginatedItems} />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onNext={nextPage}
        onPrevious={prevPage}
        hasNext={hasNext}
        hasPrev={hasPrev}
      />
    </>
  );
}
```

## Accessibility Standards

All components must adhere to these accessibility standards:

```tsx
// Button example with accessibility standards
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label when visual text is insufficient */
  'aria-label'?: string;
  
  /** ID of element that describes this button */
  'aria-describedby'?: string;
  
  /** Whether button controls an expanded element */
  'aria-expanded'?: boolean;
  
  /** Whether button shows/controls a menu */
  'aria-haspopup'?: boolean | 'menu' | 'dialog';
  
  /** Element is active/selected in a set */
  'aria-pressed'?: boolean;
}

export function Button({
  children,
  className,
  disabled,
  'aria-label': ariaLabel,
  ...props
}: ButtonProps) {
  // Implementation that ensures:
  // 1. Focus styles
  // 2. Keyboard interaction
  // 3. Proper ARIA attributes
  return (
    <button
      className={cn(
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
}
```

## Variant Generation with Tailwind

Use consistent pattern for generating variants with Tailwind:

```tsx
// Button variant example
const buttonVariants = {
  base: 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  
  variant: {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    link: 'underline-offset-4 hover:underline text-primary',
  },
  
  size: {
    default: 'h-10 py-2 px-4',
    sm: 'h-8 px-3 rounded-md text-sm',
    lg: 'h-11 px-8 rounded-md text-base',
    icon: 'h-10 w-10 rounded-full',
  },
};

export function Button({ 
  variant = 'default', 
  size = 'default', 
  className, 
  ...props 
}: ButtonProps) {
  return (
    <button
      className={cn(
        buttonVariants.base,
        buttonVariants.variant[variant],
        buttonVariants.size[size],
        className
      )}
      {...props}
    />
  );
}
```

## Component Testing Standards

Each component should have associated tests:

```tsx
// Button.test.tsx example
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  test('renders children correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  test('applies custom className', () => {
    render(<Button className="custom-class">Button</Button>);
    expect(screen.getByText('Button')).toHaveClass('custom-class');
  });
  
  test('handles onClick event', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  test('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByText('Disabled')).toBeDisabled();
  });
});
```

## Component Documentation

Use Storybook to document components:

```tsx
// Button.stories.tsx example
import { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
      description: 'The visual style of the button',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'The size of the button',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: 'Button',
    variant: 'default',
    size: 'default',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Destructive',
    variant: 'destructive',
  },
};
```

## Conclusion

Following these component API standards ensures consistency, maintainability, and ease of use across the Trading Farm Dashboard. When creating new components or modifying existing ones, refer to this document to ensure your implementations align with our established patterns.

All components should be:
1. **Well-typed** with TypeScript interfaces
2. **Well-documented** with JSDoc comments
3. **Accessible** with proper ARIA attributes and keyboard support
4. **Consistent** in naming and API design
5. **Tested** with unit and integration tests
