import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import UnifiedDashboard from './unified-dashboard';

describe('UnifiedDashboard Integration', () => {
  it('renders all main dashboard tabs', () => {
    render(<UnifiedDashboard farmId="farm-1" hasElizaOS={true} />);
    expect(screen.getByText(/overview/i)).toBeInTheDocument();
    expect(screen.getByText(/trading/i)).toBeInTheDocument();
    expect(screen.getByText(/risk/i)).toBeInTheDocument();
    expect(screen.getByText(/elizaos/i)).toBeInTheDocument();
  });

  it('navigates between dashboard tabs', () => {
    render(<UnifiedDashboard farmId="farm-1" hasElizaOS={true} />);
    fireEvent.click(screen.getByText(/trading/i));
    expect(screen.getByText(/strategy management/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/risk/i));
    expect(screen.getByText(/risk metrics/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/elizaos/i));
    expect(screen.getByText(/command console/i)).toBeInTheDocument();
  });

  it('renders wallet, performance, and analytics in overview', () => {
    render(<UnifiedDashboard farmId="farm-1" hasElizaOS={true} />);
    expect(screen.getByText(/wallet/i)).toBeInTheDocument();
    expect(screen.getByText(/performance/i)).toBeInTheDocument();
    expect(screen.getByText(/analytics/i)).toBeInTheDocument();
  });

  it('renders strategy/agent/farm/goal management in trading tab', () => {
    render(<UnifiedDashboard farmId="farm-1" hasElizaOS={true} />);
    fireEvent.click(screen.getByText(/trading/i));
    expect(screen.getByText(/strategy management/i)).toBeInTheDocument();
    expect(screen.getByText(/agent management/i)).toBeInTheDocument();
    expect(screen.getByText(/farm management/i)).toBeInTheDocument();
    expect(screen.getByText(/goal-based trading/i)).toBeInTheDocument();
  });

  it('renders risk metrics and alerts in risk tab', () => {
    render(<UnifiedDashboard farmId="farm-1" hasElizaOS={true} />);
    fireEvent.click(screen.getByText(/risk/i));
    expect(screen.getByText(/risk metrics/i)).toBeInTheDocument();
    expect(screen.getByText(/risk alerts/i)).toBeInTheDocument();
  });

  it('renders ElizaOS Command Console in elizaos tab', () => {
    render(<UnifiedDashboard farmId="farm-1" hasElizaOS={true} />);
    fireEvent.click(screen.getByText(/elizaos/i));
    expect(screen.getByText(/elizaos command console/i)).toBeInTheDocument();
  });
});
