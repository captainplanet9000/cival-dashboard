'use client';

import * as React from 'react';

interface RiskGaugeProps {
  value: number;
  maxValue: number;
  threshold?: [number, number, number]; // Thresholds for low, medium, high risk
  size?: number;
  reverseColors?: boolean; // If true, red is good (for diversification scores)
}

export function RiskGauge({
  value,
  maxValue,
  threshold = [25, 50, 75],
  size = 120,
  reverseColors = false
}: RiskGaugeProps) {
  // Calculate percentage
  const percentage = (value / maxValue) * 100;
  
  // Calculate rotation angle (180 degrees range)
  const angle = (percentage / 100) * 180;
  
  // Calculate colors
  const getColor = () => {
    const green = reverseColors ? '#ef4444' : '#10b981';
    const yellow = '#f59e0b';
    const red = reverseColors ? '#10b981' : '#ef4444';
    
    if (percentage < threshold[0]) return green;
    if (percentage < threshold[1]) return yellow;
    if (percentage < threshold[2]) return '#f97316'; // Orange
    return red;
  };
  
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  
  return (
    <div style={{ width: size, height: size / 2 }} className="relative">
      {/* Background semicircle */}
      <svg 
        width={size} 
        height={size / 2} 
        className="transform rotate-0"
        style={{ overflow: 'visible' }}
      >
        <path
          d={`M ${strokeWidth / 2},${size / 2} a ${radius},${radius} 0 0,1 ${size - strokeWidth},0`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Colored arc based on percentage */}
        <path
          d={`M ${strokeWidth / 2},${size / 2} a ${radius},${radius} 0 0,1 ${size - strokeWidth},0`}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference - (angle / 180) * circumference}
          className="transition-all duration-500 ease-in-out"
        />
        
        {/* Needle */}
        <line
          x1={size / 2}
          y1={size / 2}
          x2={size / 2 + radius * Math.cos((angle - 90) * Math.PI / 180)}
          y2={size / 2 + radius * Math.sin((angle - 90) * Math.PI / 180)}
          stroke="#374151"
          strokeWidth={2}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
        
        {/* Center circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={strokeWidth / 4}
          fill="#374151"
        />
      </svg>
      
      {/* Value text */}
      <div className="absolute bottom-0 left-0 right-0 text-center" style={{ marginBottom: `-${size / 8}px` }}>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">/{maxValue}</div>
      </div>
      
      {/* Gauge labels */}
      <div className="absolute top-0 left-0 right-0 flex justify-between px-2" style={{ paddingTop: `${size / 2 - size / 8}px` }}>
        <span className="text-xs text-muted-foreground">0</span>
        <span className="text-xs text-muted-foreground">{maxValue}</span>
      </div>
    </div>
  );
}
