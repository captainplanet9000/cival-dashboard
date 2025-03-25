import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * A utility function that combines clsx and tailwind-merge for conditional class names
 * Optimizes Tailwind CSS classes by merging and deduplicating them
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
