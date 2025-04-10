import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

// A simple component to test
function TestComponent({ title }: { title: string }) {
  return <div data-testid="test-component">{title}</div>;
}

describe('Example Test', () => {
  it('renders the component with the correct title', () => {
    render(<TestComponent title="Test Title" />);
    const element = screen.getByTestId('test-component');
    expect(element).toBeInTheDocument();
    expect(element.textContent).toBe('Test Title');
  });
});
