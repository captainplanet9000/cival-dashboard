import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthForm } from './auth-form';
import { renderWithProviders } from '@/tests/test-utils';
import { createBrowserClient } from '@/utils/supabase/client';

// Mock supabase client
jest.mock('@/utils/supabase/client');
const mockSupabase = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signInWithOAuth: jest.fn(),
  }
};
(createBrowserClient as jest.Mock).mockReturnValue(mockSupabase);

// Mock router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

describe('AuthForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders login form by default', () => {
    renderWithProviders(<AuthForm />);
    
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('switches to signup form when register option is clicked', () => {
    renderWithProviders(<AuthForm />);
    
    // Click on register tab
    fireEvent.click(screen.getByRole('tab', { name: /register/i }));
    
    expect(screen.getByText('Create Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    renderWithProviders(<AuthForm />);
    
    // Submit the form without entering any values
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Wait for validation errors
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
    
    // Supabase signIn should not be called
    expect(mockSupabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('calls signInWithPassword when login form is submitted with valid data', async () => {
    // Mock successful sign in
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null,
    });
    
    renderWithProviders(<AuthForm />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('calls signUp when register form is submitted with valid data', async () => {
    // Mock successful sign up
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: 'new-user' } },
      error: null,
    });
    
    renderWithProviders(<AuthForm />);
    
    // Switch to register form
    fireEvent.click(screen.getByRole('tab', { name: /register/i }));
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'newuser@example.com' },
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'password123',
      });
    });
  });

  it('displays an error message when login fails', async () => {
    // Mock failed sign in
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });
    
    renderWithProviders(<AuthForm />);
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpassword' },
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
    });
  });

  it('handles social login with OAuth providers', async () => {
    // Mock OAuth sign in
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { provider: 'google' },
      error: null,
    });
    
    renderWithProviders(<AuthForm />);
    
    // Click on Google sign in button (assuming it exists in the component)
    const googleButton = screen.getByRole('button', { name: /google/i });
    fireEvent.click(googleButton);
    
    // Wait for OAuth method to be called
    await waitFor(() => {
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.any(Object),
      });
    });
  });
});
