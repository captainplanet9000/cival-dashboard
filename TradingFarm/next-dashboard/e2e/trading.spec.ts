import { test, expect } from '@playwright/test';

/**
 * E2E tests for trading flows
 */
test.describe('Trading Functionality', () => {
  // We'll use a special test route that auto-authenticates for testing
  test.beforeEach(async ({ page }) => {
    await page.goto('/api/test/mock-login');
    await page.goto('/trading');
  });

  test('should display trading interface', async ({ page }) => {
    // Verify key trading components are visible
    await expect(page.getByRole('heading', { name: /trading/i })).toBeVisible();
    await expect(page.getByTestId('order-execution-panel')).toBeVisible();
    await expect(page.getByTestId('market-chart')).toBeVisible();
  });

  test('should switch between trading pairs', async ({ page }) => {
    // Find and click the trading pair selector
    await page.getByRole('button', { name: /btc\/usd/i }).click();
    
    // Select a different trading pair
    await page.getByRole('option', { name: /eth\/usd/i }).click();
    
    // Verify the UI updates to show the selected pair
    await expect(page.getByText(/ethereum/i)).toBeVisible();
    await expect(page.getByTestId('market-chart')).toHaveAttribute('data-symbol', 'ETH/USD');
  });

  test('should validate order inputs', async ({ page }) => {
    // Try to submit an order with invalid amount
    await page.getByRole('button', { name: /buy/i }).click();
    await page.getByLabel(/amount/i).fill('-5');
    await page.getByRole('button', { name: /place order/i }).click();
    
    // Check for validation error
    await expect(page.getByText(/amount must be positive/i)).toBeVisible();
    
    // Fix amount but leave price empty for market order
    await page.getByLabel(/amount/i).clear();
    await page.getByLabel(/amount/i).fill('0.01');
    
    // Select market order type
    await page.getByRole('button', { name: /limit/i }).click();
    await page.getByRole('option', { name: /market/i }).click();
    
    // Try to submit again
    await page.getByRole('button', { name: /place order/i }).click();
    
    // Now we should see order confirmation dialog
    await expect(page.getByRole('dialog', { name: /confirm order/i })).toBeVisible();
  });

  test('should show order confirmation dialog', async ({ page }) => {
    // Set up a valid order
    await page.getByRole('button', { name: /buy/i }).click();
    await page.getByLabel(/amount/i).fill('0.01');
    await page.getByLabel(/price/i).fill('50000');
    
    // Submit the order
    await page.getByRole('button', { name: /place order/i }).click();
    
    // Verify confirmation dialog appears with correct details
    const dialog = page.getByRole('dialog', { name: /confirm order/i });
    await expect(dialog).toBeVisible();
    
    // Check order details in confirmation
    await expect(dialog.getByText(/0.01 btc/i)).toBeVisible();
    await expect(dialog.getByText(/50000/i)).toBeVisible();
    await expect(dialog.getByText(/500/i)).toBeVisible(); // Total value (0.01 * 50000)
    
    // Cancel the order
    await dialog.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('should create an order successfully', async ({ page }) => {
    // Set up a valid order
    await page.getByRole('button', { name: /buy/i }).click();
    await page.getByLabel(/amount/i).fill('0.01');
    await page.getByLabel(/price/i).fill('50000');
    
    // Submit the order
    await page.getByRole('button', { name: /place order/i }).click();
    
    // Confirm the order in the dialog
    await page.getByRole('dialog').getByRole('button', { name: /confirm/i }).click();
    
    // Verify success message
    await expect(page.getByText(/order placed successfully/i)).toBeVisible();
    
    // Navigate to open orders and verify our order appears
    await page.getByRole('tab', { name: /open orders/i }).click();
    await expect(page.getByText(/BTC\/USD/).first()).toBeVisible();
    await expect(page.getByText(/0.01/).first()).toBeVisible();
  });

  test('should cancel an open order', async ({ page }) => {
    // Navigate to open orders tab
    await page.getByRole('tab', { name: /open orders/i }).click();
    
    // Find and click cancel on the first order
    const firstOrderRow = page.getByTestId('order-row').first();
    await firstOrderRow.getByRole('button', { name: /cancel/i }).click();
    
    // Confirm cancellation
    await page.getByRole('dialog').getByRole('button', { name: /confirm/i }).click();
    
    // Verify success message
    await expect(page.getByText(/order cancelled successfully/i)).toBeVisible();
    
    // Verify the order is removed or shows cancelled status
    await expect(firstOrderRow).not.toBeVisible();
  });
});

/**
 * E2E tests for position management
 */
test.describe('Position Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/api/test/mock-login');
    await page.goto('/trading/positions');
  });

  test('should display open positions', async ({ page }) => {
    // Verify positions component is visible
    await expect(page.getByTestId('position-management-dashboard')).toBeVisible();
    
    // Check that position data is loaded
    await expect(page.getByTestId('position-row')).toBeVisible();
  });

  test('should filter positions by status', async ({ page }) => {
    // Initially showing all positions
    const initialCount = await page.getByTestId('position-row').count();
    
    // Filter to only show open positions
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByLabel(/status/i).selectOption('open');
    await page.getByRole('button', { name: /apply/i }).click();
    
    // Check that filtered results are shown
    const filteredCount = await page.getByTestId('position-row').count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
    
    // Verify all visible positions show 'open' status
    const statuses = await page.getByTestId('position-status').allTextContents();
    statuses.forEach(status => {
      expect(status.toLowerCase()).toContain('open');
    });
  });

  test('should show position details', async ({ page }) => {
    // Click on the first position to view details
    await page.getByTestId('position-row').first().click();
    
    // Verify position detail view is shown
    await expect(page.getByTestId('position-details')).toBeVisible();
    
    // Check for key position information
    await expect(page.getByText(/entry price/i)).toBeVisible();
    await expect(page.getByText(/current price/i)).toBeVisible();
    await expect(page.getByText(/unrealized p&l/i)).toBeVisible();
  });

  test('should update stop loss for position', async ({ page }) => {
    // Open position details
    await page.getByTestId('position-row').first().click();
    
    // Click edit stop loss
    await page.getByRole('button', { name: /edit stop loss/i }).click();
    
    // Enter new stop loss value
    await page.getByLabel(/stop loss price/i).clear();
    await page.getByLabel(/stop loss price/i).fill('45000');
    
    // Save changes
    await page.getByRole('button', { name: /save/i }).click();
    
    // Verify success message
    await expect(page.getByText(/stop loss updated/i)).toBeVisible();
    
    // Verify the UI shows the updated value
    await expect(page.getByText(/45000/).first()).toBeVisible();
  });

  test('should close position', async ({ page }) => {
    // Find the first position and click the close button
    const firstPosition = page.getByTestId('position-row').first();
    await firstPosition.getByRole('button', { name: /close position/i }).click();
    
    // Confirm in the dialog
    await page.getByRole('dialog').getByRole('button', { name: /confirm/i }).click();
    
    // Verify success message
    await expect(page.getByText(/position closed successfully/i)).toBeVisible();
    
    // Check that the position is now shown as closed or removed from open positions
    await expect(firstPosition).not.toBeVisible();
    
    // Navigate to closed positions and verify our position appears there
    await page.getByRole('tab', { name: /closed positions/i }).click();
    await expect(page.getByTestId('position-row').first()).toBeVisible();
    await expect(page.getByText(/closed/i).first()).toBeVisible();
  });
});
