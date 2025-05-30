import { test, expect } from '@playwright/test';

// Goal tracking dashboard end-to-end test
test.describe('Goal Tracking Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the main dashboard page
    await page.goto('/dashboard');
  });

  test('should navigate from main dashboard to goal tracking page', async ({ page }) => {
    // Find goal monitoring section
    await page.getByText('Goal Monitoring').first().click();
    
    // Click on "View All Goals" link
    await page.getByRole('link', { name: /view all goals/i }).first().click();
    
    // Verify we've navigated to the goals tracking page
    await expect(page.url()).toContain('/dashboard/goals');
    
    // Verify key components of the goals dashboard are visible
    await expect(page.getByText('Goal Tracking')).toBeVisible();
    await expect(page.getByText('Active Goals')).toBeVisible();
    await expect(page.getByText('Completed Goals')).toBeVisible();
  });
  
  test('should display goal details and progress charts', async ({ page }) => {
    // Navigate directly to the goals tracking page
    await page.goto('/dashboard/goals/tracking');
    
    // Verify goal progress visualization is visible
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await expect(page.getByText('Target Amount')).toBeVisible();
    await expect(page.getByText('Current Amount')).toBeVisible();
    await expect(page.getByText('Progress')).toBeVisible();
    
    // Check that the progress percentage is displayed
    const progressText = await page.getByText(/\d+(\.\d+)?%/).first().textContent();
    expect(progressText).toMatch(/\d+(\.\d+)?%/);
  });
  
  test('should switch between goals using the selector', async ({ page }) => {
    // Navigate to the goals tracking page
    await page.goto('/dashboard/goals/tracking');
    
    // Get the name of the currently selected goal
    const initialGoalName = await page.getByRole('heading').nth(1).textContent();
    
    // Open the goal selector dropdown
    await page.getByRole('combobox').first().click();
    
    // Select the second goal option
    await page.getByRole('option').nth(1).click();
    
    // Verify that a different goal is now selected
    const newGoalName = await page.getByRole('heading').nth(1).textContent();
    expect(newGoalName).not.toBe(initialGoalName);
    
    // Verify the URL has been updated with the new goal ID
    await expect(page.url()).toContain('goalId=');
  });
  
  test('should switch between progress updates and agents tabs', async ({ page }) => {
    // Navigate to the goals tracking page
    await page.goto('/dashboard/goals/tracking');
    
    // Progress updates tab should be visible by default
    await expect(page.getByText('Progress History')).toBeVisible();
    
    // Switch to agents tab
    await page.getByRole('tab', { name: 'Assigned Agents' }).click();
    
    // Agents list should now be visible
    await expect(page.getByText('Assigned Agents')).toBeVisible();
    
    // Switch back to updates tab
    await page.getByRole('tab', { name: 'Progress Updates' }).click();
    
    // Progress updates should be visible again
    await expect(page.getByText('Progress History')).toBeVisible();
  });
  
  test('should navigate to create new goal form', async ({ page }) => {
    // Navigate to the goals tracking page
    await page.goto('/dashboard/goals/tracking');
    
    // Click on the New Goal button
    await page.getByRole('button', { name: /new goal/i }).click();
    
    // Verify navigation to the goal creation page
    await expect(page.url()).toContain('/dashboard/goals/create');
    
    // Verify the form is visible
    await expect(page.getByText('Create New Goal')).toBeVisible();
    await expect(page.getByLabel('Goal Name')).toBeVisible();
    await expect(page.getByLabel('Target Amount')).toBeVisible();
  });
  
  test('should handle empty state when no goals are available', async ({ page }) => {
    // Navigate to a farm with no goals
    await page.goto('/dashboard/goals/tracking?farmId=999');
    
    // Check for empty state message
    await expect(page.getByText(/no goals found/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create a goal/i })).toBeVisible();
  });
});
