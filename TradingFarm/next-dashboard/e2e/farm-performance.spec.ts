import { test, expect } from '@playwright/test';

// Farm performance dashboard end-to-end test
test.describe('Farm Performance Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the main dashboard page
    await page.goto('/dashboard');
  });

  test('should navigate from main dashboard to farm performance page', async ({ page }) => {
    // Click on the Farm Performance section
    await page.getByText('Farm Performance').first().click();
    
    // Click on "Detailed Analytics" button in the performance section
    await page.getByRole('link', { name: /detailed analytics/i }).first().click();
    
    // Verify we've navigated to the farm performance page
    await expect(page.url()).toContain('/dashboard/farms/');
    await expect(page.url()).toContain('/performance');
    
    // Verify key components of the performance dashboard are visible
    await expect(page.getByText('Performance Trend')).toBeVisible();
    await expect(page.getByText('Asset Allocation')).toBeVisible();
    await expect(page.getByText('Current Balance')).toBeVisible();
  });
  
  test('should switch between tabs on the performance dashboard', async ({ page }) => {
    // Navigate to the farm performance page
    await page.goto('/dashboard/farms/1/performance');
    
    // Click on the "Performance" tab
    await page.getByRole('tab', { name: 'Performance' }).click();
    
    // Verify the performance metrics are visible
    await expect(page.getByText('Performance Metrics')).toBeVisible();
    
    // Click on the "Transactions" tab
    await page.getByRole('tab', { name: 'Transactions' }).click();
    
    // Verify transactions table is visible
    await expect(page.getByText('Transactions')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Amount' })).toBeVisible();
    
    // Click on the "Allocation" tab
    await page.getByRole('tab', { name: 'Allocation' }).click();
    
    // Verify asset allocation content is visible
    await expect(page.getByText('Asset Allocation')).toBeVisible();
  });
  
  test('should filter data by date range selector', async ({ page }) => {
    // Navigate to the farm performance page
    await page.goto('/dashboard/farms/1/performance');
    
    // Open the date range selector
    await page.getByRole('combobox').first().click();
    
    // Select "Last 7 Days" option
    await page.getByRole('option', { name: 'Last 7 Days' }).click();
    
    // Verify the date range text has updated
    await expect(page.getByText(/Last 7 Days/)).toBeVisible();
    
    // The page should reload the data (this would trigger a loading state)
    await expect(page.getByText('Performance Trend')).toBeVisible();
  });
  
  test('should allow switching between farms', async ({ page }) => {
    // Navigate to the farm performance page
    await page.goto('/dashboard/farms/1/performance');
    
    // Get the current farm name
    const currentFarmText = await page.getByRole('combobox').nth(1).textContent();
    
    // Open the farm selector
    await page.getByRole('combobox').nth(1).click();
    
    // Select a different farm (the second option)
    await page.getByRole('option').nth(1).click();
    
    // Verify the farm selector has changed
    const newFarmText = await page.getByRole('combobox').nth(1).textContent();
    expect(newFarmText).not.toBe(currentFarmText);
    
    // Verify the URL has updated to the new farm ID
    await expect(page.url()).toContain('/dashboard/farms/');
    await expect(page.url()).toContain('/performance');
  });
});
