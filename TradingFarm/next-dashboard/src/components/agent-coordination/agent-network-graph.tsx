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
  // Allow directly passing agents for testing or static displays
  agents?: Agent[];
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

// Generate relationships between agents based on communication patterns
const generateRelationships = (agents: any[], messages: any[]) => {
  // Map to track message counts between agents
  const communicationMap = new Map<string, Map<string, { count: number, last: number }>>();
  
  // Initialize the communication map for all agents
  agents.forEach(sourceAgent => {
    const sourceId = sourceAgent.id.toString();
    communicationMap.set(sourceId, new Map());
    
    agents.forEach(targetAgent => {
      const targetId = targetAgent.id.toString();
      if (sourceId !== targetId) {
        communicationMap.get(sourceId)?.set(targetId, { count: 0, last: 0 });
      }
    });
  });
  
  // Process messages to count communications
  messages.forEach(message => {
    const sourceId = message.sender_id?.toString();
    const targetId = message.receiver_id?.toString();
    
    if (sourceId && targetId && sourceId !== targetId) {
      const sourceCommunications = communicationMap.get(sourceId);
      if (sourceCommunications) {
        const existing = sourceCommunications.get(targetId);
        if (existing) {
          sourceCommunications.set(targetId, { 
            count: existing.count + 1, 
            last: Math.max(existing.last, new Date(message.created_at).getTime()) 
          });
        } else {
          sourceCommunications.set(targetId, { 
            count: 1, 
            last: new Date(message.created_at).getTime() 
          });
        }
      }
    }
  });
  
  // Convert the map to an array of relationships
  const relationships: AgentRelationship[] = [];
  let maxMessageCount = 1; // Avoid division by zero
  
  communicationMap.forEach((targetMap, sourceId) => {
    targetMap.forEach((value, targetId) => {
      if (value.count > 0) {
        relationships.push({
          source: sourceId,
          target: targetId,
          messageCount: value.count,
          lastCommunication: value.last,
          strength: 0 // Will be normalized later
        });
        
        maxMessageCount = Math.max(maxMessageCount, value.count);
      }
    });
  });
  
  // Normalize relationship strengths
  relationships.forEach(relationship => {
    // Scale between 0.1 and 1 based on message count
    const normalizedStrength = 0.1 + (relationship.messageCount / Math.max(1, maxMessageCount)) * 0.9;
    relationship.strength = normalizedStrength;
  });
  
  return relationships;
};

// Generate mock relationships between agents for visualization
// This is mainly used for testing or when no relationship data is available
const generateMockRelationships = (agents: Agent[]): AgentRelationship[] => {
  const relationships: AgentRelationship[] = [];
  
  // Create a hierarchical structure where coordinators connect to everything
  // and other roles have specific connection patterns
  agents.forEach(sourceAgent => {
    if (sourceAgent.role === AgentRole.COORDINATOR) {
      // Coordinators connect to everyone
      agents
        .filter(a => a.id !== sourceAgent.id)
        .forEach(targetAgent => {
          relationships.push({
            source: sourceAgent.id,
            target: targetAgent.id,
            strength: 0.8,
            messageCount: 10,
            lastCommunication: Date.now()
          });
        });
    } else if (sourceAgent.role === AgentRole.EXECUTOR) {
      // Executors connect to analyzers and risk managers
      agents
        .filter(a => (a.role === AgentRole.ANALYZER || a.role === AgentRole.RISK_MANAGER) && a.id !== sourceAgent.id)
        .forEach(targetAgent => {
          relationships.push({
            source: sourceAgent.id,
            target: targetAgent.id,
            strength: 0.5,
            messageCount: 5,
            lastCommunication: Date.now() - 3600000 // 1 hour ago
          });
        });
    } else if (sourceAgent.role === AgentRole.ANALYZER) {
      // Analyzers connect to risk managers
      agents
        .filter(a => a.role === AgentRole.RISK_MANAGER && a.id !== sourceAgent.id)
        .forEach(targetAgent => {
          relationships.push({
            source: sourceAgent.id,
            target: targetAgent.id,
            strength: 0.6,
            messageCount: 7,
            lastCommunication: Date.now() - 7200000 // 2 hours ago
          });
        });
    }
    // Observers don't initiate connections but are connected to by coordinators
  });
  
  return relationships;
};

