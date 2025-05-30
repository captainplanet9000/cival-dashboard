import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * @component Button
 * @description A standardized button component with multiple variants and sizes.
 * 
 * @example
 * // Default button
 * <Button>Click me</Button>
 * 
 * // Primary button with icon
 * <Button variant="primary" size="lg">
 *   <Icons.Plus className="mr-2 h-4 w-4" /> Create
 * </Button>
 * 
 * // Destructive button
 * <Button variant="destructive" onClick={handleDelete}>
 *   Delete
 * </Button>
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
        success: "bg-success text-success-foreground hover:bg-success/90",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Optional accessible label when visual text is insufficient
   */
  "aria-label"?: string;
  
  /**
   * Whether the button has a loading state
   */
  isLoading?: boolean;
  
  /**
   * Icon to display when loading
   */
  loadingIcon?: React.ReactNode;
  
  /**
   * Text to display when loading
   */
  loadingText?: string;
}

/**
 * Button component that follows the Trading Farm design system
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    children, 
    variant, 
    size, 
    isLoading, 
    loadingIcon, 
    loadingText, 
    disabled, 
    ...props 
  }, ref) => {
    // Combine disabled state with loading state
    const isDisabled = disabled || isLoading;
    
    // Determine what to display based on loading state
    const content = isLoading ? (
      <>
        {loadingIcon || (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {loadingText || children}
      </>
    ) : (
      children
    );
    
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
