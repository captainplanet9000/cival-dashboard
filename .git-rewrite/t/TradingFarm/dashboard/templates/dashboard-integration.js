/**
 * Hyperliquid Dashboard Integration
 * This script integrates the Hyperliquid directly into the Master Control Panel
 */

document.addEventListener('DOMContentLoaded', function() {
  // 1. Embed Hyperliquid in the Master Control Panel
  embedHyperliquidInMasterControlPanel();
  
  // 2. Setup ElizaOS integration with Hyperliquid
  setupElizaOSIntegration();
  
  console.log("Hyperliquid Dashboard Integration initialized");
});

/**
 * Embed Hyperliquid directly in the Master Control Panel
 */
function embedHyperliquidInMasterControlPanel() {
  // Find the Master Control Panel container
  const masterControlPanel = document.querySelector('.master-control-panel') || document.getElementById('master-control-panel');
  
  if (!masterControlPanel) {
    console.error("Cannot find Master Control Panel container");
    return;
  }
  
  // Create the Hyperliquid Panel if it doesn't exist
  if (!document.getElementById('hyperliquid-exchange-panel')) {
    // Load the Hyperliquid panel content
    fetch('/templates/hyperliquid_panel.html')
      .then(response => response.text())
      .then(html => {
        // Create panel container
        const hyperliquidPanel = document.createElement('div');
        hyperliquidPanel.className = 'control-panel-section';
        hyperliquidPanel.id = 'hyperliquid-exchange-panel';
        
        // Insert the panel after Strategy Control section
        const strategyControl = masterControlPanel.querySelector('.strategy-control') || 
                               document.getElementById('strategy-control');
        
        if (strategyControl) {
          // Find the control sections and insert after the first one (Strategy Control)
          const controlSections = masterControlPanel.querySelectorAll('.control-panel-section');
          if (controlSections.length > 0) {
            strategyControl.parentNode.insertBefore(hyperliquidPanel, controlSections[1]);
          } else {
            masterControlPanel.appendChild(hyperliquidPanel);
          }
        } else {
          // Insert at the beginning if strategy control not found
          masterControlPanel.insertBefore(hyperliquidPanel, masterControlPanel.firstChild);
        }
        
        // Set the content
        hyperliquidPanel.innerHTML = `
          <h3 class="panel-header">
            <i class="fas fa-exchange-alt"></i> Hyperliquid Exchange
            <span class="status-badge simulation-mode">Simulation Mode</span>
          </h3>
          <div class="panel-content">
            <div class="account-info">
              <div class="account-card">
                <div class="account-value">$10,000.00</div>
                <div class="account-label">Account Value</div>
              </div>
              <div class="account-card">
                <div class="collateral-value">$9,967.54</div>
                <div class="account-label">Free Collateral</div>
              </div>
              <div class="account-card">
                <div class="margin-value">$32.46</div>
                <div class="account-label">Margin Used</div>
              </div>
            </div>
            
            <h4>Active Positions</h4>
            <div class="positions-table">
              <table>
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Position</th>
                    <th>Entry Price</th>
                    <th>Current Price</th>
                    <th>Unrealized P/L</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="positions-table-body">
                  <tr class="position-row">
                    <td>ETH</td>
                    <td>0.1 (LONG)</td>
                    <td>$3,245.67</td>
                    <td>$3,245.67</td>
                    <td>$0.00 (0.00%)</td>
                    <td><button class="btn btn-danger btn-sm close-position-btn">Close</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h4>Place Order</h4>
            <div class="order-form">
              <div class="form-row">
                <select id="asset-select" class="form-control">
                  <option value="ETH">ETH</option>
                  <option value="BTC">BTC</option>
                  <option value="SOL">SOL</option>
                  <option value="ARB">ARB</option>
                </select>
                <select id="order-type" class="form-control">
                  <option value="market">Market</option>
                  <option value="limit">Limit</option>
                </select>
              </div>
              <div class="form-row">
                <input type="number" id="order-price" class="form-control" placeholder="Price" disabled>
                <input type="number" id="order-size" class="form-control" placeholder="Size" step="0.01" min="0.01">
              </div>
              <div class="form-row action-buttons">
                <button id="buy-btn" class="btn btn-success">BUY / LONG</button>
                <button id="sell-btn" class="btn btn-danger">SELL / SHORT</button>
              </div>
            </div>
            
            <h4>Recent Transactions</h4>
            <div class="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Side</th>
                    <th>Size</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody id="transactions-table-body">
                  <tr class="transaction-row">
                    <td>13:17:37</td>
                    <td>ETH</td>
                    <td>Market</td>
                    <td>BUY</td>
                    <td>0.1</td>
                    <td>$3,245.67</td>
                    <td>$324.57</td>
                    <td><span class="badge badge-success">Filled</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        `;
        
        // Initialize Hyperliquid data
        initializeHyperliquidData();
        
        // Add event listeners for order form
        document.getElementById('buy-btn').addEventListener('click', () => placeBuyOrder());
        document.getElementById('sell-btn').addEventListener('click', () => placeSellOrder());
        
        // Load styles
        loadStyles();
        
        console.log("Hyperliquid embedded in Master Control Panel");
      })
      .catch(error => {
        console.error("Error loading Hyperliquid panel:", error);
        // Create a simple panel as fallback
        const hyperliquidPanel = document.createElement('div');
        hyperliquidPanel.className = 'control-panel-section';
        hyperliquidPanel.id = 'hyperliquid-exchange-panel';
        hyperliquidPanel.innerHTML = `
          <h3 class="panel-header">
            <i class="fas fa-exchange-alt"></i> Hyperliquid Exchange
            <span class="status-badge simulation-mode">Simulation Mode</span>
          </h3>
          <div class="panel-content">
            <div class="dashboard-message">
              <p>Hyperliquid integration is ready. Initialize to begin trading.</p>
              <button id="initialize-hyperliquid" class="btn btn-primary">Initialize Hyperliquid</button>
            </div>
          </div>
        `;
        
        // Insert after Strategy Control if possible
        const strategyControl = masterControlPanel.querySelector('.strategy-control') || 
                               document.getElementById('strategy-control');
        if (strategyControl && strategyControl.nextSibling) {
          masterControlPanel.insertBefore(hyperliquidPanel, strategyControl.nextSibling);
        } else {
          masterControlPanel.appendChild(hyperliquidPanel);
        }
        
        // Add click handler for initialize button
        document.getElementById('initialize-hyperliquid').addEventListener('click', function() {
          initializeHyperliquidData();
        });
      });
  }
}

