/**
 * Vault Banking System - Frontend JavaScript
 * Provides interactive functionality for the vault banking dashboard
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard components
    initializeDashboard();
    setupEventListeners();
    loadInitialData();
});

// Main dashboard components
const dashboardComponents = {
    // Master Vault components
    masterVault: {
        balancesList: document.getElementById('vault-balances'),
        pendingTransactions: document.getElementById('pending-transactions'),
        createTransactionBtn: document.getElementById('create-transaction-btn'),
        emergencyFreezeBtn: document.getElementById('emergency-freeze-btn'),
        unfreezeBtn: document.getElementById('unfreeze-btn'),
    },
    
    // Agent Wallets components
    agentWallets: {
        agentSelect: document.getElementById('agent-select'),
        walletsList: document.getElementById('agent-wallets'),
        walletDetails: document.getElementById('wallet-details'),
        walletDetailsContent: document.getElementById('wallet-details-content'),
        createWalletBtn: document.getElementById('create-wallet-btn'),
        fundWalletBtn: document.getElementById('fund-wallet-btn'),
    },
    
    // Transfer Network components
    transferNetwork: {
        transferBtn: document.getElementById('transfer-btn'),
        crossChainBtn: document.getElementById('cross-chain-btn'),
        recentTransferList: document.getElementById('recent-transfer-list'),
        bridgeRoutes: document.getElementById('bridge-routes'),
        tabBtns: document.querySelectorAll('.tab-btn'),
        tabContents: document.querySelectorAll('.tab-content'),
    },
    
    // Ledger components
    ledger: {
        generateStatementBtn: document.getElementById('generate-statement-btn'),
        exportBtn: document.getElementById('export-btn'),
        transactionHistoryList: document.getElementById('transaction-history-list'),
        historyFilters: {
            chain: document.getElementById('history-filter-chain'),
            asset: document.getElementById('history-filter-asset'),
            status: document.getElementById('history-filter-status'),
        },
    },
    
    // Analytics components
    analytics: {
        txVolumeChart: document.getElementById('transaction-volume-chart'),
        assetDistributionChart: document.getElementById('asset-distribution-chart'),
        metrics: {
            totalTxVolume: document.getElementById('total-tx-volume'),
            avgTxSize: document.getElementById('avg-tx-size'),
            activeWallets: document.getElementById('active-wallets'),
        },
    },
};

// Modals
const modals = {
    createTransaction: {
        modal: document.getElementById('create-transaction-modal'),
        form: document.getElementById('create-transaction-form'),
        chainSelect: document.getElementById('tx-chain-id'),
        toAddress: document.getElementById('tx-to-address'),
        assetSelect: document.getElementById('tx-asset'),
        amount: document.getElementById('tx-amount'),
        memo: document.getElementById('tx-memo'),
        submitBtn: document.getElementById('submit-transaction-btn'),
    },
    
    createWallet: {
        modal: document.getElementById('create-wallet-modal'),
        form: document.getElementById('create-wallet-form'),
        agentSelect: document.getElementById('wallet-agent-id'),
        name: document.getElementById('wallet-name'),
        type: document.getElementById('wallet-type'),
        purpose: document.getElementById('wallet-purpose'),
        submitBtn: document.getElementById('submit-wallet-btn'),
    },
    
    fundWallet: {
        modal: document.getElementById('fund-wallet-modal'),
        form: document.getElementById('fund-wallet-form'),
        agentSelect: document.getElementById('fund-agent-id'),
        walletSelect: document.getElementById('fund-wallet-id'),
        chainSelect: document.getElementById('fund-chain-id'),
        assetSelect: document.getElementById('fund-asset'),
        amount: document.getElementById('fund-amount'),
        memo: document.getElementById('fund-memo'),
        submitBtn: document.getElementById('submit-fund-btn'),
    },
    
    transfer: {
        modal: document.getElementById('transfer-modal'),
        form: document.getElementById('transfer-form'),
        fromAgentSelect: document.getElementById('transfer-from-agent'),
        toAgentSelect: document.getElementById('transfer-to-agent'),
        chainSelect: document.getElementById('transfer-chain-id'),
        assetSelect: document.getElementById('transfer-asset'),
        amount: document.getElementById('transfer-amount'),
        memo: document.getElementById('transfer-memo'),
        submitBtn: document.getElementById('submit-transfer-btn'),
    },
    
    crossChain: {
        modal: document.getElementById('cross-chain-modal'),
        form: document.getElementById('cross-chain-form'),
        fromAgentSelect: document.getElementById('cc-from-agent'),
        fromChainSelect: document.getElementById('cc-from-chain'),
        toChainSelect: document.getElementById('cc-to-chain'),
        assetSelect: document.getElementById('cc-asset'),
        amount: document.getElementById('cc-amount'),
        toAgentSelect: document.getElementById('cc-to-agent'),
        memo: document.getElementById('cc-memo'),
        submitBtn: document.getElementById('submit-cc-btn'),
    },
    
    approveTx: {
        modal: document.getElementById('approve-tx-modal'),
        form: document.getElementById('approve-tx-form'),
        txDetails: document.getElementById('tx-details'),
        txId: document.getElementById('approve-tx-id'),
        key: document.getElementById('approve-key'),
        notes: document.getElementById('approve-notes'),
        submitBtn: document.getElementById('submit-approve-btn'),
    },
    
    freeze: {
        modal: document.getElementById('freeze-modal'),
        form: document.getElementById('freeze-form'),
        key: document.getElementById('freeze-key'),
        reason: document.getElementById('freeze-reason'),
        submitBtn: document.getElementById('submit-freeze-btn'),
    },
    
    unfreeze: {
        modal: document.getElementById('unfreeze-modal'),
        form: document.getElementById('unfreeze-form'),
        key: document.getElementById('unfreeze-key'),
        reason: document.getElementById('unfreeze-reason'),
        submitBtn: document.getElementById('submit-unfreeze-btn'),
    },
};

/**
 * Initialize dashboard components
 */
