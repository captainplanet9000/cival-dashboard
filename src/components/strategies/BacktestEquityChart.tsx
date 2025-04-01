'use client';

import React, { useEffect, useRef } from 'react';
// @ts-ignore - Handle missing d3 types
import * as d3 from 'd3';

interface BacktestEquityChartProps {
  data: number[];
  initialCapital: number;
  startDate: string;
  endDate: string;
  height?: number;
  width?: number;
}

export const BacktestEquityChart: React.FC<BacktestEquityChartProps> = ({
  data,
  initialCapital,
  startDate,
  endDate,
  height = 300,
  width = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) return;
    
    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Setup chart dimensions
    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    
    // Create SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();
    const timeStep = (endTimestamp - startTimestamp) / (data.length - 1);
    
    const xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, innerWidth]);
    
    const yScale = d3.scaleLinear()
      .domain([d3.min(data) || 0, d3.max(data) || initialCapital * 2])
      .nice()
      .range([innerHeight, 0]);
    
    // Create line generator
    const line = d3.line<number>()
      .x((_: number, i: number) => xScale(i))
      .y((d: number) => yScale(d))
      .curve(d3.curveMonotoneX);
    
    // Create area generator for fill
    const area = d3.area<number>()
      .x((_: number, i: number) => xScale(i))
      .y0(innerHeight)
      .y1((d: number) => yScale(d))
      .curve(d3.curveMonotoneX);
    
    // Add x-axis
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale)
        .tickFormat((d: any) => {
          const timestamp = startTimestamp + (Number(d) * timeStep);
          return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        })
        .ticks(5)
      );
    
    // Add y-axis
    svg.append('g')
      .call(d3.axisLeft(yScale)
        .tickFormat((d: any) => `$${d3.format(',.0f')(Number(d))}`)
      );
    
    // Add y-axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('font-size', '12px')
      .text('Account Balance');
    
    // Draw the area
    svg.append('path')
      .datum(data)
      .attr('fill', 'rgba(76, 175, 80, 0.2)')
      .attr('d', area);
    
    // Draw the line
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#4CAF50')
      .attr('stroke-width', 2)
      .attr('d', line);
    
    // Add initial capital line
    svg.append('line')
      .attr('x1', 0)
      .attr('y1', yScale(initialCapital))
      .attr('x2', innerWidth)
      .attr('y2', yScale(initialCapital))
      .attr('stroke', '#999')
      .attr('stroke-dasharray', '3,3');
    
    // Add initial capital label
    svg.append('text')
      .attr('x', 5)
      .attr('y', yScale(initialCapital) - 5)
      .style('font-size', '10px')
      .style('fill', '#666')
      .text(`Initial Capital: $${initialCapital.toLocaleString()}`);
    
    // Add tooltip
    const tooltip = d3.select('body')
      .append('div')
      .style('position', 'absolute')
      .style('background', 'white')
      .style('border', '1px solid #ccc')
      .style('border-radius', '4px')
      .style('padding', '8px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0);
    
    // Add dots for data points that show tooltips
    svg.selectAll('.data-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', (_: number, i: number) => xScale(i))
      .attr('cy', (d: number) => yScale(d))
      .attr('r', 4)
      .attr('fill', (d: number) => d >= initialCapital ? '#4CAF50' : '#F44336')
      .attr('stroke', 'white')
      .attr('stroke-width', 1)
      .style('opacity', 0)
      // @ts-ignore - d3 event handlers need a fix for TypeScript
      .on('mouseover', function(event: any, d: number) {
        // @ts-ignore - 'this' refers to the SVG element
        d3.select(this).style('opacity', 1);
        tooltip.transition()
          .duration(200)
          .style('opacity', 0.9);
        
        const i = data.indexOf(d);
        const date = new Date(startTimestamp + (i * timeStep));
        const percent = ((d / initialCapital) - 1) * 100;
        const percentDisplay = percent >= 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`;
        
        tooltip.html(`
          <strong>Date:</strong> ${date.toLocaleDateString()}<br>
          <strong>Balance:</strong> $${d.toLocaleString('en-US', { maximumFractionDigits: 2 })}<br>
          <strong>P/L:</strong> <span style="color:${percent >= 0 ? 'green' : 'red'}">${percentDisplay}</span>
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      // @ts-ignore - d3 event handlers need a fix for TypeScript
      .on('mouseout', function() {
        // @ts-ignore - 'this' refers to the SVG element
        d3.select(this).style('opacity', 0);
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });
      
    // Final data point marker
    svg.append('circle')
      .attr('cx', xScale(data.length - 1))
      .attr('cy', yScale(data[data.length - 1]))
      .attr('r', 5)
      .attr('fill', data[data.length - 1] >= initialCapital ? '#4CAF50' : '#F44336');
    
    // Return cleanup function
    return () => {
      d3.select(svgRef.current).selectAll('*').remove();
      tooltip.remove();
    };
  }, [data, initialCapital, startDate, endDate, height, width]);
  
  return (
    <div className="equity-chart-container">
      <svg ref={svgRef} />
    </div>
  );
}; 