/**
 * Load the Hyperliquid styles
 */
function loadStyles() {
  if (!document.getElementById('hyperliquid-styles')) {
    const styleLink = document.createElement('link');
    styleLink.id = 'hyperliquid-styles';
    styleLink.rel = 'stylesheet';
    styleLink.href = '/css/hyperliquid-styles.css';
    document.head.appendChild(styleLink);
  }
}

/**
 * Initialize Hyperliquid data from the API
 */
function initializeHyperliquidData() {
  fetch('/api/hyperliquid/data')
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        updateAccountInfo(data.accountData);
        updatePositionsTable(data.positions);
        console.log("Hyperliquid data initialized");
      } else {
        console.error("Failed to initialize Hyperliquid data:", data.error);
      }
    })
    .catch(error => {
      console.error("Error fetching Hyperliquid data:", error);
    });
}

/**
 * Update account information display
 */
function updateAccountInfo(accountData) {
  // Update account value
  const accountValueElement = document.querySelector('.account-value');
  if (accountValueElement) {
    accountValueElement.textContent = `$${accountData.accountValue.toFixed(2)}`;
  }
  
  // Update free collateral
  const collateralElement = document.querySelector('.collateral-value');
  if (collateralElement) {
    collateralElement.textContent = `$${accountData.freeCollateral.toFixed(2)}`;
  }
  
  // Update margin used
  const marginElement = document.querySelector('.margin-value');
  if (marginElement) {
    marginElement.textContent = `$${accountData.marginUsed.toFixed(2)}`;
  }
}

