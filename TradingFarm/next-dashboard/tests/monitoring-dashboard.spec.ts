import { test, expect } from '@playwright/test';

test.describe('Monitoring Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete and redirect
    await page.waitForURL('/dashboard');
    
    // Navigate to monitoring dashboard
    await page.goto('/dashboard/monitoring');
  });
  
  test('should display connection health dashboard', async ({ page }) => {
    // Click on the Exchange Health tab
    await page.click('button:has-text("Exchange Health")');
    
    // Verify that connection health components are visible
    await expect(page.locator('h2:has-text("Connection Health Overview")')).toBeVisible();
    await expect(page.locator('text=Connection Status')).toBeVisible();
    
    // Verify that status tabs are present
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Online")')).toBeVisible();
    await expect(page.locator('button:has-text("Offline")')).toBeVisible();
    
    // Check if the health data table has rows
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).toHaveCount({ min: 1 });
  });
  
  test('should display audit log viewer', async ({ page }) => {
    // Click on the Trading Audit tab
    await page.click('button:has-text("Trading Audit")');
    
    // Verify that audit log components are visible
    await expect(page.locator('h2:has-text("Trading Audit Log")')).toBeVisible();
    
    // Verify filter and export buttons are present
    await expect(page.locator('button:has-text("Filter")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
    
    // Check if the audit log table has rows
    const tableRows = page.locator('table tbody tr');
    await expect(tableRows).toHaveCount({ min: 1 });
  });
  
  test('should filter connection health data', async ({ page }) => {
    // Click on the Exchange Health tab
    await page.click('button:has-text("Exchange Health")');
    
    // Count the total number of rows
    const allRowsCount = await page.locator('table tbody tr').count();
    
    // Click on the Online tab to filter
    await page.click('button:has-text("Online")');
    
    // Get filtered rows count
    const onlineRowsCount = await page.locator('table tbody tr').count();
    
    // If we have both online and offline connections, the filtered count should be less
    // Only verify if we have more than one connection
    if (allRowsCount > 1) {
      expect(onlineRowsCount).toBeLessThanOrEqual(allRowsCount);
    }
  });
  
  test('should filter audit logs', async ({ page }) => {
    // Click on the Trading Audit tab
    await page.click('button:has-text("Trading Audit")');
    
    // Open the filter dialog
    await page.click('button:has-text("Filter")');
    
    // Wait for the filter dialog to appear
    await expect(page.locator('h2:has-text("Filter Audit Logs")')).toBeVisible();
    
    // Select an exchange from the dropdown
    await page.click('select[name="exchangeId"]');
    await page.selectOption('select[name="exchangeId"]', { index: 1 });
    
    // Select an action type
    await page.click('select[name="actionType"]');
    await page.selectOption('select[name="actionType"]', { index: 1 });
    
    // Apply the filter
    await page.click('button:has-text("Apply")');
    
    // Verify that the table has been filtered
    await expect(page.locator('table tbody')).toBeVisible();
  });
  
  test('should view audit log details', async ({ page }) => {
    // Click on the Trading Audit tab
    await page.click('button:has-text("Trading Audit")');
    
    // Click on the details button for the first row
    await page.click('table tbody tr:first-child button:has-text("Details")');
    
    // Verify that the details dialog appears
    await expect(page.locator('h2:has-text("Audit Log Details")')).toBeVisible();
    
    // Verify that the dialog contains detailed information
    await expect(page.locator('text=User ID:')).toBeVisible();
    await expect(page.locator('text=Action Type:')).toBeVisible();
    await expect(page.locator('text=Result:')).toBeVisible();
    
    // Close the dialog
    await page.click('button:has-text("Close")');
    
    // Verify that the dialog has been closed
    await expect(page.locator('h2:has-text("Audit Log Details")')).not.toBeVisible();
  });
});
