import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Network, Zap, Mail } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useBrainFarm } from '@/hooks/useBrainFarm';

interface AgentNode {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'error';
}

interface AgentConnection {
  source: string;
  target: string;
  strength: number;
  type: 'command' | 'data' | 'sync';
}

interface AgentNetworkGraphProps {
  farmId?: string | number;
}

// Mock data generator (in real app, this would come from your API)
const generateMockAgentNetwork = () => {
  const agentTypes = ['trader', 'analyzer', 'monitor', 'executor', 'coordinator'];
  const statusOptions = ['active', 'idle', 'error'] as const;
  const connectionTypes = ['command', 'data', 'sync'] as const;
  
  // Generate nodes
  const nodes: AgentNode[] = Array.from({ length: 5 }, (_, i) => ({
    id: `agent-${i + 1}`,
    name: `Agent ${i + 1}`,
    type: agentTypes[Math.floor(Math.random() * agentTypes.length)],
    status: statusOptions[Math.floor(Math.random() * statusOptions.length)]
  }));
  
  // Generate connections (not fully connected to look more realistic)
  const connections: AgentConnection[] = [];
  
  for (let i = 0; i < nodes.length; i++) {
    const connectionsCount = Math.floor(Math.random() * 3) + 1; // 1-3 connections per node
    
    for (let j = 0; j < connectionsCount; j++) {
      const targetIndex = (i + j + 1) % nodes.length;
      
      if (i !== targetIndex) { // No self-connections
        connections.push({
          source: nodes[i].id,
          target: nodes[targetIndex].id,
          strength: Math.random() * 0.7 + 0.3, // 0.3 to 1
          type: connectionTypes[Math.floor(Math.random() * connectionTypes.length)]
        });
      }
    }
  }
  
  return { nodes, connections };
};

export function AgentNetworkGraph({ farmId }: AgentNetworkGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { commands } = useBrainFarm({ farmId });
  
  // In a real app, this would be fetched from your backend
  const [network, setNetwork] = useState<{
    nodes: AgentNode[];
    connections: AgentConnection[];
  } | null>(null);
  
  useEffect(() => {
    // Simulate API fetch delay
    const timer = setTimeout(() => {
      setNetwork(generateMockAgentNetwork());
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [farmId]);
  
  useEffect(() => {
    if (!canvasRef.current || !network || isLoading) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const updateCanvasSize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = Math.max(400, parent.clientHeight);
      }
    };
    
    // Initial size update
    updateCanvasSize();
    
    // Listen for resize events
    window.addEventListener('resize', updateCanvasSize);
    
    // Node positioning
    const nodeRadius = 30;
    const nodes = network.nodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / network.nodes.length;
      const radius = Math.min(canvas.width, canvas.height) * 0.35;
      
      return {
        ...node,
        x: canvas.width / 2 + radius * Math.cos(angle),
        y: canvas.height / 2 + radius * Math.sin(angle),
        radius: nodeRadius,
        color: node.status === 'active' ? '#10b981' : 
               node.status === 'idle' ? '#f59e0b' : 
               '#ef4444'
      };
    });
    
    // Animation variables
    let animationFrame: number;
    let time = 0;
    
    // Draw function
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.01;
      
      // Draw connections
      network.connections.forEach(conn => {
        const source = nodes.find(n => n.id === conn.source);
        const target = nodes.find(n => n.id === conn.target);
        
        if (source && target) {
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          
          // Different styles for different connection types
          switch (conn.type) {
            case 'command':
              ctx.strokeStyle = `rgba(59, 130, 246, ${0.3 + Math.sin(time) * 0.2})`; // Blue, pulsing
              ctx.lineWidth = 2;
              ctx.setLineDash([5, 5]);
              break;
            case 'data':
              ctx.strokeStyle = `rgba(16, 185, 129, ${conn.strength})`; // Green
              ctx.lineWidth = conn.strength * 3;
              ctx.setLineDash([]);
              break;
            case 'sync':
              ctx.strokeStyle = `rgba(249, 115, 22, ${0.4 + conn.strength * 0.4})`; // Orange
              ctx.lineWidth = 2;
              ctx.setLineDash([2, 2]);
              break;
          }
          
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
      
      // Draw nodes
      nodes.forEach(node => {
        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${node.color.replace('#', '0x')}, 0.2)`.replace('0x', '');
        ctx.fill();
        
        // Node border
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Node label
        ctx.fillStyle = '#1f2937';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.name, node.x, node.y);
        
        // Node type below the name
        ctx.fillStyle = '#6b7280';
        ctx.font = '11px sans-serif';
        ctx.fillText(node.type, node.x, node.y + 15);
      });
      
      // Continue animation
      animationFrame = requestAnimationFrame(draw);
    };
    
    // Start animation
    draw();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      cancelAnimationFrame(animationFrame);
    };
  }, [network, isLoading]);
  
  return (
    <Card className="w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          <Network className="h-5 w-5 mr-2" />
          Agent Network Graph
        </CardTitle>
        <CardDescription>
          Visualize the relationship between trading agents
        </CardDescription>
      </CardHeader>
      
      <CardContent className="min-h-[400px] relative p-0">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <canvas 
            ref={canvasRef} 
            className="w-full h-full"
          />
        )}
      </CardContent>
    </Card>
  );
} 