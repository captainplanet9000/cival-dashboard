/**
 * Hyperliquid Integration Module
 * Integrates Hyperliquid exchange functionality with the Trading Farm dashboard
 */

class HyperliquidModule {
  constructor() {
    this.simulationMode = true;
    this.initialized = false;
    this.positions = [];
    this.transactions = [];
    this.marketData = {};
    this.accountData = {
      accountValue: 10000.00,
      freeCollateral: 9967.54,
      marginUsed: 32.46
    };
    
    // Initial ETH position from our test
    this.positions.push({
      asset: 'ETH',
      size: 0.1,
      direction: 'LONG',
      entryPrice: 3245.67,
      currentPrice: 3245.67,
      pnl: 0.00,
      pnlPercent: 0.00
    });
    
    // Initial transaction from our test
    this.transactions.push({
      time: '13:17:37',
      asset: 'ETH',
      type: 'Market',
      side: 'BUY',
      size: 0.1,
      price: 3245.67,
      total: 324.57,
      fee: 0.16,
      status: 'Filled',
      orderId: 'd70f4565-579c-41f6-b299-390513ab12d9',
      timestamp: '2025-03-14T13:17:37.284425'
    });
  }

  /**
   * Initialize the Hyperliquid module
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log("Initializing Hyperliquid module");
    
    // Register event listeners
    this.registerEventListeners();
    
    // Fetch initial data
    await this.fetchData();
    
    // Update UI with initial data
    this.updateUI();
    
    this.initialized = true;
    console.log("Hyperliquid module initialized");
    
    // Send notification to ElizaOS
    this.notifyElizaOS("Hyperliquid module initialized");
  }
  
  /**
   * Register event listeners for UI interactions
   */
  registerEventListeners() {
    // Refresh button
    document.getElementById('refresh-hyperliquid-data').addEventListener('click', () => {
      this.fetchData();
    });
    
    // Order type change
    document.getElementById('hl-order-type').addEventListener('change', (e) => {
      const priceInput = document.getElementById('hl-price');
      if (e.target.value === 'limit') {
        priceInput.disabled = false;
        priceInput.value = this.getAssetPrice(document.getElementById('hl-asset').value);
      } else {
        priceInput.disabled = true;
        priceInput.value = '';
      }
    });
    
    // Asset selection change
    document.getElementById('hl-asset').addEventListener('change', (e) => {
      const priceInput = document.getElementById('hl-price');
      if (document.getElementById('hl-order-type').value === 'limit') {
        priceInput.value = this.getAssetPrice(e.target.value);
      }
    });
    
    // Buy button
    document.getElementById('hl-buy-button').addEventListener('click', () => {
      this.placeOrder(true);
    });
    
    // Sell button
    document.getElementById('hl-sell-button').addEventListener('click', () => {
      this.placeOrder(false);
    });
  }
  
  /**
   * Fetch data from the Hyperliquid API
   */
  async fetchData() {
    console.log("Fetching Hyperliquid data");
    
    if (this.simulationMode) {
      // Simulate API response
      await this.simulateFetchData();
      return;
    }
    
    try {
      // In a real implementation, this would make actual API calls
      // to the Python backend which would call the Hyperliquid API
      const response = await fetch('/api/hyperliquid/data');
      const data = await response.json();
      
      this.updateDataFromResponse(data);
    } catch (error) {
      console.error("Error fetching Hyperliquid data:", error);
      // Fallback to simulation if API call fails
      await this.simulateFetchData();
    }
  }
  
  /**
   * Simulate API response for testing
   */
  async simulateFetchData() {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Update market data with simulated values
    this.marketData = {
      ETH: { price: 3245.67, change24h: 2.5 },
      BTC: { price: 57890.12, change24h: 1.8 },
      SOL: { price: 123.45, change24h: 3.2 },
      ATOM: { price: 8.76, change24h: -1.3 }
    };
    
    // Update positions with current prices
    this.positions.forEach(position => {
      position.currentPrice = this.marketData[position.asset].price;
      
      // Calculate PnL
      if (position.direction === 'LONG') {
        position.pnl = (position.currentPrice - position.entryPrice) * position.size;
      } else {
        position.pnl = (position.entryPrice - position.currentPrice) * position.size;
      }
      
      position.pnlPercent = (position.pnl / (position.entryPrice * position.size)) * 100;
    });
    
    // Update UI with new data
    this.updateUI();
  }
  
