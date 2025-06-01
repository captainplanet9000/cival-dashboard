import * as React from 'react';
import { ShieldAlert, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

/**
 * Types of security errors that can be handled by the boundary
 */
export type SecurityErrorType = 
  | 'unauthorized'       // User is not logged in
  | 'forbidden'          // User doesn't have permission
  | 'ip_restricted'      // IP address is not allowed
  | 'session_expired'    // User session has expired
  | 'credentials_invalid' // API credentials are invalid
  | 'rate_limited'       // Too many requests
  | 'suspicious_activity' // Suspicious activity detected
  | 'unknown';           // Unknown security error

interface SecurityErrorState {
  hasError: boolean;
  errorType: SecurityErrorType;
}

interface SecurityErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Security Error Boundary Component
 * Catches and handles security-related errors in a user-friendly way
 */
export class SecurityErrorBoundary extends React.Component<
  SecurityErrorBoundaryProps,
  SecurityErrorState
> {
  constructor(props: SecurityErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorType: 'unknown' };
  }

  static getDerivedStateFromError(error: any): SecurityErrorState {
    // Update state so the next render will show the fallback UI
    let errorType: SecurityErrorType = 'unknown';
    
    if (error?.status === 401) {
      errorType = 'unauthorized';
    } else if (error?.status === 403) {
      errorType = 'forbidden';
    } else if (error?.message?.includes('session expired')) {
      errorType = 'session_expired';
    } else if (error?.message?.includes('IP')) {
      errorType = 'ip_restricted';
    } else if (error?.message?.includes('credentials')) {
      errorType = 'credentials_invalid';
    } else if (error?.status === 429) {
      errorType = 'rate_limited';
    } else if (error?.message?.includes('suspicious')) {
      errorType = 'suspicious_activity';
    }
    
    return { hasError: true, errorType };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to an error reporting service
    console.error('Security error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || <SecurityErrorFallback errorType={this.state.errorType} />;
    }

    return this.props.children;
  }
}

/**
 * Default fallback component for security errors
 */
export function SecurityErrorFallback({ errorType }: { errorType: SecurityErrorType }) {
  const router = useRouter();
  
  const errorConfig = {
    unauthorized: {
      icon: <Lock className="h-10 w-10 text-red-500" />,
      title: 'Authentication Required',
      description: 'You need to be signed in to access this area. Please log in and try again.',
      primaryAction: () => router.push('/login'),
      primaryActionText: 'Go to Login',
      secondaryAction: () => router.push('/'),
      secondaryActionText: 'Return to Home',
    },
    forbidden: {
      icon: <ShieldAlert className="h-10 w-10 text-red-500" />,
      title: 'Access Denied',
      description: 'You do not have permission to access this resource.',
      primaryAction: () => router.back(),
      primaryActionText: 'Go Back',
      secondaryAction: () => router.push('/dashboard'),
      secondaryActionText: 'Go to Dashboard',
    },
    ip_restricted: {
      icon: <ShieldAlert className="h-10 w-10 text-amber-500" />,
      title: 'IP Address Restricted',
      description: 'Your current IP address is not authorized to access this resource. Please contact support if you believe this is an error.',
      primaryAction: () => router.push('/dashboard/settings/security'),
      primaryActionText: 'Security Settings',
      secondaryAction: () => router.push('/dashboard'),
      secondaryActionText: 'Go to Dashboard',
    },
    session_expired: {
      icon: <Lock className="h-10 w-10 text-blue-500" />,
      title: 'Session Expired',
      description: 'Your session has expired. Please log in again to continue.',
      primaryAction: () => router.push('/login'),
      primaryActionText: 'Log In Again',
      secondaryAction: null,
      secondaryActionText: '',
    },
    credentials_invalid: {
      icon: <AlertTriangle className="h-10 w-10 text-red-500" />,
      title: 'Invalid Credentials',
      description: 'The API credentials for this exchange are invalid or have expired. Please update your credentials.',
      primaryAction: () => router.push('/dashboard/settings/exchanges'),
      primaryActionText: 'Update Credentials',
      secondaryAction: () => router.push('/dashboard'),
      secondaryActionText: 'Go to Dashboard',
    },
    rate_limited: {
      icon: <AlertTriangle className="h-10 w-10 text-amber-500" />,
      title: 'Rate Limit Exceeded',
      description: 'You have made too many requests. Please wait a moment and try again.',
      primaryAction: () => window.location.reload(),
      primaryActionText: 'Try Again',
      secondaryAction: () => router.push('/dashboard'),
      secondaryActionText: 'Go to Dashboard',
    },
    suspicious_activity: {
      icon: <ShieldAlert className="h-10 w-10 text-red-500" />,
      title: 'Security Alert',
      description: 'Suspicious activity has been detected on your account. For your security, some features have been temporarily disabled.',
      primaryAction: () => router.push('/dashboard/settings/security'),
      primaryActionText: 'Review Security',
      secondaryAction: () => router.push('/support'),
      secondaryActionText: 'Contact Support',
    },
    unknown: {
      icon: <AlertTriangle className="h-10 w-10 text-red-500" />,
      title: 'Security Error',
      description: 'An unknown security error has occurred. Please try again or contact support if the problem persists.',
      primaryAction: () => window.location.reload(),
      primaryActionText: 'Try Again',
      secondaryAction: () => router.push('/support'),
      secondaryActionText: 'Contact Support',
    }
  };
  
  const config = errorConfig[errorType];
  
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-col items-center gap-2">
          {config.icon}
          <CardTitle className="text-xl">{config.title}</CardTitle>
          <CardDescription className="text-center text-sm">
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-md bg-muted/50 text-sm text-muted-foreground">
            <p>If you believe this is a mistake or need help, please contact our support team.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {config.secondaryAction && (
            <Button variant="outline" onClick={config.secondaryAction}>
              {config.secondaryActionText}
            </Button>
          )}
          <Button onClick={config.primaryAction}>
            {config.primaryActionText}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
