import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button-standardized';
import '@testing-library/jest-dom';

describe('Button Component', () => {
  // Basic rendering tests
  describe('Rendering', () => {
    test('renders with children correctly', () => {
      render(<Button>Test Button</Button>);
      expect(screen.getByRole('button')).toHaveTextContent('Test Button');
    });

    test('applies custom className correctly', () => {
      render(<Button className="custom-class">Test Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    test('applies additional attributes correctly', () => {
      render(<Button data-testid="test-button">Test Button</Button>);
      expect(screen.getByTestId('test-button')).toBeInTheDocument();
    });
  });

  // Variants tests
  describe('Variants', () => {
    test('renders default variant correctly', () => {
      render(<Button>Default Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-primary');
    });

    test('renders primary variant correctly', () => {
      render(<Button variant="primary">Primary Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-primary');
    });

    test('renders destructive variant correctly', () => {
      render(<Button variant="destructive">Destructive Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-destructive');
    });

    test('renders outline variant correctly', () => {
      render(<Button variant="outline">Outline Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('border-input');
    });

    test('renders secondary variant correctly', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-secondary');
    });

    test('renders ghost variant correctly', () => {
      render(<Button variant="ghost">Ghost Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('hover:bg-accent');
    });

    test('renders link variant correctly', () => {
      render(<Button variant="link">Link Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('underline-offset-4');
    });

    test('renders success variant correctly', () => {
      render(<Button variant="success">Success Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-success');
    });

    test('renders warning variant correctly', () => {
      render(<Button variant="warning">Warning Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('bg-warning');
    });
  });

  // Sizes tests
  describe('Sizes', () => {
    test('renders default size correctly', () => {
      render(<Button>Default Size</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-10');
    });

    test('renders small size correctly', () => {
      render(<Button size="sm">Small Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-8');
    });

    test('renders large size correctly', () => {
      render(<Button size="lg">Large Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-11');
    });

    test('renders icon size correctly', () => {
      render(<Button size="icon">Icon</Button>);
      expect(screen.getByRole('button')).toHaveClass('h-10 w-10 rounded-full');
    });
  });

  // State tests
  describe('States', () => {
    test('applies disabled state correctly', () => {
      render(<Button disabled>Disabled Button</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByRole('button')).toHaveClass('disabled:opacity-50');
    });

    test('handles loading state correctly', () => {
      render(<Button isLoading loadingText="Loading...">Submit</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByRole('button')).toHaveTextContent('Loading...');
      expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
    });

    test('handles loading state with custom icon correctly', () => {
      render(
        <Button 
          isLoading 
          loadingIcon={<span data-testid="custom-loader">Loading...</span>}
        >
          Submit
        </Button>
      );
      expect(screen.getByTestId('custom-loader')).toBeInTheDocument();
    });
  });

  // Interaction tests
  describe('Interactions', () => {
    test('calls onClick handler when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Disabled</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    test('does not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} isLoading>Loading</Button>);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  // Accessibility tests
  describe('Accessibility', () => {
    test('has correct role attribute', () => {
      render(<Button>Accessible Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    test('applies aria-label correctly', () => {
      render(<Button aria-label="Accessible Action">+</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Accessible Action');
    });

    test('maintains focus visibility', () => {
      render(<Button>Focus Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('focus-visible:outline-none');
      expect(screen.getByRole('button')).toHaveClass('focus-visible:ring-2');
    });
  });
});
