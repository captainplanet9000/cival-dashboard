import * as React from "react";

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onValueChange,
  className = "",
  children,
}) => {
  return (
    <div className={`radio-group ${className}`} role="radiogroup">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            groupValue: value,
            onGroupValueChange: onValueChange,
          });
        }
        return child;
      })}
    </div>
  );
};

interface RadioGroupItemProps {
  value: string;
  id?: string;
  className?: string;
  groupValue?: string;
  onGroupValueChange?: (value: string) => void;
}

export const RadioGroupItem: React.FC<RadioGroupItemProps> = ({
  value,
  id,
  className = "",
  groupValue,
  onGroupValueChange,
}) => {
  const isChecked = groupValue === value;

  const handleChange = () => {
    if (onGroupValueChange) {
      onGroupValueChange(value);
    }
  };

  return (
    <input
      type="radio"
      id={id}
      value={value}
      checked={isChecked}
      onChange={handleChange}
      className={`h-4 w-4 rounded-full border border-primary text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${className}`}
    />
  );
}; 