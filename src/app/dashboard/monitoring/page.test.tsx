import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MonitoringPage from './page';

// Mock Lucide icons as they are not relevant for basic rendering tests
jest.mock('lucide-react', () => ({
    Terminal: () => <svg data-testid="terminal-icon"></svg>,
    // Add mocks for other icons if used
}));

// Mock timers for useEffect
jest.useFakeTimers();

describe('MonitoringPage', () => {
    beforeEach(() => {
        // Reset mocks and timers before each test
        jest.clearAllMocks();
        render(<MonitoringPage />);
    });

    it('renders the main dashboard title', () => {
        expect(screen.getByRole('heading', { name: /Farm Monitoring Dashboard/i })).toBeInTheDocument();
    });

    it('renders the System Resources card', () => {
        expect(screen.getByRole('heading', { name: /System Resources/i })).toBeInTheDocument();
        expect(screen.getByText(/CPU Usage/i)).toBeInTheDocument();
        expect(screen.getByText(/Memory Usage/i)).toBeInTheDocument();
        expect(screen.getByText(/Disk Usage/i)).toBeInTheDocument();
    });

    it('renders the Component Status card', () => {
        expect(screen.getByRole('heading', { name: /Component Status/i })).toBeInTheDocument();
        expect(screen.getByText(/TradingAgent Alpha/i)).toBeInTheDocument();
        expect(screen.getByText(/ArbitrageAgent Beta/i)).toBeInTheDocument();
        expect(screen.getByText(/Primary USDT Vault/i)).toBeInTheDocument();
        expect(screen.getByText(/Binance Account/i)).toBeInTheDocument();
        expect(screen.getByText(/Ethereum Node/i)).toBeInTheDocument();
    });

    it('renders the Recent Alerts card', () => {
        expect(screen.getByRole('heading', { name: /Recent Alerts/i })).toBeInTheDocument();
        expect(screen.getByText(/High latency detected on task execution./i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to connect to external node./i)).toBeInTheDocument();
        expect(screen.getByText(/Disk space exceeding 90% threshold./i)).toBeInTheDocument();
        // Check for icon mock
        expect(screen.getAllByTestId('terminal-icon').length).toBeGreaterThan(0);
    });

    it('updates the "Last updated" time periodically', () => {
        const initialTime = screen.getByText(/Last updated:/i).textContent;
        
        // Fast-forward time
        act(() => {
            jest.advanceTimersByTime(30000); // Advance by the interval time
        });

        const updatedTime = screen.getByText(/Last updated:/i).textContent;
        expect(updatedTime).not.toBe(initialTime);
    });

    // TODO: Add more tests:
    // - Test data fetching integration when implemented
    // - Test status color changes based on mock data
    // - Test alert variant changes based on severity
    // - Test interactions if any are added (e.g., clicking for details)
}); 