# DeFi Protocol Integration Framework API Documentation

This document provides detailed information about the API of the Trading Farm DeFi Protocol Integration Framework.

## Table of Contents

1. [Introduction](#introduction)
2. [Protocol Connectors](#protocol-connectors)
3. [Protocol Actions](#protocol-actions)
4. [Cross-Protocol Aggregation](#cross-protocol-aggregation)
5. [Error Handling](#error-handling)
6. [Transaction Monitoring](#transaction-monitoring)
7. [Wallet Integration](#wallet-integration)
8. [Type Definitions](#type-definitions)

## Introduction

The DeFi Protocol Integration Framework provides a standardized interface for interacting with multiple DeFi protocols through a unified API. It abstracts away protocol-specific implementation details and provides consistent methods for executing common actions.

## Protocol Connectors

Protocol connectors are implementations of the `ProtocolConnectorInterface` that provide protocol-specific functionality with a standardized interface.

### Supported Protocols

- GMX (Perpetual DEX)
- SushiSwap (DEX)
- Uniswap (DEX)
- Aave (Lending)
- Morpho (P2P Lending)
- Compound (Lending)
- Curve Finance (Stable Swaps)

### Protocol Connector Factory

The `ProtocolConnectorFactory` provides a centralized way to get connector instances for a specific protocol.

```typescript
import { ProtocolConnectorFactory } from 'src/services/defi/protocol-connector-factory';
import { ProtocolType } from 'src/types/defi-protocol-types';

// Get connector for a specific protocol and chain
const gmxConnector = await ProtocolConnectorFactory.getConnector(ProtocolType.GMX, 42161); // Arbitrum
```

### Common Connector Methods

All protocol connectors implement the following methods:

#### connect

```typescript
async connect(credentials?: Record<string, string>): Promise<boolean>
```

Connects to the protocol with the provided credentials.

**Parameters:**
- `credentials`: (Optional) Credentials for the connection (e.g., wallet address, private key, etc.)

**Returns:**
- `Promise<boolean>`: `true` if connection is successful, `false` otherwise

#### getProtocolInfo

```typescript
async getProtocolInfo(): Promise<any>
```

Returns basic information about the protocol.

**Returns:**
- `Promise<any>`: Protocol information object with name, type, chainId, etc.

#### getUserPositions

```typescript
async getUserPositions(address?: string): Promise<ProtocolPosition[]>
```

Gets the user's positions for the protocol.

**Parameters:**
- `address`: (Optional) User address to get positions for

**Returns:**
- `Promise<ProtocolPosition[]>`: Array of user positions

#### executeAction

```typescript
async executeAction(action: ProtocolAction, params: any): Promise<any>
```

Executes a specific action on the protocol.

**Parameters:**
- `action`: The action to execute (SWAP, SUPPLY, BORROW, etc.)
- `params`: Parameters for the action

**Returns:**
- `Promise<any>`: Result of the action execution

## Protocol Actions

The framework supports a standardized set of actions across protocols, defined in the `ProtocolAction` enum.

### Common Actions

- `SWAP`: Swap one token for another
- `SUPPLY`: Supply tokens to a lending protocol
- `WITHDRAW`: Withdraw supplied tokens
- `BORROW`: Borrow tokens from a lending protocol
- `REPAY`: Repay borrowed tokens
- `ADD_LIQUIDITY`: Add liquidity to a pool
- `REMOVE_LIQUIDITY`: Remove liquidity from a pool
- `TRADE`: Open a trade position (perpetuals)
- `CLOSE`: Close a position

### Example: Executing a Swap

```typescript
import { ProtocolConnectorFactory } from 'src/services/defi/protocol-connector-factory';
import { ProtocolType, ProtocolAction } from 'src/types/defi-protocol-types';

async function performSwap() {
  // Get connector
  const uniswapConnector = await ProtocolConnectorFactory.getConnector(ProtocolType.UNISWAP, 1);
  
  // Connect wallet
  await uniswapConnector.connect({ address: 'YOUR_WALLET_ADDRESS' });
  
  // Execute swap
  const result = await uniswapConnector.executeAction(
    ProtocolAction.SWAP,
    {
      tokenIn: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      tokenOut: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
      amountIn: '1000000000', // 1000 USDC (6 decimals)
      minAmountOut: '450000000000000000', // 0.45 WETH (18 decimals)
      recipient: 'YOUR_WALLET_ADDRESS'
    }
  );
  
  return result;
}
```

## Cross-Protocol Aggregation

The `CrossProtocolAggregator` provides functionality to compare rates and execute actions across multiple protocols.

### Key Methods

#### getBestSwapRates

```typescript
async getBestSwapRates(
  inputToken: string,
  outputToken: string,
  inputAmount: string,
  chainId: number = 1
): Promise<SwapRate[]>
```

Gets the best swap rates across multiple DEX protocols.

**Parameters:**
- `inputToken`: Address of the token to swap from
- `outputToken`: Address of the token to swap to
- `inputAmount`: Amount of input token to swap
- `chainId`: (Optional) Chain ID to check rates on

**Returns:**
- `Promise<SwapRate[]>`: Array of swap rates sorted by best rate first

#### getBestLendingRates

```typescript
async getBestLendingRates(
  token: string,
  chainId: number = 1
): Promise<LendingRate[]>
```

Gets the best lending rates across lending protocols.

**Parameters:**
- `token`: Address or symbol of the token to check rates for
- `chainId`: (Optional) Chain ID to check rates on

**Returns:**
- `Promise<LendingRate[]>`: Array of lending rates sorted by best supply APY

#### executeBestSwap

```typescript
async executeBestSwap(
  inputToken: string,
  outputToken: string,
  inputAmount: string,
  minOutputAmount: string,
  walletAddress: string,
  chainId: number = 1
): Promise<any>
```

Executes a swap using the best available rate across protocols.

**Parameters:**
- `inputToken`: Address of the token to swap from
- `outputToken`: Address of the token to swap to
- `inputAmount`: Amount of input token to swap
- `minOutputAmount`: Minimum amount of output token to receive
- `walletAddress`: Wallet address for the swap
- `chainId`: (Optional) Chain ID to execute the swap on

**Returns:**
- `Promise<any>`: Result of the swap execution

### Example: Using the Aggregator

```typescript
import { CrossProtocolAggregator } from 'src/services/defi/cross-protocol-aggregator';

async function getBestRate() {
  const aggregator = CrossProtocolAggregator.getInstance();
  
  // Get best swap rates
  const rates = await aggregator.getBestSwapRates(
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '1000000000', // 1000 USDC (6 decimals)
    1 // Ethereum mainnet
  );
  
  console.log('Best rate:', rates[0]);
  
  return rates;
}
```

## Error Handling

The framework includes a robust error handling system through the `ErrorHandler` class.

### Key Methods

#### handleError

```typescript
public handleError(error: any, protocol?: string, action?: string): DeFiError
```

Processes and categorizes errors.

**Parameters:**
- `error`: The error object
- `protocol`: (Optional) Protocol where the error occurred
- `action`: (Optional) Action being performed when the error occurred

**Returns:**
- `DeFiError`: Categorized error with additional metadata

#### retryWithBackoff

```typescript
public async retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryOptions>,
  protocol?: string,
  action?: string
): Promise<T>
```

Retries a function with exponential backoff.

**Parameters:**
- `fn`: The function to retry
- `options`: (Optional) Retry options
- `protocol`: (Optional) Protocol where the function is being executed
- `action`: (Optional) Action being performed

**Returns:**
- `Promise<T>`: Result of the function if successful

### Example: Using Error Handling

```typescript
import { ErrorHandler } from 'src/services/defi/error-handler';

async function executeWithRetry() {
  const errorHandler = ErrorHandler.getInstance();
  
  try {
    // Register error callback
    errorHandler.registerErrorCallback((error) => {
      console.error(`Error occurred: ${error.type} - ${error.message}`);
    });
    
    // Use retry mechanism
    const result = await errorHandler.retryWithBackoff(
      async () => {
        // Function that might fail
        return await uniswapConnector.executeAction(ProtocolAction.SWAP, params);
      },
      { maxRetries: 3, initialDelay: 1000 },
      "Uniswap",
      "SWAP"
    );
    
    return result;
  } catch (error) {
    console.error('Operation failed after retries:', error);
    throw error;
  }
}
```

## Transaction Monitoring

The `TransactionMonitor` provides functionality to track and monitor blockchain transactions.

### Key Methods

#### trackTransaction

```typescript
public trackTransaction(
  hash: string,
  chainId: number,
  description: string,
  protocol?: string,
  action?: string
): TrackedTransaction
```

Starts tracking a new transaction.

**Parameters:**
- `hash`: Transaction hash
- `chainId`: Chain ID where the transaction was submitted
- `description`: Human-readable description of the transaction
- `protocol`: (Optional) Protocol associated with the transaction
- `action`: (Optional) Action being performed

**Returns:**
- `TrackedTransaction`: Transaction tracking object

#### registerUpdateCallback

```typescript
public registerUpdateCallback(callback: TransactionUpdateCallback): void
```

Registers a callback for transaction updates.

**Parameters:**
- `callback`: Function to call when a transaction status changes

### Example: Monitoring Transactions

```typescript
import { TransactionMonitor, TransactionStatus } from 'src/services/transaction-monitor';

function setupTransactionMonitoring() {
  const monitor = TransactionMonitor.getInstance();
  
  // Register update callback
  monitor.registerUpdateCallback((tx) => {
    console.log(`Transaction ${tx.hash} status: ${tx.status}`);
    
    if (tx.status === TransactionStatus.CONFIRMED) {
      // Handle confirmation
      console.log(`Confirmed at block ${tx.blockNumber} with ${tx.confirmations} confirmations`);
    } else if (tx.status === TransactionStatus.FAILED) {
      // Handle failure
      console.error('Transaction failed:', tx.error);
    }
  });
  
  return monitor;
}

async function executeAndTrackTransaction() {
  const monitor = setupTransactionMonitoring();
  
  // Execute a transaction
  const result = await uniswapConnector.executeAction(ProtocolAction.SWAP, params);
  
  // Track the transaction
  const trackedTx = monitor.trackTransaction(
    result.transactionHash,
    1, // Ethereum mainnet
    'Swap 1000 USDC for WETH',
    'Uniswap',
    'SWAP'
  );
  
  return trackedTx;
}
```

## Wallet Integration

The `WalletProvider` provides functionality to interact with blockchain wallets.

### Key Methods

#### connect

```typescript
public async connect(walletType: WalletType): Promise<boolean>
```

Connects to the specified wallet type.

**Parameters:**
- `walletType`: Type of wallet to connect to (MetaMask, WalletConnect, etc.)

**Returns:**
- `Promise<boolean>`: `true` if connection is successful, `false` otherwise

#### getWalletInfo

```typescript
public getWalletInfo(): WalletInfo | null
```

Gets information about the connected wallet.

**Returns:**
- `WalletInfo | null`: Wallet information if connected, `null` otherwise

#### signMessage

```typescript
public async signMessage(message: string): Promise<string>
```

Signs a message with the connected wallet.

**Parameters:**
- `message`: Message to sign

**Returns:**
- `Promise<string>`: Signature

### Example: Wallet Integration

```typescript
import { WalletProvider, WalletType } from 'src/services/wallet/wallet-provider';

async function connectWallet() {
  const walletProvider = WalletProvider.getInstance();
  
  // Connect to MetaMask
  const connected = await walletProvider.connect(WalletType.METAMASK);
  
  if (connected) {
    const walletInfo = walletProvider.getWalletInfo();
    console.log('Connected to wallet:', walletInfo?.address);
    
    // Switch chain if needed
    await walletProvider.switchChain(42161); // Switch to Arbitrum
    
    return walletInfo;
  } else {
    throw new Error('Failed to connect wallet');
  }
}
```

## Type Definitions

### ProtocolType

Enum defining the supported protocols.

```typescript
enum ProtocolType {
  AAVE = 'aave',
  UNISWAP = 'uniswap',
  VERTEX = 'vertex',
  GMX = 'gmx',
  SUSHISWAP = 'sushiswap',
  MORPHO = 'morpho',
  CURVE = 'curve',
  COMPOUND = 'compound'
  // Additional protocols...
}
```

### ProtocolAction

Enum defining the standardized actions across protocols.

```typescript
enum ProtocolAction {
  SWAP = 'swap',
  SUPPLY = 'supply',
  WITHDRAW = 'withdraw',
  BORROW = 'borrow',
  REPAY = 'repay',
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  TRADE = 'trade',
  CLOSE = 'close'
  // Additional actions...
}
```

### ProtocolPosition

Interface defining a user's position in a protocol.

```typescript
interface ProtocolPosition {
  id: string;
  protocolId: ProtocolType;
  chainId: number;
  assetSymbol: string;
  assetAddress: string;
  direction: string;
  positionValue: number;
  tokenAmount: string;
  leverage: number;
  collateral: { symbol: string; amount: string; value: number }[];
  healthFactor: number;
  unrealizedPnl?: number;
  metadata?: Record<string, any>;
}
```

### SwapRate

Interface defining swap rate information.

```typescript
interface SwapRate {
  protocol: ProtocolType;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  outputAmount: string;
  priceImpact: number;
  fees: number;
  route?: any;
  estimatedGas?: string;
  estimatedTimeMs?: number;
}
```

### LendingRate

Interface defining lending rate information.

```typescript
interface LendingRate {
  protocol: ProtocolType;
  token: string;
  supplyAPY: number;
  borrowAPY: number;
  totalSupply: string;
  totalBorrow: string;
  utilizationRate: number;
  ltv: number;
  liquidationThreshold: number;
}
```

### TrackedTransaction

Interface defining a tracked transaction.

```typescript
interface TrackedTransaction {
  id: string;
  hash: string;
  chainId: number;
  description: string;
  status: TransactionStatus;
  submittedAt: number;
  confirmedAt?: number;
  failedAt?: number;
  protocol?: string;
  action?: string;
  blockNumber?: number;
  confirmations?: number;
  gasUsed?: string;
  gasPrice?: string;
  effectiveGasPrice?: string;
  replacedByHash?: string;
  error?: any;
}
```

### WalletInfo

Interface defining wallet information.

```typescript
interface WalletInfo {
  address: string;
  chainId: number;
  balance: string;
  balanceUSD?: number;
  type: WalletType;
  isConnected: boolean;
}
``` 