function initializeDashboard() {
    // Initialize tab functionality
    dashboardComponents.transferNetwork.tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Reset all tabs
            dashboardComponents.transferNetwork.tabBtns.forEach(b => b.classList.remove('active'));
            dashboardComponents.transferNetwork.tabContents.forEach(c => c.classList.remove('active'));
            
            // Activate selected tab
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
    
    // Initialize ledger tab functionality
    document.querySelectorAll('#ledger-panel .tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Reset all tabs in ledger panel
            document.querySelectorAll('#ledger-panel .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('#ledger-panel .tab-content').forEach(c => c.classList.remove('active'));
            
            // Activate selected tab
            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            // Load analytics data if analytics tab is selected
            if (tabId === 'analytics') {
                loadAnalyticsData();
            }
        });
    });
}

/**
 * Set up event listeners for all interactive elements
 */
function setupEventListeners() {
    // Master Vault event listeners
    dashboardComponents.masterVault.createTransactionBtn.addEventListener('click', openCreateTransactionModal);
    dashboardComponents.masterVault.emergencyFreezeBtn.addEventListener('click', openFreezeModal);
    dashboardComponents.masterVault.unfreezeBtn.addEventListener('click', openUnfreezeModal);
    
    // Agent Wallets event listeners
    dashboardComponents.agentWallets.agentSelect.addEventListener('change', loadAgentWallets);
    dashboardComponents.agentWallets.createWalletBtn.addEventListener('click', openCreateWalletModal);
    dashboardComponents.agentWallets.fundWalletBtn.addEventListener('click', openFundWalletModal);
    
    // Transfer Network event listeners
    dashboardComponents.transferNetwork.transferBtn.addEventListener('click', openTransferModal);
    dashboardComponents.transferNetwork.crossChainBtn.addEventListener('click', openCrossChainModal);
    
    // Ledger event listeners
    dashboardComponents.ledger.generateStatementBtn.addEventListener('click', openGenerateStatementModal);
    dashboardComponents.ledger.exportBtn.addEventListener('click', exportLedgerData);
    Object.values(dashboardComponents.ledger.historyFilters).forEach(filter => {
        filter.addEventListener('change', filterTransactionHistory);
    });
    
    // Modal submit buttons
    modals.createTransaction.submitBtn.addEventListener('click', submitCreateTransaction);
    modals.createWallet.submitBtn.addEventListener('click', submitCreateWallet);
    modals.fundWallet.submitBtn.addEventListener('click', submitFundWallet);
    modals.transfer.submitBtn.addEventListener('click', submitTransfer);
    modals.crossChain.submitBtn.addEventListener('click', submitCrossChainTransfer);
    modals.approveTx.submitBtn.addEventListener('click', submitApproveTransaction);
    modals.freeze.submitBtn.addEventListener('click', submitFreezeVault);
    modals.unfreeze.submitBtn.addEventListener('click', submitUnfreezeVault);
    
    // Agent selection change for fund wallet modal
    modals.fundWallet.agentSelect.addEventListener('change', loadAgentWalletsForFunding);
}

/**
 * Load initial data for dashboard
 */
function loadInitialData() {
    loadVaultBalances();
    loadPendingTransactions();
    loadAgentsList();
    loadRecentTransfers();
    loadBridgeRoutes();
    loadTransactionHistory();
    checkVaultStatus();
}

/**
 * Load vault balances
 */
function loadVaultBalances() {
    const balancesElement = dashboardComponents.masterVault.balancesList;
    balancesElement.innerHTML = '<div class="loading">Loading balances...</div>';
    
    // Fetch vault balances from API
    fetch('/api/vault/balances')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderBalances(balancesElement, data.balances);
            } else {
                balancesElement.innerHTML = `<div class="error">${data.error || 'Failed to load balances'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading vault balances:', error);
            balancesElement.innerHTML = '<div class="error">Failed to load balances</div>';
        });
}

/**
 * Load pending transactions
 */
function loadPendingTransactions() {
    const pendingTxElement = dashboardComponents.masterVault.pendingTransactions;
    pendingTxElement.innerHTML = '<div class="loading">Loading transactions...</div>';
    
    // Fetch pending transactions from API
    fetch('/api/vault/transactions/pending')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderPendingTransactions(pendingTxElement, data.transactions);
            } else {
                pendingTxElement.innerHTML = `<div class="error">${data.error || 'Failed to load transactions'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading pending transactions:', error);
            pendingTxElement.innerHTML = '<div class="error">Failed to load transactions</div>';
        });
}

