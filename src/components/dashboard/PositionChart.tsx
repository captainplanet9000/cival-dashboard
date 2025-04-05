import React from 'react';

// Using a simple chart implementation for demonstration
// In a production environment, you would use a library like Recharts, Chart.js, or D3.js

interface ChartProps {
  data: { name: string; value: number }[];
  type: 'pie' | 'bar' | 'line';
  nameKey: string;
  dataKey: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * Simple chart component for visualizing position data
 * This is a placeholder that would be replaced with a proper chart library
 * in a production environment
 */
const PositionChart: React.FC<ChartProps> = ({
  data,
  type,
  nameKey,
  dataKey,
  width = 300,
  height = 200,
  className = ''
}) => {
  if (!data || data.length === 0) {
    return (
      <div className={`empty-chart ${className}`} style={{ width, height }}>
        No data available
      </div>
    );
  }
  
  // For demonstration, we're implementing a very simple pie chart visualization
  // A real implementation would use a proper charting library
  if (type === 'pie') {
    // Calculate total for percentages
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    // Generate random colors for each segment
    const getRandomColor = () => {
      const letters = '0123456789ABCDEF';
      let color = '#';
      for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
      }
      return color;
    };
    
    // Assign colors to each data item
    const dataWithColors = data.map(item => ({
      ...item,
      color: getRandomColor()
    }));
    
    // Calculate cumulative angles for the pie chart
    let cumulativePercent = 0;
    const segments = dataWithColors.map(item => {
      const percent = item.value / total;
      const startAngle = cumulativePercent * 360;
      cumulativePercent += percent;
      const endAngle = cumulativePercent * 360;
      
      return {
        ...item,
        percent,
        startAngle,
        endAngle
      };
    });
    
    return (
      <div className={`position-chart pie-chart ${className}`} style={{ width, height }}>
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <g transform={`translate(${width / 2}, ${height / 2})`}>
            {segments.map((segment, index) => {
              const radius = Math.min(width, height) / 2 - 10;
              
              // Convert angles to radians and calculate arc path
              const startAngleRad = (segment.startAngle - 90) * (Math.PI / 180);
              const endAngleRad = (segment.endAngle - 90) * (Math.PI / 180);
              
              const x1 = radius * Math.cos(startAngleRad);
              const y1 = radius * Math.sin(startAngleRad);
              const x2 = radius * Math.cos(endAngleRad);
              const y2 = radius * Math.sin(endAngleRad);
              
              // Create arc path
              const largeArcFlag = segment.endAngle - segment.startAngle > 180 ? 1 : 0;
              const pathData = [
                `M ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `L 0 0`,
                `Z`
              ].join(' ');
              
              return (
                <path
                  key={index}
                  d={pathData}
                  fill={segment.color}
                  stroke="#fff"
                  strokeWidth="1"
                >
                  <title>{`${segment.name}: ${(segment.percent * 100).toFixed(1)}%`}</title>
                </path>
              );
            })}
          </g>
        </svg>
        
        <div className="chart-legend">
          {segments.map((segment, index) => (
            <div key={index} className="legend-item">
              <div className="color-box" style={{ backgroundColor: segment.color }}></div>
              <div className="legend-text">
                {segment.name}: {(segment.percent * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Placeholder for bar chart
  if (type === 'bar') {
    return (
      <div className={`position-chart bar-chart ${className}`} style={{ width, height }}>
        <div className="chart-placeholder">
          Bar chart visualization would be implemented here using a proper chart library
        </div>
      </div>
    );
  }
  
  // Placeholder for line chart
  if (type === 'line') {
    return (
      <div className={`position-chart line-chart ${className}`} style={{ width, height }}>
        <div className="chart-placeholder">
          Line chart visualization would be implemented here using a proper chart library
        </div>
      </div>
    );
  }
  
  return (
    <div className={`position-chart ${className}`} style={{ width, height }}>
      Unsupported chart type: {type}
    </div>
  );
};

export default PositionChart; 