#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { defiProtocolMcp } from '../../services/mcp/defi-protocol-mcp';
import { ProtocolType, ProtocolCategory } from '../../types/defi-protocol-types';

class DefiProtocolMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'defi-protocol-mcp-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'getProtocolsList',
          description: 'Get a list of all supported DeFi protocols with metadata',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'getProtocolsByCategory',
          description: 'Get protocols filtered by category',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Protocol category to filter by',
                enum: Object.values(ProtocolCategory),
              },
            },
            required: ['category'],
          },
        },
        {
          name: 'getProtocolData',
          description: 'Get detailed data for a specific protocol',
          inputSchema: {
            type: 'object',
            properties: {
              protocol: {
                type: 'string',
                description: 'The DeFi protocol to get data for',
                enum: Object.values(ProtocolType),
              },
              chainId: {
                type: ['string', 'number', 'null'],
                description: 'Optional chain ID for multi-chain protocols',
              },
            },
            required: ['protocol'],
          },
        },
        {
          name: 'executeProtocolAction',
          description: 'Execute an action on a DeFi protocol',
          inputSchema: {
            type: 'object',
            properties: {
              protocol: {
                type: 'string',
                description: 'The DeFi protocol to execute the action on',
                enum: Object.values(ProtocolType),
              },
              actionType: {
                type: 'string',
                description: 'The type of action to execute',
              },
              params: {
                type: 'object',
                description: 'Parameters required for the action',
              },
              userAddress: {
                type: 'string',
                description: 'Optional user wallet address',
              },
              chainId: {
                type: ['string', 'number', 'null'],
                description: 'Optional chain ID for multi-chain protocols',
              },
            },
            required: ['protocol', 'actionType', 'params'],
          },
        },
        {
          name: 'getUserPositions',
          description: 'Get user positions across all protocols',
          inputSchema: {
            type: 'object',
            properties: {
              userAddress: {
                type: 'string',
                description: 'The user wallet address',
              },
              protocolTypes: {
                type: 'array',
                description: 'Optional list of specific protocols to check',
                items: {
                  type: 'string',
                  enum: Object.values(ProtocolType),
                },
              },
            },
            required: ['userAddress'],
          },
        },
        {
          name: 'compareSwapRates',
          description: 'Compare swap rates across DEXes',
          inputSchema: {
            type: 'object',
            properties: {
              fromToken: {
                type: 'string',
                description: 'Token to swap from (symbol or address)',
              },
              toToken: {
                type: 'string',
                description: 'Token to swap to (symbol or address)',
              },
              amount: {
                type: 'string',
                description: 'Amount to swap in decimal string format',
              },
            },
            required: ['fromToken', 'toToken', 'amount'],
          },
        },
        {
          name: 'compareLendingRates',
          description: 'Compare lending rates across lending protocols',
          inputSchema: {
            type: 'object',
            properties: {
              asset: {
                type: 'string',
                description: 'Asset symbol to check rates for',
              },
            },
            required: ['asset'],
          },
        },
        {
          name: 'comparePerpetualsFees',
          description: 'Compare perpetual trading fees across protocols',
          inputSchema: {
            type: 'object',
            properties: {
              symbol: {
                type: 'string',
                description: 'Market symbol to check fees for (e.g., BTC, ETH)',
              },
            },
            required: ['symbol'],
          },
        },
        {
          name: 'executeOptimizedSwap',
          description: 'Execute optimized swap across DEXes',
          inputSchema: {
            type: 'object',
            properties: {
              fromToken: {
                type: 'string',
                description: 'Token to swap from (symbol or address)',
              },
              toToken: {
                type: 'string',
                description: 'Token to swap to (symbol or address)',
              },
              amount: {
                type: 'string',
                description: 'Amount to swap in decimal string format',
              },
              userAddress: {
                type: 'string',
                description: 'User wallet address',
              },
              slippageTolerance: {
                type: 'number',
                description: 'Slippage tolerance in percentage (0.5 = 0.5%)',
              },
              deadline: {
                type: 'number',
                description: 'Deadline for the swap in unix timestamp',
              },
            },
            required: ['fromToken', 'toToken', 'amount', 'userAddress'],
          },
        },
        {
          name: 'getRecommendedActions',
          description: 'Get recommended actions based on user\'s positions and market conditions',
          inputSchema: {
            type: 'object',
            properties: {
              userAddress: {
                type: 'string',
                description: 'User wallet address',
              },
            },
            required: ['userAddress'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (req) => {
      const { name, input } = req;

      try {
        switch (name) {
          case 'getProtocolsList':
            return { output: await defiProtocolMcp.getProtocolsList() };

          case 'getProtocolsByCategory':
            return { output: await defiProtocolMcp.getProtocolsByCategory(input.category) };

          case 'getProtocolData':
            return { output: await defiProtocolMcp.getProtocolData(input.protocol, input.chainId) };

          case 'executeProtocolAction':
            return {
              output: await defiProtocolMcp.executeProtocolAction(
                {
                  protocol: input.protocol,
                  actionType: input.actionType,
                  params: input.params,
                },
                input.userAddress,
                input.chainId
              ),
            };

          case 'getUserPositions':
            return {
              output: await defiProtocolMcp.getUserPositions(input.userAddress, input.protocolTypes),
            };

          case 'compareSwapRates':
            return {
              output: await defiProtocolMcp.compareSwapRates(
                input.fromToken,
                input.toToken,
                input.amount
              ),
            };

          case 'compareLendingRates':
            return { output: await defiProtocolMcp.compareLendingRates(input.asset) };

          case 'comparePerpetualsFees':
            return { output: await defiProtocolMcp.comparePerpetualsFees(input.symbol) };

          case 'executeOptimizedSwap':
            return {
              output: await defiProtocolMcp.executeOptimizedSwap(
                input.fromToken,
                input.toToken,
                input.amount,
                input.userAddress,
                {
                  slippageTolerance: input.slippageTolerance,
                  deadline: input.deadline,
                }
              ),
            };

          case 'getRecommendedActions':
            return { output: await defiProtocolMcp.getRecommendedActions(input.userAddress) };

          default:
            throw new McpError(
              `Unknown tool: ${name}`,
              ErrorCode.InvalidRequest,
              `Supported tools: getProtocolsList, getProtocolsByCategory, getProtocolData, executeProtocolAction, getUserPositions, compareSwapRates, compareLendingRates, comparePerpetualsFees, executeOptimizedSwap, getRecommendedActions`
            );
        }
      } catch (error: any) {
        console.error(`Error executing tool ${name}:`, error);
        throw new McpError(
          `Error executing tool ${name}: ${error.message}`,
          ErrorCode.InternalServerError
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`DeFi Protocol MCP server running on stdio`);
  }
}

const server = new DefiProtocolMcpServer();
server.run().catch(console.error); 