/**
 * Load agents list
 */
function loadAgentsList() {
    // Fetch agents list from API
    fetch('/api/agents')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateAgentSelects(data.agents);
            } else {
                console.error('Failed to load agents:', data.error);
            }
        })
        .catch(error => {
            console.error('Error loading agents:', error);
        });
}

/**
 * Populate all agent select dropdown elements
 */
function populateAgentSelects(agents) {
    const selects = [
        dashboardComponents.agentWallets.agentSelect,
        modals.createWallet.agentSelect,
        modals.fundWallet.agentSelect,
        modals.transfer.fromAgentSelect,
        modals.transfer.toAgentSelect,
        modals.crossChain.fromAgentSelect,
        modals.crossChain.toAgentSelect
    ];
    
    selects.forEach(select => {
        // Save current selection
        const currentValue = select.value;
        
        // Clear options except first placeholder
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Add agent options
        agents.forEach(agent => {
            const option = document.createElement('option');
            option.value = agent.id;
            option.textContent = agent.name || agent.id;
            select.appendChild(option);
        });
        
        // Restore selected value if it exists in new options
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

// Utility functions for UI rendering
function renderBalances(container, balances) {
    if (!balances || balances.length === 0) {
        container.innerHTML = '<div class="no-data">No balances available</div>';
        return;
    }
    
    let html = '<div class="balances-grid">';
    
    // Group balances by chain
    const balancesByChain = {};
    balances.forEach(balance => {
        if (!balancesByChain[balance.chain_id]) {
            balancesByChain[balance.chain_id] = [];
        }
        balancesByChain[balance.chain_id].push(balance);
    });
    
    // Render balances by chain
    for (const chainId in balancesByChain) {
        html += `
            <div class="chain-balance-card">
                <h4 class="chain-name">${formatChainName(chainId)}</h4>
                <div class="chain-balances">
        `;
        
        balancesByChain[chainId].forEach(balance => {
            html += `
                <div class="balance-item">
                    <span class="asset-name">${balance.asset}</span>
                    <span class="asset-amount">${formatAmount(balance.amount)}</span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

function renderPendingTransactions(container, transactions) {
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="no-data">No pending transactions</div>';
        return;
    }
    
    let html = '<div class="transactions-table">';
    html += `
        <div class="table-header">
            <div class="header-cell">ID</div>
            <div class="header-cell">To</div>
            <div class="header-cell">Amount</div>
            <div class="header-cell">Asset</div>
            <div class="header-cell">Chain</div>
            <div class="header-cell">Created</div>
            <div class="header-cell">Actions</div>
        </div>
    `;
    
    transactions.forEach(tx => {
        html += `
            <div class="table-row">
                <div class="cell tx-id">${shortenId(tx.id)}</div>
                <div class="cell tx-to">${shortenAddress(tx.to_address)}</div>
                <div class="cell tx-amount">${formatAmount(tx.amount)}</div>
                <div class="cell tx-asset">${tx.asset}</div>
                <div class="cell tx-chain">${formatChainName(tx.chain_id)}</div>
                <div class="cell tx-created">${formatDate(tx.created_at)}</div>
                <div class="cell tx-actions">
                    <button class="btn btn-sm btn-success approve-tx-btn" data-tx-id="${tx.id}">Approve</button>
                    <button class="btn btn-sm btn-danger reject-tx-btn" data-tx-id="${tx.id}">Reject</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add event listeners for transaction actions
    container.querySelectorAll('.approve-tx-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const txId = this.dataset.txId;
            openApproveTransactionModal(txId);
        });
    });
    
    container.querySelectorAll('.reject-tx-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const txId = this.dataset.txId;
            openRejectTransactionModal(txId);
        });
    });
}

/**
 * Load agent wallets when an agent is selected
 */
