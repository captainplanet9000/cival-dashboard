import React from 'react';

interface StrategyPageProps {
  params: {
    strategyId: string;
  };
}

const StrategyPage: React.FC<StrategyPageProps> = ({ params }: StrategyPageProps) => {
  return (
    <div>
      <h1>Strategy Details</h1>
      <p>Displaying details for Strategy ID: {params.strategyId}</p>
      {/* TODO: Fetch and display strategy-specific data here */}
    </div>
  );
};

export default StrategyPage;
