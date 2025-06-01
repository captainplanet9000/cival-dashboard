import { test, expect, Page } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth-helpers';

/**
 * E2E tests for portfolio management features
 * Tests user interactions with the portfolio dashboard, creation, and management
 */
test.describe('Portfolio Management', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Start with a fresh context and page for each test
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Login before each test
    await loginAsTestUser(page);
    
    // Navigate to the portfolio page
    await page.goto('/portfolio');
    
    // Wait for the portfolio dashboard to load
    await page.waitForSelector('[data-testid="portfolio-dashboard"]');
  });

  test('should display portfolio overview with correct assets', async () => {
    // Verify portfolio overview card is visible
    await expect(page.locator('[data-testid="portfolio-overview-card"]')).toBeVisible();
    
    // Check for portfolio value
    const portfolioValue = page.locator('[data-testid="portfolio-total-value"]');
    await expect(portfolioValue).toBeVisible();
    
    // Verify portfolio contains at least one asset (demo data)
    const assetItems = page.locator('[data-testid="portfolio-asset-item"]');
    await expect(assetItems).toHaveCount({ min: 1 });
    
    // Verify allocation chart is visible
    await expect(page.locator('[data-testid="allocation-chart"]')).toBeVisible();
  });

  test('should allow creating a new portfolio', async () => {
    // Click the create portfolio button
    await page.click('[data-testid="create-portfolio-button"]');
    
    // Wait for the create portfolio dialog
    await page.waitForSelector('[data-testid="create-portfolio-dialog"]');
    
    // Fill the portfolio name
    await page.fill('[data-testid="portfolio-name-input"]', 'E2E Test Portfolio');
    
    // Select a portfolio type
    await page.selectOption('[data-testid="portfolio-type-select"]', 'aggressive');
    
    // Fill description
    await page.fill('[data-testid="portfolio-description-input"]', 'Created by E2E test');
    
    // Set initial balance
    await page.fill('[data-testid="initial-balance-input"]', '10000');
    
    // Add an asset allocation
    await page.click('[data-testid="add-asset-button"]');
    await page.selectOption('[data-testid="asset-select-0"]', 'AAPL');
    await page.fill('[data-testid="allocation-input-0"]', '50');
    
    // Add a second asset
    await page.click('[data-testid="add-asset-button"]');
    await page.selectOption('[data-testid="asset-select-1"]', 'MSFT');
    await page.fill('[data-testid="allocation-input-1"]', '50');
    
    // Submit the form
    await page.click('[data-testid="create-portfolio-submit"]');
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Verify the new portfolio appears in the list
    await expect(page.locator('text=E2E Test Portfolio')).toBeVisible();
  });

  test('should display portfolio performance metrics', async () => {
    // Click on the first portfolio card to view details
    await page.click('[data-testid="portfolio-card"]:first-child');
    
    // Wait for the portfolio details page to load
    await page.waitForSelector('[data-testid="portfolio-details"]');
    
    // Verify performance chart is visible
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
    
    // Verify performance metrics
    await expect(page.locator('[data-testid="total-return-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="annualized-return-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="sharpe-ratio-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="max-drawdown-metric"]')).toBeVisible();
    
    // Check that asset allocation table is visible
    await expect(page.locator('[data-testid="asset-allocation-table"]')).toBeVisible();
  });

  test('should allow rebalancing a portfolio', async () => {
    // Click on the first portfolio card to view details
    await page.click('[data-testid="portfolio-card"]:first-child');
    
    // Wait for the portfolio details page to load
    await page.waitForSelector('[data-testid="portfolio-details"]');
    
    // Click the rebalance button
    await page.click('[data-testid="rebalance-portfolio-button"]');
    
    // Wait for rebalance dialog
    await page.waitForSelector('[data-testid="rebalance-dialog"]');
    
    // Adjust allocation of first asset
    await page.fill('[data-testid="rebalance-allocation-0"]', '60');
    
    // Adjust allocation of second asset to maintain 100% total
    await page.fill('[data-testid="rebalance-allocation-1"]', '40');
    
    // Submit rebalance
    await page.click('[data-testid="confirm-rebalance-button"]');
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Verify allocations have been updated
    await page.waitForSelector('[data-testid="asset-allocation-table"]');
    const firstAssetAllocation = page.locator('[data-testid="asset-allocation-row"]:first-child [data-testid="allocation-percentage"]');
    await expect(firstAssetAllocation).toContainText('60%');
  });

  test('should allow adding funds to a portfolio', async () => {
    // Click on the first portfolio card to view details
    await page.click('[data-testid="portfolio-card"]:first-child');
    
    // Wait for the portfolio details page to load
    await page.waitForSelector('[data-testid="portfolio-details"]');
    
    // Get initial portfolio value
    const initialValueText = await page.locator('[data-testid="portfolio-total-value"]').textContent();
    const initialValue = parseFloat(initialValueText.replace(/[^0-9.]/g, ''));
    
    // Click the add funds button
    await page.click('[data-testid="add-funds-button"]');
    
    // Wait for add funds dialog
    await page.waitForSelector('[data-testid="add-funds-dialog"]');
    
    // Enter amount to add
    await page.fill('[data-testid="add-funds-amount"]', '5000');
    
    // Select deposit method
    await page.selectOption('[data-testid="deposit-method"]', 'bank_transfer');
    
    // Submit the deposit
    await page.click('[data-testid="confirm-deposit-button"]');
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Verify portfolio value has increased
    await page.waitForSelector('[data-testid="portfolio-total-value"]');
    const newValueText = await page.locator('[data-testid="portfolio-total-value"]').textContent();
    const newValue = parseFloat(newValueText.replace(/[^0-9.]/g, ''));
    
    expect(newValue).toBeGreaterThan(initialValue);
  });

  test('should display transaction history for portfolio', async () => {
    // Click on the first portfolio card to view details
    await page.click('[data-testid="portfolio-card"]:first-child');
    
    // Wait for the portfolio details page to load
    await page.waitForSelector('[data-testid="portfolio-details"]');
    
    // Click on the transactions tab
    await page.click('[data-testid="transactions-tab"]');
    
    // Verify transaction table is visible
    await expect(page.locator('[data-testid="transaction-history-table"]')).toBeVisible();
    
    // Verify table has headers
    await expect(page.locator('[data-testid="transaction-header-date"]')).toBeVisible();
    await expect(page.locator('[data-testid="transaction-header-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="transaction-header-amount"]')).toBeVisible();
    
    // Verify at least one transaction exists (demo data)
    const transactionRows = page.locator('[data-testid="transaction-row"]');
    await expect(transactionRows).toHaveCount({ min: 1 });
  });

  test('should allow downloading portfolio report', async () => {
    // Click on the first portfolio card to view details
    await page.click('[data-testid="portfolio-card"]:first-child');
    
    // Wait for the portfolio details page to load
    await page.waitForSelector('[data-testid="portfolio-details"]');
    
    // Click on export/download button
    await page.click('[data-testid="export-portfolio-button"]');
    
    // Wait for export dialog
    await page.waitForSelector('[data-testid="export-dialog"]');
    
    // Select report type
    await page.selectOption('[data-testid="report-type-select"]', 'performance_summary');
    
    // Select format
    await page.selectOption('[data-testid="export-format-select"]', 'pdf');
    
    // Set date range
    await page.fill('[data-testid="start-date-input"]', '2023-01-01');
    await page.fill('[data-testid="end-date-input"]', '2023-12-31');
    
    // Mock download by checking download button is enabled
    const downloadButton = page.locator('[data-testid="download-report-button"]');
    await expect(downloadButton).toBeEnabled();
    
    // Click download (we can't actually verify file download in this test)
    await downloadButton.click();
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('should allow setting portfolio alerts', async () => {
    // Click on the first portfolio card to view details
    await page.click('[data-testid="portfolio-card"]:first-child');
    
    // Wait for the portfolio details page to load
    await page.waitForSelector('[data-testid="portfolio-details"]');
    
    // Click on alerts tab
    await page.click('[data-testid="alerts-tab"]');
    
    // Wait for alerts section
    await page.waitForSelector('[data-testid="portfolio-alerts"]');
    
    // Click add alert button
    await page.click('[data-testid="add-alert-button"]');
    
    // Wait for add alert dialog
    await page.waitForSelector('[data-testid="add-alert-dialog"]');
    
    // Select alert type
    await page.selectOption('[data-testid="alert-type-select"]', 'price_threshold');
    
    // For price threshold alert, select asset
    await page.selectOption('[data-testid="alert-asset-select"]', 'AAPL');
    
    // Set threshold value
    await page.fill('[data-testid="alert-threshold-input"]', '150');
    
    // Select condition
    await page.selectOption('[data-testid="alert-condition-select"]', 'above');
    
    // Select notification method
    await page.click('[data-testid="notification-method-email"]');
    
    // Save alert
    await page.click('[data-testid="save-alert-button"]');
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Verify new alert appears in the list
    await expect(page.locator('text=AAPL price above $150')).toBeVisible();
  });
});
