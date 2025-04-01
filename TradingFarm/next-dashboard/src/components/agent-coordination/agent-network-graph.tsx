"use client";

import React, { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@/utils/supabase/client';
import { AgentRole } from '@/types/agent-coordination';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Activity, LineChart, ShieldCheck, Radar } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: 'online' | 'offline' | 'busy';
  lastHeartbeat: number;
}

interface AgentRelationship {
  source: string;
  target: string;
  strength: number;
  messageCount: number;
  lastCommunication: number;
}

interface AgentNetworkGraphProps {
  farmId: number;
  height?: number;
  width?: number;
  realTimeUpdates?: boolean;
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

// Get agent role from configuration
const getAgentRole = (agent: any): AgentRole => {
  return agent?.configuration?.role || AgentRole.EXECUTOR;
};

// Get agent status based on last activity
const getAgentStatus = (agent: any): 'online' | 'offline' | 'busy' => {
  if (!agent.updated_at) return 'offline';
  
  const lastUpdated = new Date(agent.updated_at).getTime();
  const now = Date.now();
  const minutesSinceUpdate = (now - lastUpdated) / (1000 * 60);
  
  if (minutesSinceUpdate < 5) {
    return agent.status === 'active' ? 'busy' : 'online';
  }
  
  return 'offline';
};

const AgentNetworkGraph: React.FC<AgentNetworkGraphProps> = ({ 
  farmId,
  height = 400, 
  width = undefined,
  realTimeUpdates = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<any[]>([]);
  const [relationships, setRelationships] = useState<AgentRelationship[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  
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
      messageCount: number;
    }>;
  }>({ nodes: [], links: [] });
  
  // Fetch agents and their relationships
  useEffect(() => {
    const fetchAgents = async () => {
      if (!farmId) return;
      
      try {
        setLoading(true);
        const supabase = createBrowserClient();
        
        // Get all agents for the farm
        const { data: agentsData, error } = await supabase
          .from('agents')
          .select('*')
          .eq('farm_id', farmId);
          
        if (error) throw error;
        
        setAgents(agentsData || []);
        
        // If we have agents, get their communication relationships
        if (agentsData && agentsData.length > 0) {
          const agentIds = agentsData.map(a => a.id);
          
          // Get agent messages to build relationship strengths
          const { data: messages, error: messagesError } = await supabase
            .from('agent_messages')
            .select('sender_id, recipient_id, timestamp')
            .or(`sender_id.in.(${agentIds.join(',')}),recipient_id.in.(${agentIds.join(',')})`)
            .order('timestamp', { ascending: false });
            
          if (messagesError) throw messagesError;
          
          // Build relationship map based on message frequency
          const relationshipMap = new Map<string, { count: number, last: number }>();
          
          (messages || []).forEach(msg => {
            if (!msg.sender_id || !msg.recipient_id) return;
            
            const key = [msg.sender_id, msg.recipient_id].sort().join('-');
            const existing = relationshipMap.get(key) || { count: 0, last: 0 };
            
            relationshipMap.set(key, {
              count: existing.count + 1,
              last: Math.max(existing.last, new Date(msg.timestamp).getTime())
            });
          });
          
          // Convert to relationships array
          const relationshipsArray: AgentRelationship[] = [];
          
          for (const [key, value] of relationshipMap.entries()) {
            const [sourceId, targetId] = key.split('-');
            
            // Skip self-references
            if (sourceId === targetId) continue;
            
            // Calculate relationship strength based on message count (normalize to 0.1-1 range)
            const maxMessageCount = Math.max(...Array.from(relationshipMap.values()).map(v => v.count));
            const normalizedStrength = 0.1 + (value.count / Math.max(1, maxMessageCount)) * 0.9;
            
            relationshipsArray.push({
              source: sourceId,
              target: targetId,
              strength: normalizedStrength,
              messageCount: value.count,
              lastCommunication: value.last
            });
          }
          
          setRelationships(relationshipsArray);
        }
      } catch (error) {
        console.error('Error fetching agent data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAgents();
    
    // Set up real-time subscription if enabled
    if (realTimeUpdates) {
      const supabase = createBrowserClient();
      
      // Subscribe to agent changes
      const agentsSubscription = supabase
        .channel('agent-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'agents',
          filter: `farm_id=eq.${farmId}`
        }, () => {
          fetchAgents();
        })
        .subscribe();
        
      // Subscribe to new messages
      const messagesSubscription = supabase
        .channel('agent-messages')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'agent_messages'
        }, () => {
          fetchAgents();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(agentsSubscription);
        supabase.removeChannel(messagesSubscription);
      };
    }
  }, [farmId, realTimeUpdates]);
  
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
      id: agent.id.toString(),
      x: Math.random() * actualWidth,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      radius: getNodeSize(getAgentRole(agent)),
      color: getRoleColor(getAgentRole(agent)),
      status: getAgentStatus(agent),
      name: agent.name,
      role: getAgentRole(agent)
    }));
    
    // Create links between nodes
    const links = relationships.map(link => {
      const sourceIndex = nodes.findIndex(node => node.id === link.source);
      const targetIndex = nodes.findIndex(node => node.id === link.target);
      
      // Skip invalid links
      if (sourceIndex === -1 || targetIndex === -1) return null;
      
      return {
        source: sourceIndex,
        target: targetIndex,
        strength: link.strength,
        messageCount: link.messageCount
      };
    }).filter(link => link !== null) as simulationRef.current['links'];
    
    simulationRef.current = { nodes, links };
    
    // Start the simulation
    startSimulation();
    
    // Clean up
    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [agents, relationships, height, width]);
  
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
          node.vx *= -0.5;
        }
        if (node.x > actualWidth - node.radius) {
          node.x = actualWidth - node.radius;
          node.vx *= -0.5;
        }
        if (node.y < node.radius) {
          node.y = node.radius;
          node.vy *= -0.5;
        }
        if (node.y > height - node.radius) {
          node.y = height - node.radius;
          node.vy *= -0.5;
        }
      });
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw links
      links.forEach(link => {
        const source = nodes[link.source];
        const target = nodes[link.target];
        
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = `rgba(148, 163, 184, ${Math.min(1, link.strength * 0.8)})`;
        ctx.lineWidth = link.messageCount ? Math.min(5, Math.max(1, link.messageCount / 5)) : 1;
        ctx.stroke();
        
        // Draw message count indicator
        if (link.messageCount > 0) {
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          
          // Only draw if messages > 1
          if (link.messageCount > 1) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(midX, midY, 8, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(link.messageCount.toString(), midX, midY);
          }
        }
      });
      
      // Draw nodes
      nodes.forEach(node => {
        // Determine if this node is hovered
        const isHovered = node.id === hoveredNode;
        
        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + (isHovered ? 3 : 0), 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        
        // Add status indicator
        ctx.beginPath();
        ctx.arc(node.x + node.radius * 0.7, node.y - node.radius * 0.7, node.radius * 0.35, 0, Math.PI * 2);
        
        switch (node.status) {
          case 'online':
            ctx.fillStyle = '#22c55e'; // Green
            break;
          case 'busy':
            ctx.fillStyle = '#f97316'; // Orange
            break;
          case 'offline':
            ctx.fillStyle = '#94a3b8'; // Gray
            break;
        }
        
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Draw name only if hovered
        if (isHovered) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          const padding = 8;
          const textWidth = ctx.measureText(node.name).width;
          const boxWidth = textWidth + padding * 2;
          
          ctx.roundRect(
            node.x - boxWidth / 2,
            node.y + node.radius + 5,
            boxWidth,
            26,
            4
          );
          ctx.fill();
          
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.name, node.x, node.y + node.radius + 18);
        }
      });
      
      animationRef.current = requestAnimationFrame(simulate);
    };
    
    const applyForces = () => {
      const { nodes, links } = simulationRef.current;
      
      // Reset forces
      nodes.forEach(node => {
        node.vx = 0;
        node.vy = 0;
      });
      
      // Apply repulsive forces between nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i];
          const nodeB = nodes[j];
          
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Skip if too far apart
          if (distance > 200) continue;
          
          // Calculate repulsion (inversely proportional to distance)
          const repulsionFactor = 100 / Math.max(1, distance);
          const normalizedDx = dx / distance;
          const normalizedDy = dy / distance;
          
          nodeA.vx -= normalizedDx * repulsionFactor;
          nodeA.vy -= normalizedDy * repulsionFactor;
          nodeB.vx += normalizedDx * repulsionFactor;
          nodeB.vy += normalizedDy * repulsionFactor;
        }
      }
      
      // Apply attractive forces for links
      links.forEach(link => {
        const sourceNode = nodes[link.source];
        const targetNode = nodes[link.target];
        
        const dx = targetNode.x - sourceNode.x;
        const dy = targetNode.y - sourceNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Skip if already close
        if (distance < (sourceNode.radius + targetNode.radius + 10)) return;
        
        // Calculate attraction
        const idealDistance = 100;
        const distanceDiff = distance - idealDistance;
        const attractionFactor = distanceDiff * link.strength * 0.05;
        const normalizedDx = dx / distance;
        const normalizedDy = dy / distance;
        
        sourceNode.vx += normalizedDx * attractionFactor;
        sourceNode.vy += normalizedDy * attractionFactor;
        targetNode.vx -= normalizedDx * attractionFactor;
        targetNode.vy -= normalizedDy * attractionFactor;
      });
      
      // Center attraction to prevent graph from drifting away
      const centerX = (width || 600) / 2;
      const centerY = height / 2;
      
      nodes.forEach(node => {
        const dx = centerX - node.x;
        const dy = centerY - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only apply center gravity if far from center
        if (distance > 100) {
          const centerForce = 0.002;
          node.vx += dx * centerForce;
          node.vy += dy * centerForce;
        }
      });
    };
    
    // Start simulation
    animate();
    
    function animate() {
      simulate();
    }
  };
  
  // Handle canvas mouse events for interactivity
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Check if mouse is over any node
      const { nodes } = simulationRef.current;
      const hoveredNodeId = nodes.find(node => {
        const dx = node.x - x;
        const dy = node.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= node.radius + 3; // Add small margin for better UX
      })?.id || null;
      
      setHoveredNode(hoveredNodeId);
      
      // Change cursor if hovering over a node
      canvas.style.cursor = hoveredNodeId ? 'pointer' : 'default';
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  // Prepare role counts for the legend
  const roleCounts = agents.reduce((counts, agent) => {
    const role = getAgentRole(agent);
    counts[role] = (counts[role] || 0) + 1;
    return counts;
  }, {} as Record<AgentRole, number>);
  
  const roleIcons = {
    [AgentRole.COORDINATOR]: <Users className="h-4 w-4" />,
    [AgentRole.EXECUTOR]: <Activity className="h-4 w-4" />,
    [AgentRole.ANALYZER]: <LineChart className="h-4 w-4" />,
    [AgentRole.RISK_MANAGER]: <ShieldCheck className="h-4 w-4" />,
    [AgentRole.OBSERVER]: <Radar className="h-4 w-4" />
  };
  
  return (
    <Card className="p-4 relative">
      <div className="mb-4 flex justify-between items-center">
        <h3 className="font-semibold text-lg">Agent Coordination Network</h3>
        
        {/* Role count badges */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(roleCounts).map(([role, count]) => (
            count > 0 && (
              <Badge key={role} variant="outline" className="flex items-center gap-1">
                {roleIcons[role as AgentRole]}
                <span className="capitalize">{role}</span>
                <span className="rounded-full bg-muted w-5 h-5 flex items-center justify-center text-xs ml-1">
                  {count}
                </span>
              </Badge>
            )
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="w-full h-[400px] rounded-md" />
        </div>
      ) : agents.length === 0 ? (
        <div className="flex items-center justify-center h-[400px] text-muted-foreground">
          No agents found in this farm
        </div>
      ) : (
        <canvas 
          ref={canvasRef} 
          className="w-full rounded-md"
          height={height}
        />
      )}
      
      <div className="mt-4 text-sm text-muted-foreground">
        {relationships.length === 0 ? (
          "No communication recorded between agents yet."
        ) : (
          `Showing ${relationships.length} communication ${relationships.length === 1 ? 'path' : 'paths'} between agents.`
        )}
      </div>
    </Card>
  );
};

export default AgentNetworkGraph;