/**
 * Shared component styles for Trading Farm dashboard
 * 
 * This utility provides consistent styling for dashboard components
 * following the modern strategies template design.
 */

import { cva } from 'class-variance-authority';
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class values and resolves Tailwind CSS conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Card container styling with variants
 */
export const cardStyles = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      variant: {
        default: "border-gray-200 dark:border-gray-800",
        primary: "border-primary/20 shadow-md",
        outline: "border-2",
        ghost: "border-transparent shadow-none bg-transparent",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
      status: {
        default: "",
        success: "border-green-500 dark:border-green-700",
        warning: "border-yellow-500 dark:border-yellow-700",
        error: "border-red-500 dark:border-red-700",
        info: "border-blue-500 dark:border-blue-700",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      status: "default",
    },
  }
);

/**
 * Dashboard widget container styling
 */
export const widgetContainerStyles = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm w-full",
  {
    variants: {
      size: {
        sm: "max-h-[300px] overflow-auto",
        default: "max-h-[500px] overflow-auto",
        lg: "max-h-[700px] overflow-auto",
        xl: "max-h-[900px] overflow-auto",
        full: "h-full",
        auto: "h-auto",
      },
      padding: {
        none: "p-0",
        sm: "p-3",
        default: "p-5",
        lg: "p-6",
      },
      variant: {
        default: "border-gray-200 dark:border-gray-800",
        primary: "border-primary/20 shadow-md",
        secondary: "border-secondary/20",
        destructive: "border-destructive/20",
        ghost: "border-transparent shadow-none bg-transparent",
      },
      status: {
        default: "",
        loading: "opacity-60",
        error: "border-red-500 dark:border-red-700",
      }
    },
    defaultVariants: {
      size: "default",
      padding: "default",
      variant: "default",
      status: "default",
    },
  }
);

/**
 * Dashboard data table styling
 */
export const dataTableStyles = cva(
  "w-full caption-bottom text-sm",
  {
    variants: {
      density: {
        default: "",
        compact: "[&_td]:py-2 [&_th]:py-2",
        comfortable: "[&_td]:py-4 [&_th]:py-4",
      },
      border: {
        default: "border",
        none: "",
        horizontal: "[&_tr]:border-b",
        vertical: "[&_td]:border-l [&_th]:border-l first:[&_td]:border-l-0 first:[&_th]:border-l-0",
        cell: "[&_td]:border [&_th]:border",
      },
      striped: {
        true: "[&_tr:nth-child(odd)]:bg-muted/50",
        false: "",
      },
      hover: {
        true: "[&_tr:hover]:bg-muted/80",
        false: "",
      },
    },
    defaultVariants: {
      density: "default",
      border: "default",
      striped: false,
      hover: true,
    },
  }
);

/**
 * Dashboard section header styling
 */
export const sectionHeaderStyles = cva(
  "flex flex-col space-y-1.5 pb-4",
  {
    variants: {
      position: {
        default: "",
        center: "items-center text-center",
        left: "items-start",
        right: "items-end text-right",
      },
      spacing: {
        default: "pb-4",
        sm: "pb-2",
        lg: "pb-6",
        none: "pb-0",
      },
      border: {
        default: "",
        bottom: "border-b pb-4 mb-4",
      }
    },
    defaultVariants: {
      position: "default",
      spacing: "default",
      border: "default",
    },
  }
);

/**
 * Badge status styling for consistent status indicators
 */
export const statusBadgeStyles = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border border-input hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      status: {
        online: "bg-green-500 text-white hover:bg-green-600 dark:bg-green-700",
        offline: "bg-gray-400 text-white hover:bg-gray-500 dark:bg-gray-600",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 dark:bg-yellow-700",
        error: "bg-red-500 text-white hover:bg-red-600 dark:bg-red-700",
        info: "bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-700",
        success: "bg-green-500 text-white hover:bg-green-600 dark:bg-green-700",
      }
    },
    defaultVariants: {
      variant: "default",
      status: undefined,
    },
  }
);

/**
 * Button styling with Trading Farm specific variants
 */
export const buttonStyles = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        trading: "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800",
        analytics: "bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800",
        ai: "bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      loading: {
        true: "relative [&>span]:opacity-0 [&>span]:invisible [&::after]:block [&::after]:absolute [&::after]:left-1/2 [&::after]:top-1/2 [&::after]:h-4 [&::after]:w-4 [&::after]:animate-spin [&::after]:border-2 [&::after]:border-r-transparent [&::after]:rounded-[50%] [&::after]:-translate-x-1/2 [&::after]:-translate-y-1/2",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false,
    },
  }
);

/**
 * Input styling with variants
 */
export const inputStyles = cva(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        search: "pl-9", // For search inputs with icon
        numeric: "text-right font-mono",
      },
      state: {
        default: "",
        error: "border-red-500 focus-visible:ring-red-500",
        success: "border-green-500 focus-visible:ring-green-500",
      }
    },
    defaultVariants: {
      variant: "default",
      state: "default",
    },
  }
);

/**
 * Alert and notification styling
 */
export const alertStyles = cva(
  "relative w-full rounded-lg border p-4",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        success: "border-green-500/50 text-green-700 dark:text-green-300 dark:border-green-500/30 [&>svg]:text-green-600",
        warning: "border-yellow-500/50 text-yellow-700 dark:text-yellow-300 dark:border-yellow-500/30 [&>svg]:text-yellow-600",
        info: "border-blue-500/50 text-blue-700 dark:text-blue-300 dark:border-blue-500/30 [&>svg]:text-blue-600",
      },
      size: {
        default: "p-4",
        sm: "p-3 text-xs",
        lg: "p-6",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

/**
 * Custom scrollbar styling
 */
export const scrollbarStyles = `
  scrollbar-thin 
  scrollbar-thumb-rounded-md 
  scrollbar-track-transparent 
  scrollbar-thumb-gray-300 
  hover:scrollbar-thumb-gray-400 
  dark:scrollbar-thumb-gray-600 
  dark:hover:scrollbar-thumb-gray-500
`;