/**
 * Update positions table with current positions
 */
function updatePositionsTable(positions) {
  const positionsTableBody = document.getElementById('positions-table-body');
  if (!positionsTableBody) return;
  
  // Clear existing rows
  positionsTableBody.innerHTML = '';
  
  if (positions.length === 0) {
    // Add a "no positions" row
    const noPositionsRow = document.createElement('tr');
    noPositionsRow.innerHTML = `<td colspan="6" class="no-data">No active positions</td>`;
    positionsTableBody.appendChild(noPositionsRow);
  } else {
    // Add each position
    positions.forEach(position => {
      const row = document.createElement('tr');
      row.className = 'position-row';
      
      // Format P&L with color
      const pnlClass = position.pnl >= 0 ? 'positive-pnl' : 'negative-pnl';
      const pnlFormatted = `$${position.pnl.toFixed(2)} (${position.pnlPercent.toFixed(2)}%)`;
      
      row.innerHTML = `
        <td>${position.asset}</td>
        <td>${position.size} (${position.direction})</td>
        <td>$${position.entryPrice.toFixed(2)}</td>
        <td>$${position.currentPrice.toFixed(2)}</td>
        <td class="${pnlClass}">${pnlFormatted}</td>
        <td><button class="btn btn-danger btn-sm close-position-btn" data-asset="${position.asset}">Close</button></td>
      `;
      
      positionsTableBody.appendChild(row);
      
      // Add click handler for close button
      row.querySelector('.close-position-btn').addEventListener('click', function() {
        closePosition(position.asset, position.size, position.direction === 'LONG');
      });
    });
  }
}

/**
 * Place a buy/long order
 */
function placeBuyOrder() {
  const asset = document.getElementById('asset-select').value;
  const size = parseFloat(document.getElementById('order-size').value);
  
  if (!asset || isNaN(size) || size <= 0) {
    alert('Please enter a valid size');
    return;
  }
  
  fetch('/api/hyperliquid/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      asset: asset,
      size: size,
      isBuy: true
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log(`Successfully placed BUY order for ${size} ${asset}`);
      // Add transaction to the table
      addTransaction(data.transaction);
      // Refresh positions
      setTimeout(initializeHyperliquidData, 1000);
    } else {
      console.error("Failed to place order:", data.error);
      alert(`Failed to place order: ${data.error}`);
    }
  })
  .catch(error => {
    console.error("Error placing order:", error);
    alert(`Error placing order: ${error.message}`);
  });
}

/**
 * Place a sell/short order
 */
function placeSellOrder() {
  const asset = document.getElementById('asset-select').value;
  const size = parseFloat(document.getElementById('order-size').value);
  
  if (!asset || isNaN(size) || size <= 0) {
    alert('Please enter a valid size');
    return;
  }
  
  fetch('/api/hyperliquid/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      asset: asset,
      size: size,
      isBuy: false
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log(`Successfully placed SELL order for ${size} ${asset}`);
      // Add transaction to the table
      addTransaction(data.transaction);
      // Refresh positions
      setTimeout(initializeHyperliquidData, 1000);
    } else {
      console.error("Failed to place order:", data.error);
      alert(`Failed to place order: ${data.error}`);
    }
  })
  .catch(error => {
    console.error("Error placing order:", error);
    alert(`Error placing order: ${error.message}`);
  });
}

/**
 * Close a position
 */
function closePosition(asset, size, isLong) {
  fetch('/api/hyperliquid/order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      asset: asset,
      size: size,
      isBuy: !isLong // Opposite direction to close
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log(`Successfully closed ${asset} position`);
      // Add transaction to the table
      addTransaction(data.transaction);
      // Refresh positions
      setTimeout(initializeHyperliquidData, 1000);
    } else {
      console.error("Failed to close position:", data.error);
      alert(`Failed to close position: ${data.error}`);
    }
  })
  .catch(error => {
    console.error("Error closing position:", error);
    alert(`Error closing position: ${error.message}`);
  });
}

