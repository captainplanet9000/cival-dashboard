"use client";

import { AlertTriangle, RefreshCw, ShieldAlert, WifiOff, Copy } from "lucide-react";
import { useState } from "react";

type ErrorCategory = "connection" | "transaction" | "approval" | "unknown";

interface WalletErrorProps {
  category?: ErrorCategory;
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}

export function WalletError({
  category = "unknown",
  title,
  message,
  details,
  onRetry,
  className = "",
}: WalletErrorProps) {
  const [copied, setCopied] = useState(false);

  // Map error categories to icons and default titles
  const errorConfig = {
    connection: {
      icon: <WifiOff className="h-5 w-5 text-destructive" />,
      defaultTitle: "Connection Error",
    },
    transaction: {
      icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
      defaultTitle: "Transaction Failed",
    },
    approval: {
      icon: <ShieldAlert className="h-5 w-5 text-destructive" />,
      defaultTitle: "Approval Required",
    },
    unknown: {
      icon: <AlertTriangle className="h-5 w-5 text-destructive" />,
      defaultTitle: "Error Occurred",
    },
  };

  const config = errorConfig[category];
  const displayTitle = title || config.defaultTitle;

  const handleCopyError = () => {
    if (details) {
      navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`rounded-md border border-destructive/50 bg-destructive/5 p-4 shadow-sm ${className}`}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {config.icon}
          <h3 className="text-lg font-medium">{displayTitle}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
        {details && (
          <div className="mt-2 p-2 bg-muted/50 rounded-md border border-border text-xs font-mono text-muted-foreground overflow-x-auto">
            {details}
          </div>
        )}
        <div className="flex justify-between gap-2 pt-2">
          {details && (
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs"
              onClick={handleCopyError}
            >
              {copied ? (
                <span className="flex items-center gap-1 text-green-500">Copied</span>
              ) : (
                <span className="flex items-center gap-1">
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Details
                </span>
              )}
            </button>
          )}
          {onRetry && (
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 text-xs ml-auto"
              onClick={onRetry}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Error handling utilities
export function parseWalletError(error: any): {
  category: ErrorCategory;
  message: string;
  details?: string;
} {
  // Default error info
  let result = {
    category: "unknown" as ErrorCategory,
    message: "An unexpected error occurred",
    details: undefined,
  };

  if (!error) return result;

  // Convert error to string if it's not already
  const errorString = typeof error === "string" 
    ? error 
    : error.message || error.reason || JSON.stringify(error);

  // Determine error category and message based on common patterns
  if (/rejected|denied|cancelled|canceled|user rejected/i.test(errorString)) {
    result.category = "approval";
    result.message = "The transaction was rejected by the user";
  } else if (/insufficient funds|gas|fee/i.test(errorString)) {
    result.category = "transaction";
    result.message = "Insufficient funds for transaction";
  } else if (/network|connection|connect|timeout|unreachable/i.test(errorString)) {
    result.category = "connection";
    result.message = "Unable to connect to the network";
  } else if (/transaction|execution|revert|failed|error/i.test(errorString)) {
    result.category = "transaction";
    result.message = "Transaction failed to execute";
  }

  // Include detailed error info if available
  if (errorString && errorString !== result.message) {
    result.details = errorString;
  }

  return result;
}

// Specialized error components for common wallet errors
export function ConnectionError({ onRetry, className = "" }: { onRetry?: () => void, className?: string }) {
  return (
    <WalletError
      category="connection"
      message="Unable to connect to your wallet. Please check your connection and try again."
      onRetry={onRetry}
      className={className}
    />
  );
}

export function TransactionError({ 
  message = "Your transaction could not be processed. Please try again or contact support if the issue persists.",
  details,
  onRetry,
  className = ""
}: {
  message?: string,
  details?: string,
  onRetry?: () => void,
  className?: string 
}) {
  return (
    <WalletError
      category="transaction"
      message={message}
      details={details}
      onRetry={onRetry}
      className={className}
    />
  );
}

export function ApprovalError({ 
  className = "" 
}: { 
  className?: string 
}) {
  return (
    <WalletError
      category="approval"
      message="This operation requires your approval in your wallet. Please check your wallet and approve the request."
      className={className}
    />
  );
}
