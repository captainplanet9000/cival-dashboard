import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import CommandConsole from './command-console';

// Mock fetch for intent API
beforeEach(() => {
  global.fetch = vi.fn().mockImplementation((url, opts) => {
    if (typeof opts?.body === 'string' && opts.body.includes('test command')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          provider: 'openrouter',
          model: 'gpt-4o',
          completion: 'Test completion from LLM',
        }),
      });
    }
    return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'fail' }) });
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

describe('CommandConsole', () => {
  it('renders input and send button', () => {
    render(<CommandConsole farmId="farm-1" />);
    expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument();
    expect(screen.getByText(/send/i)).toBeInTheDocument();
  });

  it('shows advanced controls when chevron is clicked', () => {
    render(<CommandConsole farmId="farm-1" />);
    fireEvent.click(screen.getByTitle(/show advanced/i));
    expect(screen.getByText(/provider:/i)).toBeInTheDocument();
    expect(screen.getByText(/model:/i)).toBeInTheDocument();
  });

  it('sends command and displays LLM response with provider/model', async () => {
    render(<CommandConsole farmId="farm-1" />);
    fireEvent.change(screen.getByPlaceholderText(/type a command/i), { target: { value: 'test command' } });
    fireEvent.click(screen.getByText(/send/i));
    await waitFor(() => expect(screen.getByText(/provider: openrouter/i)).toBeInTheDocument());
    expect(screen.getByText(/model: gpt-4o/i)).toBeInTheDocument();
    expect(screen.getByText(/test completion from llm/i)).toBeInTheDocument();
  });

  it('changes provider/model via advanced controls', () => {
    render(<CommandConsole farmId="farm-1" />);
    fireEvent.click(screen.getByTitle(/show advanced/i));
    fireEvent.change(screen.getByLabelText(/provider:/i), { target: { value: 'openai' } });
    expect(screen.getByDisplayValue(/openai/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/model:/i), { target: { value: 'gpt-3.5-turbo' } });
    expect(screen.getByDisplayValue(/gpt-3.5-turbo/i)).toBeInTheDocument();
  });
});
