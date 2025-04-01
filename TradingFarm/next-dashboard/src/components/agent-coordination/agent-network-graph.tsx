"use client";

import React, { useEffect, useRef } from 'react';
import { AgentRole } from '@/types/agent-coordination';

interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: 'online' | 'offline' | 'busy';
  lastHeartbeat: number;
}

interface AgentNetworkGraphProps {
  agents: Agent[];
  height?: number;
  width?: number;
}

// Generate a deterministic color based on role
const getRoleColor = (role: AgentRole): string => {
  switch (role) {
    case AgentRole.COORDINATOR:
      return '#0ea5e9'; // Sky blue
    case AgentRole.EXECUTOR:
      return '#22c55e'; // Green
    case AgentRole.ANALYZER:
      return '#8b5cf6'; // Purple
    case AgentRole.RISK_MANAGER:
      return '#ef4444'; // Red
    case AgentRole.OBSERVER:
      return '#f59e0b'; // Amber
    default:
      return '#94a3b8'; // Slate
  }
};

// Get node size based on role importance
const getNodeSize = (role: AgentRole): number => {
  switch (role) {
    case AgentRole.COORDINATOR:
      return 20;
    case AgentRole.EXECUTOR:
    case AgentRole.RISK_MANAGER:
      return 15;
    default:
      return 12;
  }
};

// Generate mock relationships between agents for visualization
const generateMockRelationships = (agents: Agent[]) => {
  const links: { source: string; target: string; strength: number }[] = [];
  
  // Create a hierarchical structure where coordinators connect to everything
  // and other roles have specific connection patterns
  agents.forEach(sourceAgent => {
    if (sourceAgent.role === AgentRole.COORDINATOR) {
      // Coordinators connect to everyone
      agents
        .filter(a => a.id !== sourceAgent.id)
        .forEach(targetAgent => {
          links.push({
            source: sourceAgent.id,
            target: targetAgent.id,
            strength: 0.8
          });
        });
    } else if (sourceAgent.role === AgentRole.EXECUTOR) {
      // Executors connect to analyzers and risk managers
      agents
        .filter(a => (a.role === AgentRole.ANALYZER || a.role === AgentRole.RISK_MANAGER) && a.id !== sourceAgent.id)
        .forEach(targetAgent => {
          links.push({
            source: sourceAgent.id,
            target: targetAgent.id,
            strength: 0.5
          });
        });
    } else if (sourceAgent.role === AgentRole.ANALYZER) {
      // Analyzers connect to risk managers
      agents
        .filter(a => a.role === AgentRole.RISK_MANAGER && a.id !== sourceAgent.id)
        .forEach(targetAgent => {
          links.push({
            source: sourceAgent.id,
            target: targetAgent.id,
            strength: 0.6
          });
        });
    }
    // Observers don't initiate connections but are connected to by coordinators
  });
  
  return links;
};

