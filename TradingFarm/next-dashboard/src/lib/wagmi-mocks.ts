/**
 * Mock implementations for wagmi hooks
 * This file provides mock implementations of wagmi hooks to allow the build to succeed
 */

export const usePrepareSendTransaction = ({ to, value, enabled }: { to: string; value?: bigint; enabled?: boolean }) => {
  return {
    config: {
      to,
      value,
      enabled
    },
    isError: false,
    error: null
  };
};