function loadAgentWallets() {
    const agentId = dashboardComponents.agentWallets.agentSelect.value;
    const walletsElement = dashboardComponents.agentWallets.walletsList;
    
    if (!agentId) {
        walletsElement.innerHTML = '<div class="no-agent-selected">Select an agent to view wallets</div>';
        return;
    }
    
    walletsElement.innerHTML = '<div class="loading">Loading wallets...</div>';
    
    // Fetch agent wallets from API
    fetch(`/api/agent/${agentId}/wallets`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderAgentWallets(walletsElement, data.wallets);
            } else {
                walletsElement.innerHTML = `<div class="error">${data.error || 'Failed to load wallets'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading agent wallets:', error);
            walletsElement.innerHTML = '<div class="error">Failed to load wallets</div>';
        });
}

/**
 * Load agent wallets for funding modal
 */
function loadAgentWalletsForFunding() {
    const agentId = modals.fundWallet.agentSelect.value;
    const walletSelect = modals.fundWallet.walletSelect;
    
    // Reset wallet select
    walletSelect.innerHTML = '<option value="">Select a wallet</option>';
    
    if (!agentId) {
        return;
    }
    
    // Fetch agent wallets from API
    fetch(`/api/agent/${agentId}/wallets`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.wallets) {
                data.wallets.forEach(wallet => {
                    const option = document.createElement('option');
                    option.value = wallet.id;
                    option.textContent = wallet.name || wallet.id;
                    walletSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error loading agent wallets for funding:', error);
        });
}

/**
 * Render agent wallets
 */
function renderAgentWallets(container, wallets) {
    if (!wallets || wallets.length === 0) {
        container.innerHTML = '<div class="no-data">No wallets found for this agent</div>';
        return;
    }
    
    let html = '<div class="wallets-grid">';
    
    wallets.forEach(wallet => {
        html += `
            <div class="wallet-card" data-wallet-id="${wallet.id}">
                <div class="wallet-header">
                    <h4 class="wallet-name">${wallet.name || 'Unnamed Wallet'}</h4>
                    <span class="wallet-type">${wallet.wallet_type}</span>
                </div>
                <div class="wallet-body">
                    <div class="wallet-id">ID: ${shortenId(wallet.id)}</div>
                    ${wallet.purpose ? `<div class="wallet-purpose">Purpose: ${wallet.purpose}</div>` : ''}
                    <div class="wallet-created">Created: ${formatDate(wallet.created_at)}</div>
                </div>
                <div class="wallet-actions">
                    <button class="btn btn-sm btn-primary view-wallet-btn" data-wallet-id="${wallet.id}">View Details</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Add event listeners for wallet actions
    container.querySelectorAll('.view-wallet-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const walletId = this.dataset.walletId;
            viewWalletDetails(walletId);
        });
    });
}

/**
 * View wallet details
 */
function viewWalletDetails(walletId) {
    const detailsElement = dashboardComponents.agentWallets.walletDetailsContent;
    dashboardComponents.agentWallets.walletDetails.style.display = 'block';
    detailsElement.innerHTML = '<div class="loading">Loading wallet details...</div>';
    
    // Fetch wallet details from API
    fetch(`/api/wallet/${walletId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderWalletDetails(detailsElement, data.wallet);
            } else {
                detailsElement.innerHTML = `<div class="error">${data.error || 'Failed to load wallet details'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading wallet details:', error);
            detailsElement.innerHTML = '<div class="error">Failed to load wallet details</div>';
        });
}

/**
 * Render wallet details
 */