  /**
   * Update the UI with current data
   */
  updateUI() {
    // Update account information
    document.getElementById('hyperliquid-account-value').textContent = `$${this.accountData.accountValue.toFixed(2)}`;
    document.getElementById('hyperliquid-free-collateral').textContent = `$${this.accountData.freeCollateral.toFixed(2)}`;
    document.getElementById('hyperliquid-margin-used').textContent = `$${this.accountData.marginUsed.toFixed(2)}`;
    
    // Update position table
    this.updatePositionsTable();
    
    // Update transactions table
    this.updateTransactionsTable();
    
    // Update simulation mode badge
    const statusBadge = document.getElementById('hyperliquid-connection-status');
    statusBadge.textContent = this.simulationMode ? 'Simulation Mode' : 'Connected';
    statusBadge.className = this.simulationMode ? 'badge simulation-badge' : 'badge connected-badge';
  }
  
  /**
   * Update the positions table
   */
  updatePositionsTable() {
    const tableBody = document.getElementById('hyperliquid-positions-table').querySelector('tbody');
    const noPositionsRow = document.getElementById('no-positions-row');
    
    // Clear existing rows except the "no positions" row
    Array.from(tableBody.children).forEach(child => {
      if (child.id !== 'no-positions-row') {
        tableBody.removeChild(child);
      }
    });
    
    if (this.positions.length === 0) {
      noPositionsRow.style.display = '';
      return;
    }
    
    // Hide the "no positions" row
    noPositionsRow.style.display = 'none';
    
    // Add position rows
    this.positions.forEach(position => {
      const row = document.createElement('tr');
      row.className = position.pnl >= 0 ? 'position-row-profit' : 'position-row-loss';
      
      row.innerHTML = `
        <td>${position.asset}</td>
        <td>${position.size} (${position.direction})</td>
        <td>$${position.entryPrice.toFixed(2)}</td>
        <td>$${position.currentPrice.toFixed(2)}</td>
        <td>$${position.pnl.toFixed(2)} (${position.pnlPercent.toFixed(2)}%)</td>
        <td>
          <button class="btn btn-sm btn-danger close-position-btn" data-asset="${position.asset}">Close</button>
        </td>
      `;
      
      tableBody.appendChild(row);
    });
    
    // Add event listeners to close position buttons
    document.querySelectorAll('.close-position-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const asset = e.target.getAttribute('data-asset');
        this.closePosition(asset);
      });
    });
  }
  
  /**
   * Update the transactions table
   */
  updateTransactionsTable() {
    const tableBody = document.getElementById('hyperliquid-transactions-table').querySelector('tbody');
    const noTransactionsRow = document.getElementById('no-transactions-row');
    
    // Clear existing rows except the "no transactions" row
    Array.from(tableBody.children).forEach(child => {
      if (child.id !== 'no-transactions-row') {
        tableBody.removeChild(child);
      }
    });
    
    if (this.transactions.length === 0) {
      noTransactionsRow.style.display = '';
      return;
    }
    
    // Hide the "no transactions" row
    noTransactionsRow.style.display = 'none';
    
    // Add transaction rows
    this.transactions.forEach(tx => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${tx.time}</td>
        <td>${tx.asset}</td>
        <td>${tx.type}</td>
        <td>${tx.side}</td>
        <td>${tx.size}</td>
        <td>$${tx.price.toFixed(2)}</td>
        <td>$${tx.total.toFixed(2)}</td>
        <td><span class="badge ${tx.status === 'Filled' ? 'success-badge' : 'pending-badge'}">${tx.status}</span></td>
      `;
      
      tableBody.appendChild(row);
    });
  }
  
  /**
   * Place an order
   */
  placeOrder(isBuy) {
    const asset = document.getElementById('hl-asset').value;
    const orderType = document.getElementById('hl-order-type').value;
    const size = parseFloat(document.getElementById('hl-size').value);
    let price = orderType === 'limit' ? parseFloat(document.getElementById('hl-price').value) : this.getAssetPrice(asset);
    
    if (isNaN(size) || size <= 0) {
      alert('Please enter a valid size');
      return;
    }
    
    if (orderType === 'limit' && (isNaN(price) || price <= 0)) {
      alert('Please enter a valid price');
      return;
    }
    
    console.log(`Placing ${isBuy ? 'buy' : 'sell'} order for ${size} ${asset} at ${price}`);
    
    if (this.simulationMode) {
      this.simulatePlaceOrder(asset, orderType, size, price, isBuy);
      return;
    }
    
    // In a real implementation, this would make an actual API call
    fetch('/api/hyperliquid/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        asset,
        orderType,
        size,
        price,
        isBuy
      })
    })
    .then(response => response.json())
    .then(data => {
      this.updateDataFromResponse(data);
      this.updateUI();
      this.notifyElizaOS(`Order placed: ${isBuy ? 'BUY' : 'SELL'} ${size} ${asset}`);
    })
    .catch(error => {
      console.error("Error placing order:", error);
      alert('Error placing order. Please try again.');
    });
  }
  
  /**
   * Simulate placing an order
   */
  simulatePlaceOrder(asset, orderType, size, price, isBuy) {
    // Generate order ID
    const orderId = Math.random().toString(36).substring(2, 15);
    
    // Calculate total and fee
    const total = price * size;
    const fee = total * 0.0005; // 0.05% fee
    
    // Create transaction record
    const now = new Date();
    const formattedTime = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
    
    const transaction = {
      time: formattedTime,
      asset: asset,
      type: orderType === 'market' ? 'Market' : 'Limit',
      side: isBuy ? 'BUY' : 'SELL',
      size: size,
      price: price,
      total: total,
      fee: fee,
      status: 'Filled',
      orderId: orderId,
      timestamp: now.toISOString()
    };
    
    // Add to transactions
    this.transactions.unshift(transaction);
    
    // Update position
    const existingPosition = this.positions.find(p => p.asset === asset);
    
    if (existingPosition) {
      if ((existingPosition.direction === 'LONG' && isBuy) || 
          (existingPosition.direction === 'SHORT' && !isBuy)) {
        // Increasing position
        const newSize = existingPosition.size + size;
        const newEntryPrice = ((existingPosition.entryPrice * existingPosition.size) + (price * size)) / newSize;
        
        existingPosition.size = newSize;
        existingPosition.entryPrice = newEntryPrice;
      } else {
        // Decreasing or flipping position
        if (existingPosition.size > size) {
          // Decreasing
          existingPosition.size -= size;
        } else if (existingPosition.size < size) {
          // Flipping
          existingPosition.direction = isBuy ? 'LONG' : 'SHORT';
          existingPosition.size = size - existingPosition.size;
          existingPosition.entryPrice = price;
        } else {
          // Closing
          this.positions = this.positions.filter(p => p.asset !== asset);
        }
      }
    } else {
      // New position
      this.positions.push({
        asset: asset,
        size: size,
        direction: isBuy ? 'LONG' : 'SHORT',
        entryPrice: price,
        currentPrice: price,
        pnl: 0,
        pnlPercent: 0
      });
    }
    
    // Update account data
    this.accountData.marginUsed += total / 10; // Assuming 10x leverage
    this.accountData.freeCollateral = this.accountData.accountValue - this.accountData.marginUsed;
    
    // Update UI
    this.updateUI();
    
    // Notify ElizaOS
    this.notifyElizaOS(`Order executed: ${isBuy ? 'BUY' : 'SELL'} ${size} ${asset} at $${price}`);
    
    return {
      success: true,
      orderId: orderId,
      transaction: transaction
    };
  }
  
  /**
   * Close a position
   */
  closePosition(asset) {
    const position = this.positions.find(p => p.asset === asset);
    
    if (!position) {
      console.error(`Position for ${asset} not found`);
      return;
    }
    
    // Place an order to close the position
    this.placeOrder(position.direction === 'SHORT');
  }
  
  /**
   * Get the current price for an asset
   */
  getAssetPrice(asset) {
    return this.marketData[asset]?.price || 0;
  }
  
  /**
   * Update data from API response
   */
  updateDataFromResponse(data) {
    if (data.accountData) {
      this.accountData = data.accountData;
    }
    
    if (data.positions) {
      this.positions = data.positions;
    }
    
    if (data.transactions) {
      this.transactions = data.transactions;
    }
    
    if (data.marketData) {
      this.marketData = data.marketData;
    }
  }
  
  /**
   * Send notification to ElizaOS
   */
  notifyElizaOS(message) {
    // In a real implementation, this would send a message to ElizaOS
    console.log(`ElizaOS notification: ${message}`);
    
    // Add message to ElizaOS terminal if it exists
    const elizaOSTerminal = document.querySelector('.elizaos-terminal');
    if (elizaOSTerminal) {
      const div = document.createElement('div');
      div.textContent = `> ${message}`;
      elizaOSTerminal.appendChild(div);
      elizaOSTerminal.scrollTop = elizaOSTerminal.scrollHeight;
    }
  }
  
  /**
   * Enable or disable simulation mode
   */
  setSimulationMode(enabled) {
    this.simulationMode = enabled;
    this.updateUI();
    this.notifyElizaOS(`Simulation mode ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create global instance
window.hyperliquidModule = new HyperliquidModule();

// Initialize when tab is shown
document.addEventListener('DOMContentLoaded', () => {
  // Check if we should initialize immediately (if tab is visible)
  if (document.getElementById('hyperliquid-tab').style.display !== 'none') {
    window.hyperliquidModule.initialize();
  }
  
  // Add tab change event handler
  document.querySelectorAll('[data-tab-target="hyperliquid"]').forEach(element => {
    element.addEventListener('click', () => {
      window.hyperliquidModule.initialize();
    });
  });
});
