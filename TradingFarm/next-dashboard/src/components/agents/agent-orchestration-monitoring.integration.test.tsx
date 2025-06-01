import { render, screen, fireEvent } from '@testing-library/react';
import FarmAgentAssignment from '@/components/farms/farm-agent-assignment';
import FarmAgentsTable from '@/components/farms/farm-agents-table';
import ElizaOSAgentConfig from '@/components/elizaos-agent-config';
import ElizaOSAgentMetrics from '@/components/elizaos-agent-metrics';

describe('Agent Orchestration & Monitoring UI', () => {
  it('renders agent assignment UI', () => {
    render(<FarmAgentAssignment />);
    expect(screen.getByText(/assign agent/i)).toBeInTheDocument();
  });

  it('renders agents table', () => {
    render(<FarmAgentsTable />);
    expect(screen.getByText(/agent/i)).toBeInTheDocument();
  });

  it('renders ElizaOS agent config', () => {
    render(<ElizaOSAgentConfig />);
    expect(screen.getByText(/elizaos/i)).toBeInTheDocument();
  });

  it('renders ElizaOS agent metrics', () => {
    render(<ElizaOSAgentMetrics />);
    expect(screen.getByText(/metrics/i)).toBeInTheDocument();
  });
});