const AgentNetworkGraph: React.FC<AgentNetworkGraphProps> = ({ 
  farmId,
  height = 400, 
  width = undefined,
  realTimeUpdates = true,
  agents: passedAgents
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [loading, setLoading] = useState(!passedAgents);
  const [agents, setAgents] = useState<any[]>(passedAgents || []);
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
    // Skip fetching if agents were directly passed
    if (passedAgents) {
      const mockRelationships = generateMockRelationships(passedAgents);
      setRelationships(mockRelationships);
      return;
    }
  
    const fetchAgents = async () => {
      if (!farmId) return;
      
      try {
        setLoading(true);
        const supabase = createBrowserClient();
        
        // Get all agents for the farm
        const { data: agentsData, error } = await supabase
          .from('agents')
          .select(`
            id,
            name,
            status,
            type,
            configuration,
            created_at,
            updated_at
          `)
          .eq('farm_id', farmId);
        
        if (error) {
          console.error('Error fetching agents:', error);
          return;
        }
        
        // Get all messages between agents in the last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        const { data: messagesData, error: messagesError } = await supabase
          .from('agent_messages')
          .select(`
            id,
            sender_id,
            receiver_id,
            created_at
          `)
          .eq('farm_id', farmId)
          .gte('created_at', oneDayAgo.toISOString());
        
        if (messagesError) {
          console.error('Error fetching agent messages:', messagesError);
          return;
        }
        
        setAgents(agentsData || []);
        
        // Generate relationships based on message exchanges
        const relationshipsArray = generateRelationships(agentsData || [], messagesData || []);
        setRelationships(relationshipsArray);
      } catch (error) {
        console.error('Error fetching agent network data:', error);
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
          table: 'agent_messages',
          filter: `farm_id=eq.${farmId}`
        }, () => {
          fetchAgents();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(agentsSubscription);
        supabase.removeChannel(messagesSubscription);
      };
    }
  }, [farmId, passedAgents, realTimeUpdates]);
  
  // Set up and run the force-directed graph simulation
  useEffect(() => {
    if (!canvasRef.current || agents.length === 0) return;
    
    // Stop any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    
    const actualWidth = width || canvasRef.current.clientWidth;
    
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
    
    // Create links from relationships
    const links = relationships.map(rel => {
      const sourceIdx = nodes.findIndex(n => n.id === rel.source);
      const targetIdx = nodes.findIndex(n => n.id === rel.target);
      
      return {
        source: sourceIdx,
        target: targetIdx, 
        strength: rel.strength,
        messageCount: rel.messageCount
      };
    }).filter(link => link.source !== -1 && link.target !== -1);
    
    // Store the nodes and links in the ref
    simulationRef.current = { nodes, links };
    
    // Start the simulation
    startSimulation();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
    };
  }, [agents, relationships, height, width]);
  
  const startSimulation = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas width
    const actualWidth = width || canvas.clientWidth;
    canvas.width = actualWidth;
    
    // Define the physics parameters
    const damping = 0.9; // Velocity damping
    const dt = 0.1; // Time step
    
    // Simulation step
    const simulate = () => {
      if (!ctx) return;
      
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Get the current state
      const { nodes, links } = simulationRef.current;
      
      // Apply forces
      applyForces();
      
      // Update positions
      nodes.forEach(node => {
        node.vx *= damping;
        node.vy *= damping;
        
        node.x += node.vx * dt;
        node.y += node.vy * dt;
        
        // Contain within bounds
        node.x = Math.max(node.radius, Math.min(canvas.width - node.radius, node.x));
        node.y = Math.max(node.radius, Math.min(canvas.height - node.radius, node.y));
      });
      
      // Render links
      links.forEach(link => {
        const source = nodes[link.source];
        const target = nodes[link.target];
        
        // Draw links
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        
        // Style based on strength
        ctx.strokeStyle = `rgba(150, 150, 150, ${0.2 + link.strength * 0.3})`;
        ctx.lineWidth = 1 + link.strength * 2;
        ctx.stroke();
        
        // Draw message count indicator if above a threshold
        if (link.messageCount > 2) {
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          
          ctx.beginPath();
          ctx.arc(midX, midY, 8, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
          ctx.fill();
          
          ctx.font = '8px Arial';
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(link.messageCount.toString(), midX, midY);
        }
      });
      
      // Render nodes
      nodes.forEach(node => {
        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        
        // If hovered, highlight with a glow
        if (hoveredNode === node.id) {
          ctx.save();
          ctx.shadowColor = node.color;
          ctx.shadowBlur = 15;
        }
        
        // Fill based on role
        ctx.fillStyle = node.color;
        ctx.fill();
        
        // Status ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = node.status === 'online' 
          ? 'rgba(34, 197, 94, 0.6)' // green
          : node.status === 'busy' 
            ? 'rgba(234, 179, 8, 0.6)' // yellow
            : 'rgba(239, 68, 68, 0.6)'; // red
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // If hovered, show name label
        if (hoveredNode === node.id) {
          const padding = 6;
          const textWidth = ctx.measureText(node.name).width;
          
          // Label background
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(
            node.x - textWidth / 2 - padding, 
            node.y - node.radius - 25, 
            textWidth + padding * 2, 
            20
          );
          
          // Label text
          ctx.font = '12px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(node.name, node.x, node.y - node.radius - 15);
          
          ctx.restore();
        }
      });
      
      // Schedule next frame
      animationRef.current = requestAnimationFrame(simulate);
    };
    
    // Apply physical forces to the simulation
    const applyForces = () => {
      const { nodes, links } = simulationRef.current;
      
      // Apply link forces
      links.forEach(link => {
        const source = nodes[link.source];
        const target = nodes[link.target];
        
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // Desired distance based on node sizes
        const idealDistance = source.radius + target.radius + 50;
        
        // Force strength based on difference from ideal distance and link strength
        const force = (distance - idealDistance) * 0.01 * link.strength;
        
        const forceX = (dx / distance) * force;
        const forceY = (dy / distance) * force;
        
        source.vx += forceX;
        source.vy += forceY;
        target.vx -= forceX;
        target.vy -= forceY;
      });
      
      // Apply repulsive forces between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i];
          const nodeB = nodes[j];
          
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Skip if too far apart
          if (distance > 200) continue;
          
          // Repulsion inversely proportional to distance
          const force = 100 / (distance * distance);
          
          const forceX = (dx / distance) * force;
          const forceY = (dy / distance) * force;
          
          nodeA.vx -= forceX;
          nodeA.vy -= forceY;
          nodeB.vx += forceX;
          nodeB.vy += forceY;
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
