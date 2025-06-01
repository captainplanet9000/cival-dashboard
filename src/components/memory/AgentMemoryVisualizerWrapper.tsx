'use client';

import React, { useState, useEffect } from 'react';
import { useAgentId } from '@/contexts/AgentContext';
import dynamic from 'next/dynamic';

// Dynamically import the AgentMemoryVisualizer component to avoid SSR issues with ForceGraph
const AgentMemoryVisualizer = dynamic(
  () => import('./AgentMemoryVisualizer'),
  { ssr: false }
);

const AgentMemoryVisualizerWrapper: React.FC = () => {
  const { currentAgentId } = useAgentId();
  const [agentId, setAgentId] = useState<string | null>(null);
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });

  // Get window dimensions for responsive sizing
  useEffect(() => {
    // Handler to call on window resize
    function handleResize() {
      setWindowSize({
        width: window.innerWidth - 100, // Account for padding/margins
        height: window.innerHeight - 200, // Account for header and padding
      });
    }
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Set agent ID when available
  useEffect(() => {
    if (currentAgentId) {
      setAgentId(currentAgentId);
    } else {
      // Default to first agent if no agent is selected
      // This would typically come from an API call or context
      setAgentId('default-agent-id');
    }
  }, [currentAgentId]);

  if (!agentId) {
    return <div className="p-4">Loading agent information...</div>;
  }

  return (
    <>
      {windowSize.width > 0 && (
        <AgentMemoryVisualizer 
          agentId={agentId}
          width={windowSize.width}
          height={windowSize.height}
        />
      )}
    </>
  );
};

export default AgentMemoryVisualizerWrapper; 