function renderWalletDetails(container, wallet) {
    let html = `
        <div class="wallet-detail-header">
            <h4>${wallet.name || 'Unnamed Wallet'}</h4>
            <span class="wallet-type-badge ${wallet.wallet_type}">${wallet.wallet_type}</span>
        </div>
        <div class="wallet-detail-body">
            <div class="detail-section">
                <div class="detail-item">
                    <span class="detail-label">Wallet ID:</span>
                    <span class="detail-value">${wallet.id}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Agent ID:</span>
                    <span class="detail-value">${wallet.agent_id}</span>
                </div>
                ${wallet.purpose ? `
                <div class="detail-item">
                    <span class="detail-label">Purpose:</span>
                    <span class="detail-value">${wallet.purpose}</span>
                </div>
                ` : ''}
                <div class="detail-item">
                    <span class="detail-label">Created:</span>
                    <span class="detail-value">${formatDate(wallet.created_at)}</span>
                </div>
            </div>
            
            <div class="detail-section">
                <h5>Permissions</h5>
                <div class="permissions-list">
    `;
    
    // Add permissions
    if (wallet.permissions) {
        for (const [permission, value] of Object.entries(wallet.permissions)) {
            html += `
                <div class="permission-item">
                    <span class="permission-name">${formatPermissionName(permission)}</span>
                    <span class="permission-value ${value ? 'allowed' : 'denied'}">${value ? 'Allowed' : 'Denied'}</span>
                </div>
            `;
        }
    } else {
        html += '<div class="no-data">No permissions defined</div>';
    }
    
    html += `
                </div>
            </div>
            
            <div class="detail-section">
                <h5>Spending Limits</h5>
                <div class="limits-list">
    `;
    
    // Add spending limits
    if (wallet.spending_limits && Object.keys(wallet.spending_limits).length > 0) {
        for (const [asset, limits] of Object.entries(wallet.spending_limits)) {
            html += `
                <div class="limit-item">
                    <div class="limit-asset">${asset}</div>
                    <div class="limit-values">
            `;
            
            for (const [period, amount] of Object.entries(limits)) {
                html += `
                    <div class="limit-period">
                        <span class="period-name">${formatPeriodName(period)}:</span>
                        <span class="period-amount">${formatAmount(amount)}</span>
                    </div>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
        }
    } else {
        html += '<div class="no-data">No spending limits defined</div>';
    }
    
    html += `
                </div>
            </div>
            
            <div class="detail-section">
                <h5>Balances</h5>
                <div class="wallet-balances" id="wallet-${wallet.id}-balances">
                    <div class="loading">Loading balances...</div>
                </div>
            </div>
            
            <div class="detail-actions">
                <button class="btn btn-secondary edit-permissions-btn" data-wallet-id="${wallet.id}">Edit Permissions</button>
                <button class="btn btn-secondary edit-limits-btn" data-wallet-id="${wallet.id}">Edit Limits</button>
                <button class="btn btn-danger delete-wallet-btn" data-wallet-id="${wallet.id}">Delete Wallet</button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Load wallet balances
    loadWalletBalances(wallet.id);
    
    // Add event listeners for wallet action buttons
    container.querySelector('.edit-permissions-btn').addEventListener('click', function() {
        editWalletPermissions(wallet.id);
    });
    
    container.querySelector('.edit-limits-btn').addEventListener('click', function() {
        editWalletLimits(wallet.id);
    });
    
    container.querySelector('.delete-wallet-btn').addEventListener('click', function() {
        confirmDeleteWallet(wallet.id);
    });
}

/**
 * Load wallet balances
 */
function loadWalletBalances(walletId) {
    const balancesElement = document.getElementById(`wallet-${walletId}-balances`);
    
    if (!balancesElement) return;
    
    // Fetch wallet balances from API
    fetch(`/api/wallet/${walletId}/balances`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderWalletBalances(balancesElement, data.balances);
            } else {
                balancesElement.innerHTML = `<div class="error">${data.error || 'Failed to load balances'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading wallet balances:', error);
            balancesElement.innerHTML = '<div class="error">Failed to load balances</div>';
        });
}

/**
 * Render wallet balances
 */
function renderWalletBalances(container, balances) {
    if (!balances || balances.length === 0) {
        container.innerHTML = '<div class="no-data">No balances available</div>';
        return;
    }
    
    let html = '<div class="wallet-balances-grid">';
    
    // Group balances by chain
    const balancesByChain = {};
    balances.forEach(balance => {
        if (!balancesByChain[balance.chain_id]) {
            balancesByChain[balance.chain_id] = [];
        }
        balancesByChain[balance.chain_id].push(balance);
    });
    
    // Render balances by chain
    for (const chainId in balancesByChain) {
        html += `
            <div class="chain-balance-item">
                <div class="chain-name">${formatChainName(chainId)}</div>
                <div class="chain-assets">
        `;
        
        balancesByChain[chainId].forEach(balance => {
            html += `
                <div class="asset-balance">
                    <span class="asset-name">${balance.asset}</span>
                    <span class="asset-amount">${formatAmount(balance.amount)}</span>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

// Modal opening functions
function openCreateTransactionModal() {
    // Populate chain and asset selects
    populateChainAssetSelects(modals.createTransaction.chainSelect, modals.createTransaction.assetSelect);
    
    // Open modal
    $(modals.createTransaction.modal).modal('show');
}

function openCreateWalletModal() {
    // Reset form
    modals.createWallet.form.reset();
    
    // Populate agent select (already done in loadAgentsList)
    
    // Open modal
    $(modals.createWallet.modal).modal('show');
}

function openFundWalletModal() {
    // Reset form
    modals.fundWallet.form.reset();
    
    // Populate chain and asset selects
    populateChainAssetSelects(modals.fundWallet.chainSelect, modals.fundWallet.assetSelect);
    
    // Open modal
    $(modals.fundWallet.modal).modal('show');
}

function openTransferModal() {
    // Reset form
    modals.transfer.form.reset();
    
    // Populate chain and asset selects
    populateChainAssetSelects(modals.transfer.chainSelect, modals.transfer.assetSelect);
    
    // Open modal
    $(modals.transfer.modal).modal('show');
}

function openCrossChainModal() {
    // Reset form
    modals.crossChain.form.reset();
    
    // Populate chain and asset selects for cross-chain transfer
    populateChainSelects(modals.crossChain.fromChainSelect);
    populateChainSelects(modals.crossChain.toChainSelect);
    populateAssetSelects(modals.crossChain.assetSelect);
    
    // Open modal
    $(modals.crossChain.modal).modal('show');
}

function openApproveTransactionModal(txId) {
    // Set transaction ID
    modals.approveTx.txId.value = txId;
    
    // Reset form
    modals.approveTx.form.reset();
    
    // Load transaction details
    loadTransactionDetails(txId, modals.approveTx.txDetails);
    
    // Open modal
    $(modals.approveTx.modal).modal('show');
}

function openFreezeModal() {
    // Reset form
    modals.freeze.form.reset();
    
    // Open modal
    $(modals.freeze.modal).modal('show');
}

function openUnfreezeModal() {
    // Reset form
    modals.unfreeze.form.reset();
    
    // Open modal
    $(modals.unfreeze.modal).modal('show');
}

// Helper function to populate chain and asset selects
function populateChainAssetSelects(chainSelect, assetSelect) {
    populateChainSelects(chainSelect);
    populateAssetSelects(assetSelect);
}

// Helper function to populate chain selects
function populateChainSelects(select) {
    // Clear options
    select.innerHTML = '<option value="">Select a chain</option>';
    
    // Fetch supported chains from API
    fetch('/api/vault/chains')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.chains) {
                data.chains.forEach(chain => {
                    const option = document.createElement('option');
                    option.value = chain.id;
                    option.textContent = formatChainName(chain.id);
                    select.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error loading chains:', error);
        });
}

// Helper function to populate asset selects
function populateAssetSelects(select) {
    // Clear options
    select.innerHTML = '<option value="">Select an asset</option>';
    
    // Fetch supported assets from API
    fetch('/api/vault/assets')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.assets) {
                data.assets.forEach(asset => {
                    const option = document.createElement('option');
                    option.value = asset.id;
                    option.textContent = asset.name || asset.id;
                    select.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Error loading assets:', error);
        });
}

// Form submission handlers
function submitCreateTransaction() {
    const chainId = modals.createTransaction.chainSelect.value;
    const toAddress = modals.createTransaction.toAddress.value;
    const asset = modals.createTransaction.assetSelect.value;
    const amount = parseFloat(modals.createTransaction.amount.value);
    const memo = modals.createTransaction.memo.value;
    
    if (!chainId || !toAddress || !asset || isNaN(amount) || amount <= 0) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Create transaction data
    const data = {
        chain_id: chainId,
        to_address: toAddress,
        asset: asset,
        amount: amount
    };
    
    if (memo) {
        data.metadata = { memo: memo };
    }
    
    // Submit to API
    fetch('/api/vault/transaction', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Close modal
            $(modals.createTransaction.modal).modal('hide');
            
            // Reload pending transactions
            loadPendingTransactions();
            
            // Show success notification
            showNotification('Transaction created successfully', 'success');
        } else {
            alert(`Error: ${data.error || 'Failed to create transaction'}`);
        }
    })
    .catch(error => {
        console.error('Error creating transaction:', error);
        alert('An error occurred while creating the transaction');
    });
}

// Format and utility functions
function formatAmount(amount) {
    if (amount === undefined || amount === null) return '-';
    return parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function formatChainName(chainId) {
    if (!chainId) return '-';
    
    // Map common chain IDs to readable names
    const chainNames = {
        'eth': 'Ethereum',
        'bsc': 'BNB Chain',
        'polygon': 'Polygon',
        'avalanche': 'Avalanche',
        'solana': 'Solana',
        'bitcoin': 'Bitcoin',
        'arbitrum': 'Arbitrum',
        'optimism': 'Optimism'
    };
    
    return chainNames[chainId.toLowerCase()] || chainId;
}

function formatPermissionName(permission) {
    if (!permission) return '-';
    
    // Convert camelCase or snake_case to readable text
    return permission
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());
}

function formatPeriodName(period) {
    if (!period) return '-';
    
    // Convert period names to readable text
    const periodNames = {
        'daily': 'Daily',
        'weekly': 'Weekly',
        'monthly': 'Monthly',
        'quarterly': 'Quarterly',
        'yearly': 'Yearly',
        'per_tx': 'Per Transaction'
    };
    
    return periodNames[period.toLowerCase()] || period;
}

function shortenId(id) {
    if (!id) return '-';
    if (id.length <= 10) return id;
    return id.substring(0, 6) + '...' + id.substring(id.length - 4);
}

function shortenAddress(address) {
    if (!address) return '-';
    if (address.length <= 15) return address;
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add to notifications container
    const container = document.querySelector('.notifications-container') || document.createElement('div');
    if (!container.classList.contains('notifications-container')) {
        container.className = 'notifications-container';
        document.body.appendChild(container);
    }
    
    container.appendChild(notification);
    
    // Add close button event
    notification.querySelector('.notification-close').addEventListener('click', function() {
        container.removeChild(notification);
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (container.contains(notification)) {
            container.removeChild(notification);
        }
    }, 5000);
}

// Load transaction history
function loadTransactionHistory() {
    const historyElement = dashboardComponents.ledger.transactionHistoryList;
    historyElement.innerHTML = '<div class="loading">Loading transaction history...</div>';
    
    // Get filter values
    const filters = {
        chain_id: dashboardComponents.ledger.historyFilters.chain.value,
        asset: dashboardComponents.ledger.historyFilters.asset.value,
        status: dashboardComponents.ledger.historyFilters.status.value
    };
    
    // Build query string
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value) {
            queryParams.append(key, value);
        }
    }
    
    // Fetch transaction history from API
    fetch(`/api/vault/transactions/history?${queryParams.toString()}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderTransactionHistory(historyElement, data.transactions);
            } else {
                historyElement.innerHTML = `<div class="error">${data.error || 'Failed to load transaction history'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading transaction history:', error);
            historyElement.innerHTML = '<div class="error">Failed to load transaction history</div>';
        });
}

// Filter transaction history
function filterTransactionHistory() {
    loadTransactionHistory();
}

// Render transaction history
function renderTransactionHistory(container, transactions) {
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="no-data">No transactions found</div>';
        return;
    }
    
    let html = '<div class="transaction-table">';
    html += `
        <div class="table-header">
            <div class="header-cell">ID</div>
            <div class="header-cell">Type</div>
            <div class="header-cell">From/To</div>
            <div class="header-cell">Amount</div>
            <div class="header-cell">Asset</div>
            <div class="header-cell">Chain</div>
            <div class="header-cell">Status</div>
            <div class="header-cell">Date</div>
        </div>
    `;
    
    transactions.forEach(tx => {
        let fromTo = '';
        if (tx.from_address && tx.to_address) {
            fromTo = `${shortenAddress(tx.from_address)} → ${shortenAddress(tx.to_address)}`;
        } else if (tx.to_address) {
            fromTo = `→ ${shortenAddress(tx.to_address)}`;
        } else if (tx.from_address) {
            fromTo = `${shortenAddress(tx.from_address)} →`;
        }
        
        html += `
            <div class="table-row">
                <div class="cell tx-id">${shortenId(tx.id)}</div>
                <div class="cell tx-type">${tx.type || 'Transfer'}</div>
                <div class="cell tx-addresses">${fromTo}</div>
                <div class="cell tx-amount">${formatAmount(tx.amount)} ${tx.asset}</div>
                <div class="cell tx-asset">${tx.asset}</div>
                <div class="cell tx-chain">${formatChainName(tx.chain_id)}</div>
                <div class="cell tx-status ${tx.status.toLowerCase()}">${tx.status}</div>
                <div class="cell tx-date">${formatDate(tx.timestamp || tx.created_at)}</div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Load recent transfers
function loadRecentTransfers() {
    const transfersElement = dashboardComponents.transferNetwork.recentTransferList;
    transfersElement.innerHTML = '<div class="loading">Loading transfers...</div>';
    
    // Fetch recent transfers from API
    fetch('/api/vault/transfers/recent')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderRecentTransfers(transfersElement, data.transfers);
            } else {
                transfersElement.innerHTML = `<div class="error">${data.error || 'Failed to load transfers'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading recent transfers:', error);
            transfersElement.innerHTML = '<div class="error">Failed to load transfers</div>';
        });
}

// Render recent transfers
function renderRecentTransfers(container, transfers) {
    if (!transfers || transfers.length === 0) {
        container.innerHTML = '<div class="no-data">No recent transfers</div>';
        return;
    }
    
    let html = '<div class="transfers-list">';
    
    transfers.forEach(transfer => {
        html += `
            <div class="transfer-item">
                <div class="transfer-header">
                    <div class="transfer-id">ID: ${shortenId(transfer.id)}</div>
                    <div class="transfer-status ${transfer.status.toLowerCase()}">${transfer.status}</div>
                </div>
                <div class="transfer-details">
                    <div class="transfer-agents">
                        <div class="from-agent">${transfer.from_agent_id || 'Vault'}</div>
                        <div class="transfer-arrow">→</div>
                        <div class="to-agent">${transfer.to_agent_id || 'External'}</div>
                    </div>
                    <div class="transfer-value">
                        <span class="amount">${formatAmount(transfer.amount)}</span>
                        <span class="asset">${transfer.asset}</span>
                    </div>
                </div>
                <div class="transfer-meta">
                    <div class="chain">${formatChainName(transfer.chain_id)}</div>
                    <div class="date">${formatDate(transfer.timestamp)}</div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Load bridge routes
function loadBridgeRoutes() {
    const routesElement = dashboardComponents.transferNetwork.bridgeRoutes;
    routesElement.innerHTML = '<div class="loading">Loading bridge routes...</div>';
    
    // Fetch bridge routes from API
    fetch('/api/vault/bridges')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderBridgeRoutes(routesElement, data.bridges);
            } else {
                routesElement.innerHTML = `<div class="error">${data.error || 'Failed to load bridge routes'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading bridge routes:', error);
            routesElement.innerHTML = '<div class="error">Failed to load bridge routes</div>';
        });
}

// Render bridge routes
function renderBridgeRoutes(container, bridges) {
    if (!bridges || bridges.length === 0) {
        container.innerHTML = '<div class="no-data">No bridge routes available</div>';
        return;
    }
    
    let html = '<div class="bridges-list">';
    
    bridges.forEach(bridge => {
        html += `
            <div class="bridge-item">
                <div class="bridge-header">
                    <div class="bridge-name">${bridge.name}</div>
                    <div class="bridge-status ${bridge.status.toLowerCase()}">${bridge.status}</div>
                </div>
                <div class="bridge-chains">
                    <div class="from-chain">${formatChainName(bridge.from_chain)}</div>
                    <div class="bridge-arrow">↔</div>
                    <div class="to-chain">${formatChainName(bridge.to_chain)}</div>
                </div>
                <div class="bridge-details">
                    <div class="supported-assets">
                        <span class="label">Assets:</span>
                        <span class="value">${bridge.supported_assets.join(', ')}</span>
                    </div>
                    <div class="bridge-fee">
                        <span class="label">Fee:</span>
                        <span class="value">${bridge.fee_percentage}%</span>
                    </div>
                    <div class="bridge-time">
                        <span class="label">Time:</span>
                        <span class="value">${bridge.avg_time} mins</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Load analytics data
function loadAnalyticsData() {
    // Fetch analytics data from API
    fetch('/api/vault/analytics')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Update metrics
                updateAnalyticsMetrics(data.metrics);
                
                // Render charts
                renderTxVolumeChart(data.tx_volume);
                renderAssetDistributionChart(data.asset_distribution);
            } else {
                console.error('Failed to load analytics data:', data.error);
            }
        })
        .catch(error => {
            console.error('Error loading analytics data:', error);
        });
}

// Update analytics metrics
function updateAnalyticsMetrics(metrics) {
    if (!metrics) return;
    
    // Update total transaction volume
    if (metrics.total_tx_volume !== undefined) {
        dashboardComponents.analytics.metrics.totalTxVolume.textContent = formatAmount(metrics.total_tx_volume);
    }
    
    // Update average transaction size
    if (metrics.avg_tx_size !== undefined) {
        dashboardComponents.analytics.metrics.avgTxSize.textContent = formatAmount(metrics.avg_tx_size);
    }
    
    // Update active wallets count
    if (metrics.active_wallets !== undefined) {
        dashboardComponents.analytics.metrics.activeWallets.textContent = metrics.active_wallets;
    }
}

// Render transaction volume chart
function renderTxVolumeChart(data) {
    if (!data || !data.labels || !data.datasets) return;
    
    const ctx = dashboardComponents.analytics.txVolumeChart.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.txVolumeChart) {
        window.txVolumeChart.destroy();
    }
    
    // Create new chart
    window.txVolumeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: data.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Transaction Volume Over Time'
                }
            }
        }
    });
}

// Render asset distribution chart
function renderAssetDistributionChart(data) {
    if (!data || !data.labels || !data.datasets) return;
    
    const ctx = dashboardComponents.analytics.assetDistributionChart.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.assetDistributionChart) {
        window.assetDistributionChart.destroy();
    }
    
    // Create new chart
    window.assetDistributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.labels,
            datasets: data.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Asset Distribution'
                }
            }
        }
    });
}

// Load transaction details
function loadTransactionDetails(txId, container) {
    container.innerHTML = '<div class="loading">Loading transaction details...</div>';
    
    // Fetch transaction details from API
    fetch(`/api/vault/transaction/${txId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                renderTransactionDetails(container, data.transaction);
            } else {
                container.innerHTML = `<div class="error">${data.error || 'Failed to load transaction details'}</div>`;
            }
        })
        .catch(error => {
            console.error('Error loading transaction details:', error);
            container.innerHTML = '<div class="error">Failed to load transaction details</div>';
        });
}

// Render transaction details
function renderTransactionDetails(container, tx) {
    if (!tx) {
        container.innerHTML = '<div class="error">Transaction not found</div>';
        return;
    }
    
    let html = `
        <div class="tx-detail-container">
            <div class="tx-detail-header">
                <h5>Transaction Details</h5>
                <div class="tx-id">ID: ${tx.id}</div>
            </div>
            <div class="tx-detail-body">
                <div class="detail-row">
                    <div class="detail-label">From:</div>
                    <div class="detail-value">${tx.from_address || 'Master Vault'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">To:</div>
                    <div class="detail-value">${tx.to_address}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Amount:</div>
                    <div class="detail-value">${formatAmount(tx.amount)} ${tx.asset}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Chain:</div>
                    <div class="detail-value">${formatChainName(tx.chain_id)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Status:</div>
                    <div class="detail-value ${tx.status.toLowerCase()}">${tx.status}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Created:</div>
                    <div class="detail-value">${formatDate(tx.created_at)}</div>
                </div>
                ${tx.approvals && tx.approvals.length > 0 ? `
                <div class="detail-row">
                    <div class="detail-label">Approvals:</div>
                    <div class="detail-value">${tx.approvals.length} / ${tx.required_approvals || '?'}</div>
                </div>
                ` : ''}
                ${tx.metadata ? `
                <div class="detail-row">
                    <div class="detail-label">Memo:</div>
                    <div class="detail-value">${tx.metadata.memo || '-'}</div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Check vault status
function checkVaultStatus() {
    // Fetch vault status from API
    fetch('/api/vault/status')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateVaultStatus(data.status);
            } else {
                console.error('Failed to check vault status:', data.error);
            }
        })
        .catch(error => {
            console.error('Error checking vault status:', error);
        });
}

