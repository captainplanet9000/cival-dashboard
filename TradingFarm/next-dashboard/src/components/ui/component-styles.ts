/**
 * Trading Farm Dashboard Shared Component Styles
 * 
 * This file defines consistent styling for dashboard components
 * based on the modern strategies template design system.
 */

import { cva } from 'class-variance-authority';

/**
 * Card container styles with variants for different contexts
 */
export const cardStyles = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm", 
  {
    variants: {
      padding: {
        none: "",
        sm: "p-3",
        default: "p-4",
        lg: "p-6",
      },
      variant: {
        default: "border-border",
        primary: "border-primary/20 bg-primary/5",
        success: "border-emerald-500/20 bg-emerald-500/5",
        warning: "border-amber-500/20 bg-amber-500/5",
        destructive: "border-destructive/20 bg-destructive/5",
      }
    },
    defaultVariants: {
      padding: "default",
      variant: "default",
    }
  }
);

/**
 * Widget container styles
 */
export const widgetStyles = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm", 
  {
    variants: {
      size: {
        sm: "min-h-[200px]",
        default: "min-h-[300px]",
        lg: "min-h-[400px]",
        xl: "min-h-[500px]"
      }
    },
    defaultVariants: {
      size: "default",
    }
  }
);

/**
 * Section header styles
 */
export const sectionHeaderStyles = cva(
  "flex items-center justify-between mb-4",
  {
    variants: {
      spacing: {
        sm: "mb-2",
        default: "mb-4",
        lg: "mb-6"
      }
    },
    defaultVariants: {
      spacing: "default"
    }
  }
);

/**
 * Grid layout styles for dashboard sections
 */
export const gridLayoutStyles = cva(
  "grid gap-4",
  {
    variants: {
      columns: {
        "1": "grid-cols-1",
        "2": "grid-cols-1 md:grid-cols-2",
        "3": "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        "4": "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
      }
    },
    defaultVariants: {
      columns: "3"
    }
  }
);

/**
 * Badge styles with enhanced variants for status indicators
 */
export const statusBadgeStyles = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
        warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
        error: "bg-destructive/10 text-destructive",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

/**
 * Container styles for layouts
 */
export const containerStyles = cva(
  "container mx-auto px-4 py-6", 
  {
    variants: {
      spacing: {
        sm: "px-2 py-3",
        default: "px-4 py-6",
        lg: "px-6 py-8"
      }
    },
    defaultVariants: {
      spacing: "default"
    }
  }
);

/**
 * Table styles for consistent data presentation
 */
export const tableStyles = {
  root: "w-full caption-bottom text-sm",
  header: "bg-muted/50",
  headerRow: "[&_th]:py-3 [&_th]:px-4 border-b",
  headerCell: "h-10 font-medium text-muted-foreground",
  body: "divide-y",
  row: "hover:bg-muted/50 transition-colors",
  cell: "py-3 px-4",
  footer: "bg-muted/50 border-t"
};

/**
 * Form field styles for consistent forms
 */
export const formStyles = {
  fieldGroup: "space-y-2 mb-4",
  label: "text-sm font-medium",
  helper: "text-xs text-muted-foreground",
  error: "text-xs text-destructive mt-1",
  inputBase: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
};
