"use client";

import * as React from "react";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  children,
  className = "",
}) => {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => onOpenChange?.(false)}
          ></div>
          <div className={`z-50 ${className}`}>{children}</div>
        </div>
      )}
    </>
  );
};

export const DialogContent: React.FC<DialogContentProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={`relative max-h-[85vh] overflow-y-auto rounded-lg bg-white p-6 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}; 