/**
 * Add a transaction to the recent transactions table
 */
function addTransaction(transaction) {
  const transactionsTableBody = document.getElementById('transactions-table-body');
  if (!transactionsTableBody) return;
  
  // Create a new row
  const row = document.createElement('tr');
  row.className = 'transaction-row';
  
  // Format the price and total
  const formattedPrice = `$${parseFloat(transaction.price).toFixed(2)}`;
  const formattedTotal = `$${parseFloat(transaction.total).toFixed(2)}`;
  
  // Create the row HTML
  row.innerHTML = `
    <td>${transaction.time}</td>
    <td>${transaction.asset}</td>
    <td>${transaction.type}</td>
    <td>${transaction.side}</td>
    <td>${transaction.size}</td>
    <td>${formattedPrice}</td>
    <td>${formattedTotal}</td>
    <td><span class="badge badge-${transaction.status === 'Filled' ? 'success' : 'warning'}">${transaction.status}</span></td>
  `;
  
  // Add to the beginning of the table
  if (transactionsTableBody.firstChild) {
    transactionsTableBody.insertBefore(row, transactionsTableBody.firstChild);
  } else {
    transactionsTableBody.appendChild(row);
  }
  
  // Limit to 10 most recent transactions
  while (transactionsTableBody.children.length > 10) {
    transactionsTableBody.removeChild(transactionsTableBody.lastChild);
  }
}

/**
 * Setup ElizaOS integration with Hyperliquid
 */
function setupElizaOSIntegration() {
  // Find ElizaOS console elements
  const elizaOSConsole = document.querySelector('.elizaos-console') || 
                       document.getElementById('elizaos-console');
  
  if (!elizaOSConsole) {
    console.warn("ElizaOS console not found, integration may be limited");
    return;
  }
  
  // Add Hyperliquid-specific commands to ElizaOS
  const hyperliquidCommands = [
    "analyze hyperliquid markets",
    "place hyperliquid order",
    "check hyperliquid positions",
    "execute trend analysis on ETH",
    "optimize hyperliquid strategy"
  ];
  
  // Find or create suggestion container
  let suggestionContainer = elizaOSConsole.querySelector('.command-suggestions');
  if (!suggestionContainer) {
    suggestionContainer = document.createElement('div');
    suggestionContainer.className = 'command-suggestions';
    elizaOSConsole.appendChild(suggestionContainer);
  }
  
  // Add Hyperliquid command suggestions
  hyperliquidCommands.forEach(command => {
    if (!suggestionContainer.querySelector(`[data-command="${command}"]`)) {
      const suggestion = document.createElement('button');
      suggestion.className = 'command-suggestion';
      suggestion.setAttribute('data-command', command);
      suggestion.textContent = command;
      suggestion.addEventListener('click', function() {
        // Find the input and send the command
        const input = elizaOSConsole.querySelector('input[type="text"]');
        if (input) {
          input.value = command;
          
          // Try to find and trigger the send button
          const sendButton = elizaOSConsole.querySelector('button[type="submit"]') || 
                           elizaOSConsole.querySelector('.send-btn');
          if (sendButton) {
            sendButton.click();
          } else {
            // Manually dispatch input event
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
            // Try to submit the form
            const form = input.closest('form');
            if (form) {
              form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
          }
        }
      });
      suggestionContainer.appendChild(suggestion);
    }
  });
  
  // Monitor ElizaOS output for Hyperliquid commands
  const outputContainer = elizaOSConsole.querySelector('.output-container') || 
                       elizaOSConsole.querySelector('.console-output');
  
  if (outputContainer) {
    // Create observer to watch for new commands
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          // Check the added nodes for command text
          mutation.addedNodes.forEach(function(node) {
            if (node.textContent && node.textContent.toLowerCase().includes('hyperliquid')) {
              processElizaOSCommand(node.textContent);
            }
          });
        }
      });
    });
    
    // Start observing
    observer.observe(outputContainer, { childList: true, subtree: true });
  }
}

