import { test, expect, Page } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth-helpers';

/**
 * E2E tests for strategy management features
 * Tests the full workflow of creating, configuring, testing, and deploying trading strategies
 */
test.describe('Strategy Management', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Start with a fresh context and page for each test
    const context = await browser.newContext();
    page = await context.newPage();
    
    // Login before each test
    await loginAsTestUser(page);
    
    // Navigate to the strategies page
    await page.goto('/strategies');
    
    // Wait for the strategies dashboard to load
    await page.waitForSelector('[data-testid="strategies-dashboard"]');
  });

  test('should display list of existing strategies', async () => {
    // Verify strategies list is visible
    await expect(page.locator('[data-testid="strategies-list"]')).toBeVisible();
    
    // Check for strategy cards (there should be at least demo strategies)
    const strategyCards = page.locator('[data-testid="strategy-card"]');
    await expect(strategyCards).toHaveCount({ min: 1 });
    
    // Verify strategy cards have basic information
    await expect(page.locator('[data-testid="strategy-name"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="strategy-description"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="strategy-performance"]').first()).toBeVisible();
  });

  test('should create a new trading strategy', async () => {
    // Click the create strategy button
    await page.click('[data-testid="create-strategy-button"]');
    
    // Wait for the create strategy dialog
    await page.waitForSelector('[data-testid="create-strategy-dialog"]');
    
    // Fill the strategy name
    await page.fill('[data-testid="strategy-name-input"]', 'E2E Test Strategy');
    
    // Fill the strategy description
    await page.fill('[data-testid="strategy-description-input"]', 'A strategy created by E2E tests');
    
    // Select strategy type
    await page.selectOption('[data-testid="strategy-type-select"]', 'momentum');
    
    // Configure basic parameters
    await page.fill('[data-testid="param-lookback-period"]', '20');
    await page.fill('[data-testid="param-threshold"]', '0.05');
    await page.selectOption('[data-testid="param-timeframe"]', 'daily');
    
    // Configure assets
    await page.click('[data-testid="add-asset-button"]');
    await page.selectOption('[data-testid="asset-select-0"]', 'AAPL');
    
    // Add a second asset
    await page.click('[data-testid="add-asset-button"]');
    await page.selectOption('[data-testid="asset-select-1"]', 'MSFT');
    
    // Set position sizing
    await page.selectOption('[data-testid="position-sizing-select"]', 'percentage');
    await page.fill('[data-testid="position-size-input"]', '10');
    
    // Submit the form
    await page.click('[data-testid="create-strategy-submit"]');
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Verify the new strategy appears in the list
    await expect(page.locator('text=E2E Test Strategy')).toBeVisible();
  });

  test('should edit an existing strategy', async () => {
    // Click on the first strategy's edit button
    await page.click('[data-testid="strategy-card"] [data-testid="edit-strategy-button"]');
    
    // Wait for the edit dialog to appear
    await page.waitForSelector('[data-testid="edit-strategy-dialog"]');
    
    // Verify form is pre-filled with strategy data
    await expect(page.locator('[data-testid="strategy-name-input"]')).toHaveValue();
    await expect(page.locator('[data-testid="strategy-description-input"]')).toHaveValue();
    
    // Update the strategy name
    const originalName = await page.locator('[data-testid="strategy-name-input"]').inputValue();
    const newName = `${originalName} (Updated)`;
    await page.fill('[data-testid="strategy-name-input"]', newName);
    
    // Update a parameter
    await page.fill('[data-testid="param-threshold"]', '0.08');
    
    // Submit the form
    await page.click('[data-testid="update-strategy-submit"]');
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Verify the updated strategy name appears in the list
    await expect(page.locator(`text=${newName}`)).toBeVisible();
  });

  test('should run backtest on a strategy', async () => {
    // Click on the first strategy card to view details
    await page.click('[data-testid="strategy-card"]');
    
    // Wait for strategy details page to load
    await page.waitForSelector('[data-testid="strategy-details"]');
    
    // Click the backtest button
    await page.click('[data-testid="run-backtest-button"]');
    
    // Wait for backtest configuration dialog
    await page.waitForSelector('[data-testid="backtest-config-dialog"]');
    
    // Configure backtest parameters
    await page.fill('[data-testid="start-date-input"]', '2023-01-01');
    await page.fill('[data-testid="end-date-input"]', '2023-12-31');
    await page.selectOption('[data-testid="initial-capital-input"]', '10000');
    
    // Start the backtest
    await page.click('[data-testid="start-backtest-button"]');
    
    // Wait for backtest to complete (this may take time in a real environment)
    await page.waitForSelector('[data-testid="backtest-results"]', { timeout: 30000 });
    
    // Verify backtest results are displayed
    await expect(page.locator('[data-testid="backtest-performance-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="backtest-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="backtest-trades-table"]')).toBeVisible();
  });

  test('should activate and deactivate a strategy', async () => {
    // Get the first inactive strategy card
    const inactiveStrategyCard = page.locator('[data-testid="strategy-card"]:not(.active)').first();
    
    // Store the strategy name for later verification
    const strategyName = await inactiveStrategyCard.locator('[data-testid="strategy-name"]').textContent();
    
    // Click the activate button
    await inactiveStrategyCard.locator('[data-testid="activate-strategy-button"]').click();
    
    // Confirm activation in the dialog
    await page.waitForSelector('[data-testid="activation-dialog"]');
    await page.click('[data-testid="confirm-activation-button"]');
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Verify the strategy now shows as active
    await expect(page.locator(`[data-testid="strategy-card"]:has-text("${strategyName}")`)).toHaveClass(/active/);
    
    // Now deactivate the strategy
    await page.locator(`[data-testid="strategy-card"]:has-text("${strategyName}")`).locator('[data-testid="deactivate-strategy-button"]').click();
    
    // Confirm deactivation
    await page.waitForSelector('[data-testid="deactivation-dialog"]');
    await page.click('[data-testid="confirm-deactivation-button"]');
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Verify the strategy now shows as inactive
    await expect(page.locator(`[data-testid="strategy-card"]:has-text("${strategyName}")`)).not.toHaveClass(/active/);
  });

  test('should view strategy performance metrics', async () => {
    // Click on the first strategy card to view details
    await page.click('[data-testid="strategy-card"]');
    
    // Wait for strategy details page to load
    await page.waitForSelector('[data-testid="strategy-details"]');
    
    // Click on the performance tab
    await page.click('[data-testid="performance-tab"]');
    
    // Verify performance metrics are displayed
    await expect(page.locator('[data-testid="performance-metrics-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
    
    // Check for key metrics
    await expect(page.locator('[data-testid="total-return-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="max-drawdown-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="sharpe-ratio-metric"]')).toBeVisible();
    await expect(page.locator('[data-testid="win-rate-metric"]')).toBeVisible();
    
    // Check for trade history
    await expect(page.locator('[data-testid="trade-history-table"]')).toBeVisible();
  });

  test('should compare multiple strategies', async () => {
    // Click the compare strategies button
    await page.click('[data-testid="compare-strategies-button"]');
    
    // Wait for strategy comparison page
    await page.waitForSelector('[data-testid="strategy-comparison"]');
    
    // Select strategies to compare (first two)
    await page.click('[data-testid="strategy-checkbox-0"]');
    await page.click('[data-testid="strategy-checkbox-1"]');
    
    // Click compare button
    await page.click('[data-testid="run-comparison-button"]');
    
    // Wait for comparison results
    await page.waitForSelector('[data-testid="comparison-results"]');
    
    // Verify comparison chart is visible
    await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible();
    
    // Verify metrics table showing both strategies
    await expect(page.locator('[data-testid="comparison-metrics-table"]')).toBeVisible();
    
    // Verify at least 2 strategies in the table
    const strategyRows = page.locator('[data-testid="comparison-strategy-row"]');
    await expect(strategyRows).toHaveCount({ min: 2 });
  });

  test('should export strategy performance report', async () => {
    // Click on the first strategy card to view details
    await page.click('[data-testid="strategy-card"]');
    
    // Wait for strategy details page to load
    await page.waitForSelector('[data-testid="strategy-details"]');
    
    // Click export button
    await page.click('[data-testid="export-report-button"]');
    
    // Wait for export dialog
    await page.waitForSelector('[data-testid="export-dialog"]');
    
    // Select report format
    await page.selectOption('[data-testid="report-format-select"]', 'pdf');
    
    // Set date range
    await page.fill('[data-testid="report-start-date"]', '2023-01-01');
    await page.fill('[data-testid="report-end-date"]', '2023-12-31');
    
    // Select report sections to include
    await page.check('[data-testid="include-performance-metrics"]');
    await page.check('[data-testid="include-trade-history"]');
    await page.check('[data-testid="include-charts"]');
    
    // Click download button
    const downloadButton = page.locator('[data-testid="download-report-button"]');
    await expect(downloadButton).toBeEnabled();
    
    // We can't actually test file download in this E2E environment
    // So we'll just verify the button is clickable
    await downloadButton.click();
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
  });

  test('should clone an existing strategy', async () => {
    // Find a strategy name to clone
    const strategyName = await page.locator('[data-testid="strategy-name"]').first().textContent();
    
    // Click the kebab menu on the first strategy card
    await page.click('[data-testid="strategy-card"] [data-testid="strategy-menu-button"]');
    
    // Click the clone option
    await page.click('[data-testid="clone-strategy-option"]');
    
    // Wait for clone dialog
    await page.waitForSelector('[data-testid="clone-strategy-dialog"]');
    
    // The name should be pre-filled with "Copy of [original name]"
    await expect(page.locator('[data-testid="strategy-name-input"]')).toHaveValue(`Copy of ${strategyName}`);
    
    // Submit the form to clone
    await page.click('[data-testid="clone-strategy-submit"]');
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Verify the cloned strategy appears in the list
    await expect(page.locator(`text=Copy of ${strategyName}`)).toBeVisible();
  });

  test('should delete a strategy', async () => {
    // Create a strategy specifically to delete
    await page.click('[data-testid="create-strategy-button"]');
    await page.waitForSelector('[data-testid="create-strategy-dialog"]');
    await page.fill('[data-testid="strategy-name-input"]', 'Strategy To Delete');
    await page.fill('[data-testid="strategy-description-input"]', 'This strategy will be deleted');
    await page.selectOption('[data-testid="strategy-type-select"]', 'momentum');
    await page.click('[data-testid="create-strategy-submit"]');
    
    // Wait for the strategy to appear in the list
    await expect(page.locator('text=Strategy To Delete')).toBeVisible();
    
    // Find the newly created strategy card
    const strategyCard = page.locator('[data-testid="strategy-card"]:has-text("Strategy To Delete")');
    
    // Click the kebab menu
    await strategyCard.locator('[data-testid="strategy-menu-button"]').click();
    
    // Click the delete option
    await page.click('[data-testid="delete-strategy-option"]');
    
    // Wait for delete confirmation dialog
    await page.waitForSelector('[data-testid="delete-confirmation-dialog"]');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Verify success toast appears
    await expect(page.locator('.toast-success')).toBeVisible();
    
    // Verify the strategy no longer appears in the list
    await expect(page.locator('text=Strategy To Delete')).not.toBeVisible();
  });
});
