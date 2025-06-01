/**
 * Hyperliquid Dashboard Integration
 * This script integrates the Hyperliquid tab into the main Trading Farm dashboard
 */

document.addEventListener('DOMContentLoaded', function() {
  // 1. Ensure the Hyperliquid tab is loaded
  loadHyperliquidTab();
  
  // 2. Add click handler for the Hyperliquid menu item
  setupHyperliquidNavigation();
  
  // 3. Integrate ElizaOS with Hyperliquid
  setupElizaOSIntegration();
  
  console.log("Hyperliquid Dashboard Integration initialized");
});

/**
 * Load the Hyperliquid tab content into the dashboard
 */
function loadHyperliquidTab() {
  // Create tab container if it doesn't exist
  if (!document.getElementById('hyperliquid-tab-container')) {
    const mainContent = document.querySelector('.main-content') || document.querySelector('main');
    if (!mainContent) {
      console.error("Cannot find main content container");
      return;
    }
    
    // Create tab container
    const tabContainer = document.createElement('div');
    tabContainer.id = 'hyperliquid-tab-container';
    tabContainer.className = 'tab-content';
    tabContainer.style.display = 'none'; // Hide initially
    
    // Load the tab content from the template
    fetch('/templates/hyperliquid_tab.html')
      .then(response => response.text())
      .then(html => {
        tabContainer.innerHTML = html;
        mainContent.appendChild(tabContainer);
        
        // Load styles
        loadStyles();
        
        console.log("Hyperliquid tab loaded");
      })
      .catch(error => {
        console.error("Error loading Hyperliquid tab:", error);
        // Fallback: Create simple tab content
        tabContainer.innerHTML = `
          <div id="hyperliquid-tab" class="dashboard-tab-content">
            <div class="dashboard-header">
              <h2>Hyperliquid Trading</h2>
              <div class="dashboard-header-actions">
                <span class="badge simulation-badge" id="hyperliquid-connection-status">Simulation Mode</span>
              </div>
            </div>
            <div class="dashboard-message">
              <p>Hyperliquid integration is ready. Initialize the dashboard to begin trading.</p>
              <button id="initialize-hyperliquid" class="btn btn-primary">Initialize Hyperliquid</button>
            </div>
          </div>
        `;
        mainContent.appendChild(tabContainer);
        
        // Add click handler for initialize button
        document.getElementById('initialize-hyperliquid').addEventListener('click', function() {
          window.hyperliquidModule.initialize();
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
 * Setup click handlers for Hyperliquid navigation
 */
function setupHyperliquidNavigation() {
  // Find the Hyperliquid menu item in the sidebar
  // This works with the existing dashboard structure shown in the screenshot
  const hyperliquidMenuItem = document.querySelector('a[href="#hyperliquid"], [data-section="hyperliquid"]') ||
                           document.getElementById('hyperliquid-nav');
  
  if (!hyperliquidMenuItem) {
    // The menu item doesn't exist, so create it
    addHyperliquidMenuItem();
  } else {
    // The menu item exists, add click handler
    hyperliquidMenuItem.addEventListener('click', showHyperliquidTab);
  }
}

/**
 * Add the Hyperliquid menu item to the navigation
 */
function addHyperliquidMenuItem() {
  // First try to find the Protocols section in the sidebar
  const protocolsSection = Array.from(document.querySelectorAll('.sidebar-heading, .section-heading')).find(el => 
    el.textContent.trim().toLowerCase() === 'protocols'
  );
  
  if (protocolsSection) {
    // Find the Hyperliquid item under Protocols, or create it if it doesn't exist
    const protocolsList = protocolsSection.nextElementSibling;
    
    if (protocolsList && (protocolsList.tagName === 'UL' || protocolsList.classList.contains('menu-list'))) {
      // Check if Hyperliquid item already exists
      const existingItem = Array.from(protocolsList.querySelectorAll('li a')).find(a => 
        a.textContent.trim().toLowerCase() === 'hyperliquid'
      );
      
      if (!existingItem) {
        // Create new item
        const newItem = document.createElement('li');
        newItem.innerHTML = `
          <a href="#" id="hyperliquid-nav" data-section="hyperliquid">
            <i class="icon icon-hyperliquid"></i>
            <span>Hyperliquid</span>
          </a>
        `;
        protocolsList.appendChild(newItem);
        
        // Add click handler
        document.getElementById('hyperliquid-nav').addEventListener('click', showHyperliquidTab);
      }
    }
  } else {
    console.warn("Protocols section not found in the sidebar");
  }
}

/**
 * Show the Hyperliquid tab and hide other tabs
 */
function showHyperliquidTab(e) {
  if (e) e.preventDefault();
  
  // Hide all other tab content
  document.querySelectorAll('.tab-content, .dashboard-section').forEach(el => {
    el.style.display = 'none';
  });
  
  // Show Hyperliquid tab
  const hyperliquidTab = document.getElementById('hyperliquid-tab-container');
  if (hyperliquidTab) {
    hyperliquidTab.style.display = 'block';
    
    // Initialize the Hyperliquid module if not already initialized
    if (window.hyperliquidModule && !window.hyperliquidModule.initialized) {
      window.hyperliquidModule.initialize();
    }
  }
  
  // Update active state in navigation
  document.querySelectorAll('.sidebar-menu a, .is-active').forEach(el => {
    el.classList.remove('is-active', 'active');
  });
  
  const hyperliquidNav = document.querySelector('a[href="#hyperliquid"], [data-section="hyperliquid"], #hyperliquid-nav');
  if (hyperliquidNav) {
    hyperliquidNav.classList.add('is-active', 'active');
  }
}

/**
 * Setup ElizaOS integration with Hyperliquid
 */
function setupElizaOSIntegration() {
  // Find the ElizaOS terminal in the Master Command Center
  const elizaOSTerminal = document.querySelector('.elizaos-terminal, #elizaos-terminal');
  
  if (elizaOSTerminal) {
    // Add Hyperliquid-specific commands to ElizaOS
    const hyperliquidCommands = [
      "analyze ETH market",
      "predict ETH price",
      "execute market buy 0.1 ETH",
      "check Hyperliquid positions",
      "optimize ETH trading strategy"
    ];
    
    // Add command suggestions to the terminal
    const commandSuggestions = document.createElement('div');
    commandSuggestions.className = 'elizaos-hyperliquid-commands';
    commandSuggestions.innerHTML = `
      <div class="elizaos-suggestion">
        <strong>Hyperliquid Commands:</strong>
        <ul>
          ${hyperliquidCommands.map(cmd => `<li><a href="#" class="elizaos-command-link">${cmd}</a></li>`).join('')}
        </ul>
      </div>
    `;
    
    // Insert after the terminal
    if (elizaOSTerminal.nextElementSibling) {
      elizaOSTerminal.parentNode.insertBefore(commandSuggestions, elizaOSTerminal.nextElementSibling);
    } else {
      elizaOSTerminal.parentNode.appendChild(commandSuggestions);
    }
    
    // Add click handlers for command links
    document.querySelectorAll('.elizaos-command-link').forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Find the ElizaOS input and submit button
        const elizaOSInput = document.querySelector('.elizaos-input, #elizaos-input');
        const elizaOSSubmit = document.querySelector('.elizaos-submit, #elizaos-submit');
        
        if (elizaOSInput && elizaOSSubmit) {
          // Set the command in the input and trigger submit
          elizaOSInput.value = this.textContent;
          elizaOSSubmit.click();
        } else if (elizaOSTerminal) {
          // Directly add the command to the terminal
          const commandDiv = document.createElement('div');
          commandDiv.textContent = `> ${this.textContent}`;
          elizaOSTerminal.appendChild(commandDiv);
          
          // Process the command
          processElizaOSCommand(this.textContent);
        }
      });
    });
  }
}

/**
 * Process an ElizaOS command
 */
function processElizaOSCommand(command) {
  if (!window.hyperliquidModule) {
    console.error("Hyperliquid module not available");
    return;
  }
  
  const elizaOSTerminal = document.querySelector('.elizaos-terminal, #elizaos-terminal');
  if (!elizaOSTerminal) return;
  
  setTimeout(() => {
    const responseDiv = document.createElement('div');
    const commandLower = command.toLowerCase();
    
    if (commandLower.includes('analyze') && commandLower.includes('eth')) {
      responseDiv.textContent = `> ETH analysis: Current price $3245.67, 24h change +2.5%, Market sentiment: Bullish`;
    } else if (commandLower.includes('predict') && commandLower.includes('eth')) {
      responseDiv.textContent = `> ETH price prediction: Upward trend expected over next 24h, target $3300-3350`;
    } else if (commandLower.includes('execute') && commandLower.includes('buy') && commandLower.includes('eth')) {
      responseDiv.textContent = `> Executing market buy order for ETH...`;
      
      // Extract the size from the command
      const sizeMatch = command.match(/\d+\.?\d*/);
      const size = sizeMatch ? parseFloat(sizeMatch[0]) : 0.1;
      
      // Simulate placing the order
      window.hyperliquidModule.placeOrder(true);
      
      setTimeout(() => {
        const confirmDiv = document.createElement('div');
        confirmDiv.textContent = `> Order executed: BUY ${size} ETH at $3245.67`;
        elizaOSTerminal.appendChild(confirmDiv);
        elizaOSTerminal.scrollTop = elizaOSTerminal.scrollHeight;
      }, 1000);
    } else if (commandLower.includes('check') && commandLower.includes('position')) {
      responseDiv.textContent = `> Current positions: 0.1 ETH LONG at $3245.67, unrealized P/L: $0.00`;
    } else if (commandLower.includes('optimize') && commandLower.includes('eth')) {
      responseDiv.textContent = `> Strategy optimization for ETH: Recommended parameters - Entry: 3200-3250, Exit: 3350-3400, Stop loss: 3150`;
    } else {
      responseDiv.textContent = `> Command processed. See Hyperliquid tab for details.`;
    }
    
    elizaOSTerminal.appendChild(responseDiv);
    elizaOSTerminal.scrollTop = elizaOSTerminal.scrollHeight;
  }, 500);
}
