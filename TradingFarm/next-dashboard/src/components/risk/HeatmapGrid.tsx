'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';

interface HeatmapGridProps {
  data: Record<string, Record<string, number>>;
  minValue?: number;
  maxValue?: number;
  colorScale?: string[];
}

export function HeatmapGrid({
  data,
  minValue = 0,
  maxValue = 1,
  colorScale = ['#4ade80', '#fde047', '#ef4444'] // Green to yellow to red
}: HeatmapGridProps) {
  // Get all unique keys from the data
  const keys = Object.keys(data);
  
  // Function to get color based on value
  const getColor = (value: number) => {
    // Normalize value between 0 and 1
    const normalizedValue = Math.max(0, Math.min(1, (value - minValue) / (maxValue - minValue)));
    
    // For a 3-color scale, determine which segment the value falls into
    if (normalizedValue < 0.5) {
      // Interpolate between first and second color
      const t = normalizedValue / 0.5;
      return interpolateColor(colorScale[0], colorScale[1], t);
    } else {
      // Interpolate between second and third color
      const t = (normalizedValue - 0.5) / 0.5;
      return interpolateColor(colorScale[1], colorScale[2], t);
    }
  };
  
  // Helper function to interpolate between two colors
  const interpolateColor = (color1: string, color2: string, t: number) => {
    // Convert hex to RGB
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    
    // Interpolate
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };
  
  // Calculate the max cell width based on the number of items
  const cellWidth = `${Math.min(60, Math.max(30, 300 / keys.length))}px`;
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr>
            <th className="p-2 border"></th> {/* Empty corner cell */}
            {keys.map((key) => (
              <th 
                key={key} 
                className="p-2 border text-xs font-medium"
                style={{ width: cellWidth, maxWidth: cellWidth }}
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((rowKey) => (
            <tr key={rowKey}>
              <th className="p-2 border text-xs font-medium">{rowKey}</th>
              {keys.map((colKey) => {
                const value = data[rowKey]?.[colKey] ?? 0;
                const color = getColor(value);
                const textColor = value > (minValue + maxValue) / 2 ? 'text-white' : 'text-black';
                
                return (
                  <td 
                    key={`${rowKey}-${colKey}`} 
                    className={`p-2 border text-center text-xs ${textColor}`}
                    style={{ 
                      backgroundColor: color,
                      width: cellWidth,
                      maxWidth: cellWidth
                    }}
                    title={`${rowKey} - ${colKey}: ${value.toFixed(2)}`}
                  >
                    {value.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Legend */}
      <div className="flex justify-center items-center mt-4">
        <div className="flex items-center space-x-2">
          <div className="h-4 w-16 bg-gradient-to-r from-green-400 via-yellow-300 to-red-500 rounded"></div>
          <div className="flex justify-between w-16 text-xs text-muted-foreground">
            <span>{minValue}</span>
            <span>{maxValue}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
