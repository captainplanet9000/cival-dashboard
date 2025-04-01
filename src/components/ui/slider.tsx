import * as React from "react";

interface SliderProps {
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  value: number[];
  onValueChange: (value: number[]) => void;
  className?: string;
}

export const Slider: React.FC<SliderProps> = ({
  id,
  min = 0,
  max = 100,
  step = 1,
  value,
  onValueChange,
  className = "",
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onValueChange([newValue]);
  };

  return (
    <div className={`relative w-full ${className}`}>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div 
        className="absolute h-2 bg-primary rounded-lg top-0 left-0" 
        style={{ width: `${((value[0] - min) / (max - min)) * 100}%` }}
      />
    </div>
  );
}; 