/**
 * Process an ElizaOS command related to Hyperliquid
 */
function processElizaOSCommand(command) {
  command = command.toLowerCase();
  
  // Process different command types
  if (command.includes('place') && command.includes('order')) {
    // Extract asset and direction if possible
    let asset = 'ETH'; // Default
    let isBuy = true;
    let size = 0.1;
    
    // Try to extract asset
    const assets = ['btc', 'eth', 'sol', 'arb', 'atom'];
    for (const a of assets) {
      if (command.includes(a)) {
        asset = a.toUpperCase();
        break;
      }
    }
    
    // Try to extract direction
    if (command.includes('sell') || command.includes('short')) {
      isBuy = false;
    }
    
    // Try to extract size
    const sizeMatch = command.match(/(\d+(\.\d+)?)/);
    if (sizeMatch) {
      size = parseFloat(sizeMatch[1]);
    }
    
    // Place the order through the API
    fetch('/api/hyperliquid/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        asset: asset,
        size: size,
        isBuy: isBuy
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        console.log(`Successfully placed ${isBuy ? 'BUY' : 'SELL'} order for ${size} ${asset} via ElizaOS`);
        // Send confirmation back to ElizaOS
        sendElizaOSResponse(`Order executed: ${isBuy ? 'BUY' : 'SELL'} ${size} ${asset}`);
        // Refresh data
        setTimeout(initializeHyperliquidData, 1000);
      } else {
        sendElizaOSResponse(`Failed to place order: ${data.error}`);
      }
    })
    .catch(error => {
      sendElizaOSResponse(`Error placing order: ${error.message}`);
    });
  } 
  else if (command.includes('check') && command.includes('position')) {
    // Refresh positions data and report back
    fetch('/api/hyperliquid/data')
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          updatePositionsTable(data.positions);
          
          // Send report to ElizaOS
          let responseText = 'Current positions:\n';
          if (data.positions.length === 0) {
            responseText += 'No active positions';
          } else {
            data.positions.forEach(position => {
              responseText += `${position.size} ${position.asset} (${position.direction}) - Entry: $${position.entryPrice.toFixed(2)}, Current: $${position.currentPrice.toFixed(2)}, P&L: $${position.pnl.toFixed(2)} (${position.pnlPercent.toFixed(2)}%)\n`;
            });
          }
          
          sendElizaOSResponse(responseText);
        } else {
          sendElizaOSResponse(`Failed to check positions: ${data.error}`);
        }
      })
      .catch(error => {
        sendElizaOSResponse(`Error checking positions: ${error.message}`);
      });
  }
  else if (command.includes('analyze') || command.includes('analysis')) {
    // Simulate market analysis response
    setTimeout(() => {
      sendElizaOSResponse(`Market analysis complete. ETH shows strong support at $3,100 with resistance at $3,400. MACD indicates potential uptrend forming. RSI at 58, approaching overbought territory but still has room to run.`);
    }, 1500);
  }
}

/**
 * Send a response to the ElizaOS console
 */
function sendElizaOSResponse(message) {
  // Try to find the ElizaOS output container
  const outputContainer = document.querySelector('.elizaos-console .output-container') || 
                       document.querySelector('.console-output') ||
                       document.getElementById('elizaos-output');
  
  if (!outputContainer) {
    console.warn("Could not find ElizaOS output container");
    return;
  }
  
  // Create a new response line
  const responseLine = document.createElement('div');
  responseLine.className = 'response-line';
  responseLine.innerHTML = `> ${message.replace(/\n/g, '<br>')}`;
  
  // Style it as a system message
  responseLine.style.color = '#4CAF50';
  
  // Add to the output
  outputContainer.appendChild(responseLine);
  
  // Scroll to bottom
  outputContainer.scrollTop = outputContainer.scrollHeight;
  
  // Also send to the API if possible
  fetch('/api/hyperliquid/elizaos/response', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      response: message
    })
  }).catch(err => {
    console.warn("Could not send response to ElizaOS API:", err);
  });
}
