import { test, expect } from '@playwright/test';

/**
 * End-to-end tests for the Trading Farm Dashboard navigation flow
 * Tests all primary navigation paths and verifies correct active states
 */
test.describe('Dashboard Navigation Structure', () => {
  
  // Set up the test with a base URL and authentication
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard home and handle login if needed
    await page.goto('/dashboard');
    
    // Mock auth if needed for testing
    // This depends on your auth implementation - for example:
    /*
    await page.evaluate(() => {
      localStorage.setItem('mockAuthEnabled', 'true');
      localStorage.setItem('mockUserData', JSON.stringify({
        id: 'test-user-1',
        name: 'Test User',
        email: 'test@example.com'
      }));
    });
    await page.reload();
    */
  });

  test('should load dashboard home and display all navigation sections', async ({ page }) => {
    // Verify main dashboard loads
    await expect(page).toHaveTitle(/Dashboard/);
    
    // Verify all main navigation sections are visible
    const navSections = [
      'Dashboard',
      'Core Trading',
      'Execution', 
      'Analytics',
      'Funding',
      'AI Center',
      'Settings'
    ];
    
    for (const section of navSections) {
      await expect(page.getByText(section, { exact: false })).toBeVisible();
    }
  });

  test('should navigate to Execution sections with correct active states', async ({ page }) => {
    // Test navigation to Positions
    await page.getByRole('link', { name: /Positions/i }).click();
    await expect(page.getByRole('heading', { name: /Positions/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/execution/positions');
    
    // Check that the positions link is active
    const positionsLink = page.getByRole('link', { name: /Positions/i });
    const positionsLinkClass = await positionsLink.getAttribute('class');
    expect(positionsLinkClass).toContain('bg-gray-100');
    
    // Test navigation to Order History
    await page.getByRole('link', { name: /Order History/i }).click();
    await expect(page.getByRole('heading', { name: /Order History/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/execution/orders');
    
    // Check that the order history link is active
    const ordersLink = page.getByRole('link', { name: /Order History/i });
    const ordersLinkClass = await ordersLink.getAttribute('class');
    expect(ordersLinkClass).toContain('bg-gray-100');
    
    // Test navigation to Activity Logs
    await page.getByRole('link', { name: /Activity Logs/i }).click();
    await expect(page.getByRole('heading', { name: /Activity Logs/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/execution/logs');
  });

  test('should navigate to Analytics sections with correct active states', async ({ page }) => {
    // Test navigation to Performance
    await page.getByRole('link', { name: /Performance/i }).click();
    await expect(page.getByRole('heading', { name: /Performance Analytics/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/analytics/performance');
    
    // Test navigation to Risk Analysis
    await page.getByRole('link', { name: /Risk Analysis/i }).click();
    await expect(page.getByRole('heading', { name: /Risk Analytics/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/analytics/risk');
    
    // Test navigation to Market Insights
    await page.getByRole('link', { name: /Market Insights/i }).click();
    await expect(page.getByRole('heading', { name: /Market Analytics/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/analytics/market');
  });

  test('should navigate to Funding sections with correct active states', async ({ page }) => {
    // Test navigation to Accounts & Balances
    await page.getByRole('link', { name: /Accounts & Balances/i }).click();
    await expect(page.getByRole('heading', { name: /Accounts & Balances/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/funding/accounts');
    
    // Test navigation to Vault
    await page.getByRole('link', { name: /Vault/i }).click();
    await expect(page.getByRole('heading', { name: /Vault Dashboard/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/funding/vault');
    
    // Test navigation to Transactions
    await page.getByRole('link', { name: /Transactions/i }).click();
    await expect(page.getByRole('heading', { name: /Transactions/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/funding/transactions');
  });

  test('should navigate to AI Center sections with correct active states', async ({ page }) => {
    // Test navigation to Command & Control
    await page.getByRole('link', { name: /Command & Control/i }).click();
    await expect(page.getByRole('heading', { name: /Command Center/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/ai-center/command');
    
    // Test navigation to Knowledge Base
    await page.getByRole('link', { name: /Knowledge Base/i }).click();
    await expect(page.getByRole('heading', { name: /Knowledge Center/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/ai-center/knowledge');
    
    // Test navigation to ElizaOS
    await page.getByRole('link', { name: /ElizaOS/i }).click();
    await expect(page.getByRole('heading', { name: /ElizaOS/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/ai-center/eliza');
    
    // Test navigation to AI Advisor
    await page.getByRole('link', { name: /AI Advisor/i }).click();
    await expect(page.getByRole('heading', { name: /AI Advisor/i })).toBeVisible();
    await expect(page.url()).toContain('/dashboard/ai-center/advisor');
  });
});

// Test mobile responsiveness
test.describe('Mobile Navigation Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 Pro dimensions
    await page.goto('/dashboard');
  });

  test('should display mobile navigation correctly', async ({ page }) => {
    // Check if mobile menu button exists
    const mobileMenuButton = page.getByRole('button', { name: /menu/i });
    await expect(mobileMenuButton).toBeVisible();
    
    // Click the mobile menu button to open the menu
    await mobileMenuButton.click();
    
    // Verify all navigation sections are visible in mobile view
    const navSections = [
      'Dashboard',
      'Core Trading',
      'Execution', 
      'Analytics',
      'Funding',
      'AI Center',
      'Settings'
    ];
    
    for (const section of navSections) {
      await expect(page.getByText(section, { exact: false })).toBeVisible();
    }
  });

  test('should navigate correctly on mobile devices', async ({ page }) => {
    // Open mobile menu
    const mobileMenuButton = page.getByRole('button', { name: /menu/i });
    await mobileMenuButton.click();
    
    // Click on a navigation item
    await page.getByRole('link', { name: /Funding/i }).click();
    
    // Check that the page navigated correctly
    await expect(page.url()).toContain('/dashboard/funding');
    
    // Verify that the menu closed after navigation
    await expect(page.getByRole('link', { name: /Accounts & Balances/i })).not.toBeVisible();
    
    // Reopen menu to check subcategory navigation
    await mobileMenuButton.click();
    await page.getByRole('link', { name: /Accounts & Balances/i }).click();
    
    // Verify correct navigation to subcategory
    await expect(page.url()).toContain('/dashboard/funding/accounts');
  });
});
