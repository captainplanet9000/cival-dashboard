import * as React from "react";

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  children,
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            value,
            onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
};

interface SelectTriggerProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
  value?: string;
}

export const SelectTrigger: React.FC<SelectTriggerProps> = ({
  id,
  className = "",
  children,
}) => {
  return (
    <button
      id={id}
      type="button"
      className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 opacity-50">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
};

interface SelectValueProps {
  placeholder?: string;
  className?: string;
  value?: string;
}

export const SelectValue: React.FC<SelectValueProps> = ({
  placeholder,
  className = "",
  value,
}) => {
  return (
    <span className={`block truncate ${className}`}>
      {value || placeholder}
    </span>
  );
};

interface SelectContentProps {
  className?: string;
  children: React.ReactNode;
}

export const SelectContent: React.FC<SelectContentProps> = ({
  className = "",
  children,
}) => {
  return (
    <div className={`absolute z-50 mt-1 max-h-60 min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-md ${className}`}>
      <div className="p-1">
        {children}
      </div>
    </div>
  );
};

interface SelectItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  onValueChange?: (value: string) => void;
}

export const SelectItem: React.FC<SelectItemProps> = ({
  value,
  className = "",
  children,
  onValueChange,
}) => {
  const handleClick = () => {
    if (onValueChange) {
      onValueChange(value);
    }
  };

  return (
    <div
      className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-slate-100 ${className}`}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}; 