// Update vault status in UI
function updateVaultStatus(status) {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = document.querySelector('.status-text');
    
    if (!statusIndicator || !statusText) return;
    
    // Update status indicator
    if (status.frozen) {
        statusIndicator.classList.add('frozen');
        statusIndicator.classList.remove('active');
        statusText.textContent = 'FROZEN';
        
        // Show unfreeze button, hide freeze button
        dashboardComponents.masterVault.emergencyFreezeBtn.style.display = 'none';
        dashboardComponents.masterVault.unfreezeBtn.style.display = 'block';
        
        // Disable action buttons
        document.querySelectorAll('.dashboard-card button.btn-primary').forEach(btn => {
            btn.disabled = true;
        });
    } else {
        statusIndicator.classList.add('active');
        statusIndicator.classList.remove('frozen');
        statusText.textContent = 'ACTIVE';
        
        // Show freeze button, hide unfreeze button
        dashboardComponents.masterVault.emergencyFreezeBtn.style.display = 'block';
        dashboardComponents.masterVault.unfreezeBtn.style.display = 'none';
        
        // Enable action buttons
        document.querySelectorAll('.dashboard-card button.btn-primary').forEach(btn => {
            btn.disabled = false;
        });
    }
}

// Export ledger data
function exportLedgerData() {
    // Get filter values
    const filters = {
        chain_id: dashboardComponents.ledger.historyFilters.chain.value,
        asset: dashboardComponents.ledger.historyFilters.asset.value,
        status: dashboardComponents.ledger.historyFilters.status.value
    };
    
    // Build query string
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
        if (value) {
            queryParams.append(key, value);
        }
    }
    
    // Redirect to export endpoint
    window.location.href = `/api/vault/export/transactions?${queryParams.toString()}`;
}
