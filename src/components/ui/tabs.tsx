import * as React from "react";

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  children,
  className = "",
}) => {
  const [selectedTab, setSelectedTab] = React.useState(value || defaultValue || "");

  React.useEffect(() => {
    if (value !== undefined) {
      setSelectedTab(value);
    }
  }, [value]);

  const handleValueChange = (newValue: string) => {
    if (onValueChange) {
      onValueChange(newValue);
    }
    if (value === undefined) {
      setSelectedTab(newValue);
    }
  };

  return (
    <div className={`tabs ${className}`} data-selected-tab={selectedTab}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            selectedTab,
            onValueChange: handleValueChange,
          });
        }
        return child;
      })}
    </div>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  selectedTab?: string;
  onValueChange?: (value: string) => void;
}

export const TabsList: React.FC<TabsListProps> = ({
  children,
  className = "",
  selectedTab,
  onValueChange,
}) => {
  return (
    <div className={`inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            selectedTab,
            onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  selectedTab?: string;
  onValueChange?: (value: string) => void;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  children,
  className = "",
  selectedTab,
  onValueChange,
}) => {
  const handleClick = () => {
    if (onValueChange) {
      onValueChange(value);
    }
  };

  const isSelected = selectedTab === value;

  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isSelected
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      } ${className}`}
      onClick={handleClick}
      data-state={isSelected ? "active" : "inactive"}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  selectedTab?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  children,
  className = "",
  selectedTab,
}) => {
  const isSelected = selectedTab === value;

  if (!isSelected) {
    return null;
  }

  return (
    <div
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
      data-state={isSelected ? "active" : "inactive"}
    >
      {children}
    </div>
  );
}; 