const AgentNetworkGraph: React.FC<AgentNetworkGraphProps> = ({ 
  agents, 
  height = 400, 
  width = undefined
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // Used to store the current simulation state
  const simulationRef = useRef<{
    nodes: Array<{
      id: string;
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      status: 'online' | 'offline' | 'busy';
      name: string;
      role: AgentRole;
    }>;
    links: Array<{
      source: number;
      target: number;
      strength: number;
    }>;
  }>({ nodes: [], links: [] });
  
  // Set up and run the force-directed graph simulation
  useEffect(() => {
    if (!canvasRef.current || agents.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const actualWidth = width || canvas.parentElement?.clientWidth || 600;
    canvas.width = actualWidth;
    canvas.height = height;
    
    // Calculate device pixel ratio for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = actualWidth * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${actualWidth}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);
    
    // Create nodes from agents
    const nodes = agents.map(agent => ({
      id: agent.id,
      x: Math.random() * actualWidth,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      radius: getNodeSize(agent.role),
      color: getRoleColor(agent.role),
      status: agent.status,
      name: agent.name,
      role: agent.role
    }));
    
    // Create links between nodes
    const mockRelationships = generateMockRelationships(agents);
    const links = mockRelationships.map(link => ({
      source: nodes.findIndex(node => node.id === link.source),
      target: nodes.findIndex(node => node.id === link.target),
      strength: link.strength
    }));
    
    simulationRef.current = { nodes, links };
    
    // Start the simulation
    startSimulation();
    
    // Clean up
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [agents, height, width]);
  
  const startSimulation = () => {
    const simulate = () => {
      if (!canvasRef.current) return;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const actualWidth = width || canvas.clientWidth;
      const { nodes, links } = simulationRef.current;
      
      // Apply forces
      applyForces();
      
      // Update positions
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        
        // Damping
        node.vx *= 0.9;
        node.vy *= 0.9;
        
        // Boundary constraints
        if (node.x < node.radius) {
          node.x = node.radius;
          node.vx = Math.abs(node.vx) * 0.5;
        }
        if (node.x > actualWidth - node.radius) {
          node.x = actualWidth - node.radius;
          node.vx = -Math.abs(node.vx) * 0.5;
        }
        if (node.y < node.radius) {
          node.y = node.radius;
          node.vy = Math.abs(node.vy) * 0.5;
        }
        if (node.y > height - node.radius) {
          node.y = height - node.radius;
          node.vy = -Math.abs(node.vy) * 0.5;
        }
      });
      
      // Clear canvas
      ctx.clearRect(0, 0, actualWidth, height);
      
      // Draw links
      ctx.strokeStyle = '#e2e8f0'; // Subtle gray
      ctx.lineWidth = 1.5;
      links.forEach(link => {
        const source = nodes[link.source];
        const target = nodes[link.target];
        
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.globalAlpha = link.strength;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
      
      // Draw nodes
      nodes.forEach(node => {
        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        
        // Apply opacity based on status
        ctx.globalAlpha = node.status === 'offline' ? 0.4 : 1;
        ctx.fill();
        
        // Busy indicator
        if (node.status === 'busy') {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 1.3, 0, Math.PI * 2);
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        
        ctx.globalAlpha = 1;
        
        // Label
        ctx.fillStyle = '#1e293b'; // Slate 800
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name, node.x, node.y + node.radius + 10);
      });
      
      // Continue animation
      animationRef.current = requestAnimationFrame(simulate);
    };
    
    // Apply physical forces to the simulation
    const applyForces = () => {
      const { nodes, links } = simulationRef.current;
      
      // Apply link forces (attraction)
      links.forEach(link => {
        const source = nodes[link.source];
        const target = nodes[link.target];
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        // Ideal distance based on node sizes
        const idealDistance = source.radius + target.radius + 100;
        const force = (distance - idealDistance) * 0.05 * link.strength;
        
        const unitX = dx / distance;
        const unitY = dy / distance;
        
        source.vx += unitX * force;
        source.vy += unitY * force;
        target.vx -= unitX * force;
        target.vy -= unitY * force;
      });
      
      // Apply repulsion forces (nodes repel each other)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i];
          const nodeB = nodes[j];
          
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance === 0) continue;
          
          const minDistance = nodeA.radius + nodeB.radius + 30;
          
          if (distance < minDistance) {
            const force = (minDistance - distance) / distance * 0.1;
            
            nodeA.vx -= dx * force;
            nodeA.vy -= dy * force;
            nodeB.vx += dx * force;
            nodeB.vy += dy * force;
          }
        }
      }
      
      // Apply center attraction force
      const centerX = (width || 600) / 2;
      const centerY = height / 2;
      
      nodes.forEach(node => {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        // Strength decreases with node importance
        const strength = 0.0005 * (1 - getNodeSize(node.role) / 20);
        
        node.vx += dx * strength;
        node.vy += dy * strength;
      });
    };
    
    // Start the animation
    animationRef.current = requestAnimationFrame(simulate);
  };
  
  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height, borderRadius: '0.375rem' }}
    />
  );
};

export default AgentNetworkGraph; 