import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/lib/store/store';

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all',
  {
    variants: {
      variant: {
        default: 'bg-background border',
        success: 'bg-green-50 border-green-200 text-green-800',
        error: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface ToastProps extends VariantProps<typeof toastVariants> {
  className?: string;
  children?: React.ReactNode;
  onClose?: () => void;
}

export function Toast({
  className,
  variant,
  children,
  onClose,
  ...props
}: ToastProps) {
  return (
    <div
      className={cn(toastVariants({ variant }), className)}
      {...props}
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useStore();

  return (
    <div className="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.type === 'success' ? 'success' : 
                  toast.type === 'error' ? 'error' :
                  toast.type === 'warning' ? 'warning' : 'info'}
          onClose={() => removeToast(toast.id)}
        >
          {toast.message}
        </Toast>
      ))}
    </div>
  );
}

export function useToast() {
  const { addToast, removeToast } = useStore();

  const toast = React.useCallback(
    (props: Omit<GlobalState['toasts'][0], 'id'>) => {
      addToast(props);

      if (props.duration !== 0) {
        const duration = props.duration || 5000;
        setTimeout(() => {
          removeToast(props.id);
        }, duration);
      }
    },
    [addToast, removeToast]
  );

  return { toast };
} 