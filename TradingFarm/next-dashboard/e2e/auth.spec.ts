import { test, expect } from '@playwright/test';

/**
 * E2E tests for authentication flows
 */
test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Go to homepage before each test
    await page.goto('/');
  });

  test('should show login form', async ({ page }) => {
    // Find and click the login link/button
    await page.getByRole('link', { name: /login/i }).click();
    
    // Wait for the login form to appear and verify it's visible
    const loginForm = page.getByRole('form', { name: /login/i });
    await expect(loginForm).toBeVisible();
    
    // Verify that both email and password fields are present
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    // Navigate to login page
    await page.getByRole('link', { name: /login/i }).click();
    
    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    
    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click();
    
    // Wait for error message and verify it's visible
    const errorMessage = page.getByText(/invalid email or password/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should navigate to registration page from login page', async ({ page }) => {
    // Navigate to login page
    await page.getByRole('link', { name: /login/i }).click();
    
    // Find and click the registration link
    await page.getByRole('link', { name: /don't have an account/i }).click();
    
    // Verify we're on the registration page
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible();
  });

  test('should require password confirmation to match on registration', async ({ page }) => {
    // Navigate to registration page
    await page.getByRole('link', { name: /register/i }).click();
    
    // Fill in registration form with mismatched passwords
    await page.getByLabel(/email/i).fill('newuser@example.com');
    await page.getByLabel(/^password$/i).fill('Password123!');
    await page.getByLabel(/confirm password/i).fill('DifferentPassword123!');
    
    // Submit the form
    await page.getByRole('button', { name: /sign up/i }).click();
    
    // Check for password mismatch error
    const errorMessage = page.getByText(/passwords do not match/i);
    await expect(errorMessage).toBeVisible();
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // We'll mock a successful login since we can't actually log in during tests
    // This requires a test-specific route or mock
    
    // Navigate to a special test login route (this would be implemented for testing)
    await page.goto('/api/test/mock-login');
    
    // Verify we get redirected to the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify user-specific content is visible
    await expect(page.getByText(/welcome/i)).toBeVisible();
  });
});

/**
 * E2E tests for user profile and settings
 */
test.describe('User Profile', () => {
  // We'll use a special test route that auto-authenticates for testing
  test.beforeEach(async ({ page }) => {
    await page.goto('/api/test/mock-login');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to profile settings', async ({ page }) => {
    // Find and click the user profile menu
    await page.getByRole('button', { name: /user menu/i }).click();
    
    // Click profile settings option
    await page.getByRole('menuitem', { name: /profile/i }).click();
    
    // Verify we're on profile settings page
    await expect(page.getByRole('heading', { name: /profile settings/i })).toBeVisible();
  });

  test('should allow changing display preferences', async ({ page }) => {
    // Navigate to settings
    await page.getByRole('button', { name: /user menu/i }).click();
    await page.getByRole('menuitem', { name: /settings/i }).click();
    
    // Select appearance tab
    await page.getByRole('tab', { name: /appearance/i }).click();
    
    // Toggle dark mode
    const darkModeSwitch = page.getByLabel(/dark mode/i);
    const initialState = await darkModeSwitch.isChecked();
    await darkModeSwitch.click();
    
    // Verify the switch state has changed
    await expect(darkModeSwitch).toBeChecked({ checked: !initialState });
    
    // Verify the theme has changed by checking for a class on the body
    const theme = initialState ? 'light' : 'dark';
    await expect(page.locator('html')).toHaveAttribute('class', new RegExp(theme));
  });

  test('should allow changing language', async ({ page }) => {
    // Navigate to settings
    await page.getByRole('button', { name: /user menu/i }).click();
    await page.getByRole('menuitem', { name: /settings/i }).click();
    
    // Select language tab
    await page.getByRole('tab', { name: /language/i }).click();
    
    // Select Spanish language
    await page.getByRole('button', { name: /español/i }).click();
    
    // Verify some UI text has changed to Spanish
    await expect(page.getByRole('heading', { name: /configuración/i })).toBeVisible();
  });

  test('should show logout confirmation', async ({ page }) => {
    // Click user menu
    await page.getByRole('button', { name: /user menu/i }).click();
    
    // Click logout
    await page.getByRole('menuitem', { name: /logout/i }).click();
    
    // Verify logout confirmation dialog appears
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/are you sure you want to logout/i)).toBeVisible();
    
    // Confirm logout
    await page.getByRole('button', { name: /confirm/i }).click();
    
    // Verify we're redirected to login page
    await expect(page).toHaveURL(/\/login/);
  });
});
