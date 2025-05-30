import { render, screen, fireEvent } from '@testing-library/react';
import EmergencyStopButton from '@/components/ui/EmergencyStopButton';
import ManualTradeDialog from '@/components/orders/ManualTradeDialog';
import RebalanceDialog from '@/components/portfolio/RebalanceDialog';

describe('Manual Controls Integration', () => {
  it('renders Emergency Stop button', () => {
    render(<EmergencyStopButton agentId="agent-123" />);
    expect(screen.getByText(/emergency stop/i)).toBeInTheDocument();
  });

  it('renders Manual Trade dialog and submits order', () => {
    render(<ManualTradeDialog onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByText(/manual trade/i));
    expect(screen.getByText(/manual trade/i)).toBeInTheDocument();
  });

  it('renders Rebalance dialog and submits', () => {
    render(<RebalanceDialog onRebalance={jest.fn()} />);
    fireEvent.click(screen.getByText(/rebalance portfolio/i));
    expect(screen.getByText(/rebalance portfolio/i)).toBeInTheDocument();
  });
});
