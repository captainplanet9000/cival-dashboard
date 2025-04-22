import React from 'react';

interface AgentPageProps {
  params: {
    agentId: string;
  };
}

const AgentPage: React.FC<AgentPageProps> = ({ params }: AgentPageProps) => {
  return (
    <div>
      <h1>Agent Details</h1>
      <p>Displaying details for Agent ID: {params.agentId}</p>
      {/* TODO: Fetch and display agent-specific data here */}
    </div>
  );
};

export default AgentPage;
