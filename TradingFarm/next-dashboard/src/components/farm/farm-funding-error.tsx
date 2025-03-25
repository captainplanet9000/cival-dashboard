"use client";

import { CircleDollarSign, AlertTriangle, RefreshCw, ArrowLeftRight } from "lucide-react";
import { parseWalletError } from "@/components/wallet/wallet-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export type FarmFundingErrorType = 
  | "insufficient-balance" 
  | "farm-unavailable" 
  | "min-amount"
  | "max-amount"
  | "network-mismatch"
  | "transaction-failed"
  | "generic";

interface FarmFundingErrorProps {
  type: FarmFundingErrorType;
  message?: string;
  details?: string;
  onRetry?: () => void;
  onSwitchNetwork?: () => void;
  className?: string;
}

export enum SimpleFarmFundingErrorType {
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  INVALID_AMOUNT = "INVALID_AMOUNT",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  GENERIC = "GENERIC"
}

interface SimpleFarmFundingErrorProps {
  type: SimpleFarmFundingErrorType
  message?: string
}

export function SimpleFarmFundingError({ type, message }: SimpleFarmFundingErrorProps) {
  const getErrorDetails = () => {
    switch (type) {
      case SimpleFarmFundingErrorType.INSUFFICIENT_BALANCE:
        return {
          title: "Insufficient Balance",
          description: message || "You don't have enough funds to complete this transaction."
        }
      case SimpleFarmFundingErrorType.INVALID_AMOUNT:
        return {
          title: "Invalid Amount",
          description: message || "Please enter a valid amount to continue."
        }
      case SimpleFarmFundingErrorType.TRANSACTION_FAILED:
        return {
          title: "Transaction Failed",
          description: message || "The transaction failed to process. Please try again."
        }
      case SimpleFarmFundingErrorType.NETWORK_ERROR:
        return {
          title: "Network Error",
          description: message || "There was a problem connecting to the network. Please check your connection."
        }
      case SimpleFarmFundingErrorType.GENERIC:
        return {
          title: "Error",
          description: message || "An unknown error occurred."
        }
      default:
        return {
          title: "Error",
          description: message || "An unknown error occurred."
        }
    }
  }

  const { title, description } = getErrorDetails()

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  )
}

export function FarmFundingError({
  type,
  message,
  details,
  onRetry,
  onSwitchNetwork,
  className = "",
}: FarmFundingErrorProps) {
  // Default messages based on error type
  const errorMessages = {
    "insufficient-balance": "You don't have enough funds in your wallet for this transaction.",
    "farm-unavailable": "This farm is currently unavailable or paused. Please try another farm.",
    "min-amount": "The amount is below the minimum required for this operation.",
    "max-amount": "The amount exceeds the maximum allowed for this operation.",
    "network-mismatch": "You're connected to the wrong network for this farm.",
    "transaction-failed": "The transaction failed to complete. Please try again.",
    "generic": "An error occurred while processing your request."
  };

  const displayMessage = message || errorMessages[type];
  
  // Icon based on error type
  const getIcon = () => {
    switch (type) {
      case "insufficient-balance":
      case "min-amount":
      case "max-amount":
        return <CircleDollarSign className="h-5 w-5 text-amber-500" />;
      case "network-mismatch":
        return <ArrowLeftRight className="h-5 w-5 text-amber-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    }
  };

  return (
    <div className={`rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-4 shadow-sm ${className}`}>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          {getIcon()}
          <h3 className="text-sm font-medium">
            {type === "generic" ? "Error" : type.split("-").map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(" ")}
          </h3>
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-400">{displayMessage}</p>
        {details && (
          <div className="mt-2 p-2 bg-amber-100/50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800 text-xs font-mono text-amber-800 dark:text-amber-300 overflow-x-auto">
            {details}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          {type === "network-mismatch" && onSwitchNetwork && (
            <button
              className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors border px-3 py-1.5 border-amber-200 bg-amber-100/70 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300"
              onClick={onSwitchNetwork}
            >
              <ArrowLeftRight className="h-3 w-3 mr-1" />
              Switch Network
            </button>
          )}
          {onRetry && (
            <button
              className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors border px-3 py-1.5 border-amber-200 bg-amber-100/70 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300"
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

// Helper function to parse wallet errors into farm funding errors
export function parseFarmFundingError(error: any): {
  type: FarmFundingErrorType;
  message: string;
  details?: string;
} {
  if (!error) {
    return { type: "generic", message: "Unknown error", details: undefined };
  }
  
  const walletError = parseWalletError(error);
  const errorString = typeof error === "string" 
    ? error 
    : error.message || error.reason || JSON.stringify(error);
  
  // Map wallet errors to farm funding errors
  if (walletError.category === "connection") {
    if (/network|chain/i.test(errorString)) {
      return { 
        type: "network-mismatch", 
        message: "You're connected to the wrong network for this farm.", 
        details: walletError.details 
      };
    }
    return { 
      type: "generic", 
      message: walletError.message, 
      details: walletError.details 
    };
  }
  
  if (/insufficient|balance|funds/i.test(errorString)) {
    return { 
      type: "insufficient-balance", 
      message: "You don't have enough funds in your wallet for this transaction.", 
      details: walletError.details 
    };
  }
  
  if (/minimum|min amount|too small/i.test(errorString)) {
    return { 
      type: "min-amount", 
      message: "The amount is below the minimum required for this operation.", 
      details: walletError.details 
    };
  }
  
  if (/maximum|max amount|too large/i.test(errorString)) {
    return { 
      type: "max-amount", 
      message: "The amount exceeds the maximum allowed for this operation.", 
      details: walletError.details 
    };
  }
  
  if (/unavailable|paused|disabled/i.test(errorString)) {
    return { 
      type: "farm-unavailable", 
      message: "This farm is currently unavailable or paused. Please try another farm.", 
      details: walletError.details 
    };
  }
  
  return { 
    type: "transaction-failed", 
    message: "The transaction failed to complete. Please try again.", 
    details: walletError.details 
  };
}

// Specialized error components for common farm funding errors
export function InsufficientBalanceError({ 
  onRetry, 
  className = "" 
}: { 
  onRetry?: () => void, 
  className?: string 
}) {
  return (
    <FarmFundingError
      type="insufficient-balance"
      onRetry={onRetry}
      className={className}
    />
  );
}

export function NetworkMismatchError({ 
  onSwitchNetwork, 
  className = "" 
}: { 
  onSwitchNetwork?: () => void, 
  className?: string 
}) {
  return (
    <FarmFundingError
      type="network-mismatch"
      onSwitchNetwork={onSwitchNetwork}
      className={className}
    />
  );
}

export function MinAmountError({ 
  minAmount, 
  className = "" 
}: { 
  minAmount: string, 
  className?: string 
}) {
  return (
    <FarmFundingError
      type="min-amount"
      message={`The minimum funding amount for this farm is ${minAmount}.`}
      className={className}
    />
  );
}

export function MaxAmountError({ 
  maxAmount, 
  className = "" 
}: { 
  maxAmount: string, 
  className?: string 
}) {
  return (
    <FarmFundingError
      type="max-amount"
      message={`The maximum funding amount for this farm is ${maxAmount}.`}
      className={className}
    />
  );
}
