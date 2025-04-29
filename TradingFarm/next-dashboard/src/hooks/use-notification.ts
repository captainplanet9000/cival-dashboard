import { useToast } from '@/components/ui/use-toast';
import { ReactNode } from 'react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationOptions {
  /** 
   * Duration in milliseconds
   * @default 5000 for success and info, 10000 for warnings and errors
   */
  duration?: number;
  /** Action button configuration */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Whether the notification is dismissable */
  dismissable?: boolean;
}

/**
 * Hook for managing application notifications
 * Provides a consistent interface for showing notifications
 */
export function useNotification() {
  const { toast } = useToast();

  /**
   * Show a notification
   * @param type Type of notification
   * @param title Title of the notification
   * @param description Optional description
   * @param options Additional options
   */
  const notify = (
    type: NotificationType, 
    title: string, 
    description?: ReactNode,
    options?: NotificationOptions
  ) => {
    // Set default durations based on notification type
    const defaultDuration = type === 'error' || type === 'warning' ? 10000 : 5000;

    // Map notification type to variant
    const variant = type === 'info' ? 'default' : type;
    
    toast({
      title,
      description,
      variant,
      duration: options?.duration ?? defaultDuration,
      action: options?.action ? {
        label: options.action.label,
        onClick: options.action.onClick,
      } : undefined,
    });
  };

  // Convenience methods for each notification type
  return {
    notify,
    success: (title: string, description?: ReactNode, options?: NotificationOptions) => 
      notify('success', title, description, options),
    error: (title: string, description?: ReactNode, options?: NotificationOptions) => 
      notify('error', title, description, options),
    warning: (title: string, description?: ReactNode, options?: NotificationOptions) => 
      notify('warning', title, description, options),
    info: (title: string, description?: ReactNode, options?: NotificationOptions) => 
      notify('info', title, description, options),
  };
}
