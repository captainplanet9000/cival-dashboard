"use client";

import { Socket } from "socket.io-client";
import { AIAgentV2 } from "@/context/ai-agent-v2-context";
import { ExchangeConnector, ConnectionStatus } from "./exchange-connector";
import { StrategyEngine, StrategyResult } from "./strategy-engine";
import { useToast } from "@/components/ui/use-toast";
import { TRADING_EVENTS } from "@/constants/socket-events";

/**
 * Status of a trading agent
 */
export enum AgentMonitorStatus {
  OFFLINE = "offline",
  CONNECTING = "connecting",
  ACTIVE = "active",
  PAUSED = "paused",
  ERROR = "error",
}

/**
 * Agent performance metrics
 */
export interface AgentPerformance {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  dailyPnL: number;
  weeklyPnL: number;
  monthlyPnL: number;
  allTimePnL: number;
  drawdown: number;
  maxDrawdown: number;
  avgTradeLength: number;
  lastUpdated: number;
}

/**
 * Agent alert levels
 */
export enum AlertLevel {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

/**
 * Agent alert
 */
export interface AgentAlert {
  id: string;
  agentId: string;
  level: AlertLevel;
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

/**
 * Agent monitor state
 */
export interface AgentMonitorState {
  agentId: string;
  status: AgentMonitorStatus;
  performance: AgentPerformance;
  lastStrategy: StrategyResult | null;
  exchangeStatus: ConnectionStatus;
  alerts: AgentAlert[];
  isRunning: boolean;
  lastError: string | null;
  lastUpdated: number;
}

/**
 * Agent Monitor class for tracking and controlling agents
 */
export class AgentMonitor {
  private agent: AIAgentV2;
  private exchangeConnector: ExchangeConnector;
  private strategyEngine: StrategyEngine;
  private socket: Socket | null;
  private state: AgentMonitorState;
  private monitorInterval: any = null;
  private heartbeatInterval: any = null;
  private eventListeners: Record<string, Function[]> = {};
  private alertCount: number = 0;
  private isInitialized: boolean = false;

  /**
   * Constructor for the Agent Monitor
   * @param agent The agent to monitor
   * @param exchangeConnector The exchange connector
   * @param strategyEngine The strategy engine
   * @param socket Optional socket for real-time updates
   */
  constructor(
    agent: AIAgentV2,
    exchangeConnector: ExchangeConnector,
    strategyEngine: StrategyEngine,
    socket: Socket | null = null
  ) {
    this.agent = agent;
    this.exchangeConnector = exchangeConnector;
    this.strategyEngine = strategyEngine;
    this.socket = socket;

    // Initialize state
    this.state = {
      agentId: agent.id,
      status: AgentMonitorStatus.OFFLINE,
      performance: this.initializePerformance(),
      lastStrategy: null,
      exchangeStatus: ConnectionStatus.DISCONNECTED,
      alerts: [],
      isRunning: false,
      lastError: null,
      lastUpdated: Date.now(),
    };

    // Setup engine listeners
    this.setupEngineListeners();
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformance(): AgentPerformance {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      profitFactor: 1,
      dailyPnL: 0,
      weeklyPnL: 0,
      monthlyPnL: 0,
      allTimePnL: 0,
      drawdown: 0,
      maxDrawdown: 0,
      avgTradeLength: 0,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Setup strategy engine listeners
   */
  private setupEngineListeners() {
    // Listen for strategy executions
    this.strategyEngine.on("strategyExecuted", (data: any) => {
      this.state.lastStrategy = data.result;
      this.state.lastUpdated = Date.now();
      this.emit("strategyUpdate", data);
    });

    // Listen for trades
    this.strategyEngine.on("trade", (data: any) => {
      // Update performance metrics
      this.updatePerformanceWithTrade(data);
      this.emit("tradeExecuted", data);
    });

    // Listen for errors
    this.strategyEngine.on("error", (data: any) => {
      this.state.lastError = data.error?.message || "Unknown error";
      this.addAlert(AlertLevel.WARNING, `Strategy error: ${this.state.lastError}`);
      this.emit("error", data);
    });

    // Listen for started/stopped events
    this.strategyEngine.on("started", () => {
      this.state.isRunning = true;
      this.emit("strategyStarted", { agentId: this.agent.id, timestamp: Date.now() });
    });

    this.strategyEngine.on("stopped", () => {
      this.state.isRunning = false;
      this.emit("strategyStopped", { agentId: this.agent.id, timestamp: Date.now() });
    });
  }

  /**
   * Initialize the agent monitor
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      this.state.status = AgentMonitorStatus.CONNECTING;
      this.emit("statusChange", {
        agentId: this.agent.id,
        status: this.state.status,
        timestamp: Date.now(),
      });

      // Connect to exchange
      const exchangeConnected = await this.exchangeConnector.connect();
      
      if (!exchangeConnected) {
        this.state.status = AgentMonitorStatus.ERROR;
        this.state.lastError = "Failed to connect to exchange";
        this.addAlert(AlertLevel.CRITICAL, "Failed to connect to exchange");
        this.emit("statusChange", {
          agentId: this.agent.id,
          status: this.state.status,
          timestamp: Date.now(),
        });
        return false;
      }

      // Set agent status to active
      this.state.status = AgentMonitorStatus.ACTIVE;
      this.state.exchangeStatus = ConnectionStatus.CONNECTED;
      this.emit("statusChange", {
        agentId: this.agent.id,
        status: this.state.status,
        timestamp: Date.now(),
      });

      // Start monitoring
      this.startMonitoring();

      // Setup socket listeners
      if (this.socket) {
        this.setupSocketListeners();
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      this.state.status = AgentMonitorStatus.ERROR;
      this.state.lastError = (error as Error).message || "Unknown error during initialization";
      this.addAlert(AlertLevel.CRITICAL, `Initialization error: ${this.state.lastError}`);
      
      this.emit("error", {
        agentId: this.agent.id,
        error,
        timestamp: Date.now(),
      });
      
      return false;
    }
  }

  /**
   * Start monitoring the agent
   */
  private startMonitoring() {
    // Clear any existing intervals
    this.stopMonitoring();

    // Set up monitor interval (every 5 minutes)
    this.monitorInterval = setInterval(() => {
      this.updatePerformance();
      this.checkAlerts();
    }, 5 * 60 * 1000);

    // Set up heartbeat interval (every 30 seconds)
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30 * 1000);
  }

  /**
   * Stop monitoring the agent
   */
  private stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Send heartbeat to socket
   */
  private sendHeartbeat() {
    if (!this.socket) return;

    this.socket.emit(TRADING_EVENTS.AGENT_STATUS, {
      agentId: this.agent.id,
      status: this.state.status,
      performance: this.state.performance,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Setup socket listeners
   */
  private setupSocketListeners() {
    if (!this.socket) return;

    // Listen for agent commands
    this.socket.on(TRADING_EVENTS.AGENT_COMMAND, (data: any) => {
      if (data.agentId === this.agent.id) {
        this.handleCommand(data.command, data.params);
      }
    });
  }

  /**
   * Handle agent commands from socket
   */
  private handleCommand(command: string, params: any) {
    try {
      switch (command) {
        case "start":
          this.startTrading();
          break;
        case "stop":
          this.stopTrading();
          break;
        case "pause":
          this.pauseTrading();
          break;
        case "execute":
          this.executeNow();
          break;
        case "updateSettings":
          this.updateSettings(params);
          break;
        default:
          console.warn(`Unknown command: ${command}`);
      }
    } catch (error) {
      console.error(`Error handling command ${command}:`, error);
      this.state.lastError = `Command error: ${(error as Error).message}`;
      this.emit("error", {
        agentId: this.agent.id,
        command,
        error,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Start trading
   */
  public startTrading(): boolean {
    if (this.state.status !== AgentMonitorStatus.ACTIVE && 
        this.state.status !== AgentMonitorStatus.PAUSED) {
      throw new Error(`Agent is not in a valid state to start trading: ${this.state.status}`);
    }

    const success = this.strategyEngine.start();
    
    if (success) {
      this.state.status = AgentMonitorStatus.ACTIVE;
      this.emit("statusChange", {
        agentId: this.agent.id,
        status: this.state.status,
        timestamp: Date.now(),
      });
    }
    
    return success;
  }

  /**
   * Stop trading
   */
  public stopTrading(): boolean {
    const success = this.strategyEngine.stop();
    
    if (success) {
      this.state.status = AgentMonitorStatus.PAUSED;
      this.emit("statusChange", {
        agentId: this.agent.id,
        status: this.state.status,
        timestamp: Date.now(),
      });
    }
    
    return success;
  }

  /**
   * Pause trading temporarily
   */
  public pauseTrading(): boolean {
    const success = this.strategyEngine.stop();
    
    if (success) {
      this.state.status = AgentMonitorStatus.PAUSED;
      this.emit("statusChange", {
        agentId: this.agent.id,
        status: this.state.status,
        timestamp: Date.now(),
      });
      
      // Automatically resume after 1 hour
      setTimeout(() => {
        if (this.state.status === AgentMonitorStatus.PAUSED) {
          this.startTrading();
        }
      }, 60 * 60 * 1000);
    }
    
    return success;
  }

  /**
   * Execute strategy now
   */
  public async executeNow(): Promise<StrategyResult> {
    return await this.strategyEngine.executeStrategy();
  }

  /**
   * Update agent settings
   */
  public updateSettings(settings: any): void {
    // In a real implementation, this would update agent settings
    // For now, just log and emit an event
    console.log(`Updating settings for agent ${this.agent.id}:`, settings);
    
    this.emit("settingsUpdated", {
      agentId: this.agent.id,
      settings,
      timestamp: Date.now(),
    });
  }

  /**
   * Update performance metrics with a new trade
   */
  private updatePerformanceWithTrade(tradeData: any) {
    const performance = this.state.performance;
    
    // Increment total trades
    performance.totalTrades++;
    
    // Determine if winning or losing trade (simplified)
    const isWinningTrade = Math.random() > 0.4; // Mock win rate of 60%
    
    if (isWinningTrade) {
      performance.winningTrades++;
    } else {
      performance.losingTrades++;
    }
    
    // Update win rate
    performance.winRate = performance.totalTrades > 0
      ? (performance.winningTrades / performance.totalTrades) * 100
      : 0;
    
    // Update PnL (simplified)
    const pnlChange = isWinningTrade
      ? tradeData.order.quantity * 100 // Mock $100 gain per BTC
      : -tradeData.order.quantity * 50; // Mock $50 loss per BTC
    
    performance.dailyPnL += pnlChange;
    performance.weeklyPnL += pnlChange;
    performance.monthlyPnL += pnlChange;
    performance.allTimePnL += pnlChange;
    
    // Update drawdown
    const currentDrawdown = this.calculateDrawdown(performance.allTimePnL);
    performance.drawdown = currentDrawdown;
    performance.maxDrawdown = Math.max(performance.maxDrawdown, currentDrawdown);
    
    // Update last updated timestamp
    performance.lastUpdated = Date.now();
  }

  /**
   * Calculate drawdown (simplified)
   */
  private calculateDrawdown(currentPnL: number): number {
    // In a real implementation, this would calculate actual drawdown
    // For now, return a random drawdown between 0 and 10%
    return Math.random() * 10;
  }

  /**
   * Update overall performance metrics
   */
  private updatePerformance() {
    const performance = this.state.performance;
    
    // Update profit factor
    performance.profitFactor = performance.losingTrades > 0
      ? (performance.winningTrades / performance.losingTrades)
      : performance.winningTrades > 0 ? 2 : 1;
    
    // Reset daily PnL at midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    
    if (new Date(performance.lastUpdated).getTime() < midnight.getTime()) {
      performance.dailyPnL = 0;
    }
    
    // Reset weekly PnL on Monday
    if (now.getDay() === 1 && new Date(performance.lastUpdated).getDay() !== 1) {
      performance.weeklyPnL = 0;
    }
    
    // Reset monthly PnL on first day of month
    if (now.getDate() === 1 && new Date(performance.lastUpdated).getDate() !== 1) {
      performance.monthlyPnL = 0;
    }
    
    // Update last updated timestamp
    performance.lastUpdated = Date.now();
    
    // Emit performance update event
    this.emit("performanceUpdate", {
      agentId: this.agent.id,
      performance,
      timestamp: Date.now()
    });
  }

  /**
   * Check for any necessary alerts
   */
  private checkAlerts() {
    const { performance } = this.state;
    
    // Check for large drawdown
    if (performance.drawdown > 15) {
      this.addAlert(
        AlertLevel.WARNING,
        `High drawdown detected: ${performance.drawdown.toFixed(2)}%`
      );
    }
    
    // Check for very large drawdown
    if (performance.drawdown > 25) {
      this.addAlert(
        AlertLevel.CRITICAL,
        `Critical drawdown detected: ${performance.drawdown.toFixed(2)}%`
      );
      
      // Auto-pause trading
      this.pauseTrading();
    }
    
    // Check for low win rate
    if (performance.totalTrades > 10 && performance.winRate < 40) {
      this.addAlert(
        AlertLevel.WARNING,
        `Low win rate detected: ${performance.winRate.toFixed(2)}%`
      );
    }
  }

  /**
   * Add an alert
   */
  private addAlert(level: AlertLevel, message: string): void {
    const alert: AgentAlert = {
      id: `alert-${this.agent.id}-${Date.now()}-${this.alertCount++}`,
      agentId: this.agent.id,
      level,
      message,
      timestamp: Date.now(),
      acknowledged: false,
    };
    
    this.state.alerts.push(alert);
    
    // Limit alerts to 100
    if (this.state.alerts.length > 100) {
      this.state.alerts.shift();
    }
    
    // Emit alert event
    this.emit("alert", alert);
    
    // Send to socket if available
    if (this.socket) {
      this.socket.emit(TRADING_EVENTS.AGENT_ALERT, alert);
    }
  }

  /**
   * Acknowledge an alert
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.state.alerts.find(a => a.id === alertId);
    
    if (alert) {
      alert.acknowledged = true;
      this.emit("alertAcknowledged", {
        agentId: this.agent.id,
        alertId,
        timestamp: Date.now(),
      });
      return true;
    }
    
    return false;
  }

  /**
   * Get all alerts
   */
  public getAlerts(acknowledgedOnly: boolean = false): AgentAlert[] {
    return this.state.alerts.filter(a => acknowledgedOnly ? a.acknowledged : true);
  }

  /**
   * Get current state
   */
  public getState(): AgentMonitorState {
    return { ...this.state };
  }

  /**
   * Add event listener
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  /**
   * Remove event listener
   */
  public off(event: string, callback: Function): void {
    if (!this.eventListeners[event]) return;
    
    this.eventListeners[event] = this.eventListeners[event].filter(
      listener => listener !== callback
    );
  }

  /**
   * Emit event
   */
  private emit(event: string, data: any): void {
    if (!this.eventListeners[event]) return;
    
    for (const listener of this.eventListeners[event]) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stopMonitoring();
    
    // Remove socket listeners
    if (this.socket) {
      this.socket.off(TRADING_EVENTS.AGENT_COMMAND);
    }
    
    // Clear all event listeners
    this.eventListeners = {};
  }
}

/**
 * React hook for using the agent monitor
 */
export function useAgentMonitor(
  agent: AIAgentV2,
  exchangeConnector: ExchangeConnector,
  strategyEngine: StrategyEngine,
  socket?: Socket | null
) {
  const { toast } = useToast();
  
  // Create a new agent monitor instance (in a real app, this would be done with useState/useRef)
  const monitor = new AgentMonitor(agent, exchangeConnector, strategyEngine, socket || null);
  
  // Initialize with toast notification
  const initializeWithToast = async () => {
    try {
      const success = await monitor.initialize();
      if (success) {
        toast({
          title: "Agent Monitoring Started",
          description: `Now monitoring agent ${agent.name}`,
        });
      }
      return success;
    } catch (error) {
      toast({
        title: "Monitoring Failed",
        description: `Failed to initialize agent monitoring: ${(error as Error).message}`,
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Start trading with toast notification
  const startTradingWithToast = () => {
    try {
      const success = monitor.startTrading();
      if (success) {
        toast({
          title: "Agent Started",
          description: `Agent ${agent.name} is now trading`,
        });
      }
      return success;
    } catch (error) {
      toast({
        title: "Start Failed",
        description: `Failed to start agent: ${(error as Error).message}`,
        variant: "destructive",
      });
      return false;
    }
  };
  
  // Stop trading with toast notification
  const stopTradingWithToast = () => {
    try {
      const success = monitor.stopTrading();
      if (success) {
        toast({
          title: "Agent Stopped",
          description: `Agent ${agent.name} has stopped trading`,
        });
      }
      return success;
    } catch (error) {
      toast({
        title: "Stop Failed",
        description: `Failed to stop agent: ${(error as Error).message}`,
        variant: "destructive",
      });
      return false;
    }
  };
  
  return {
    monitor,
    initialize: initializeWithToast,
    startTrading: startTradingWithToast,
    stopTrading: stopTradingWithToast,
    pauseTrading: () => monitor.pauseTrading(),
    executeNow: () => monitor.executeNow(),
    updateSettings: (settings: any) => monitor.updateSettings(settings),
    getState: () => monitor.getState(),
    getAlerts: (acknowledgedOnly: boolean = false) => monitor.getAlerts(acknowledgedOnly),
    acknowledgeAlert: (alertId: string) => monitor.acknowledgeAlert(alertId),
    on: (event: string, callback: Function) => monitor.on(event, callback),
    off: (event: string, callback: Function) => monitor.off(event, callback),
    dispose: () => monitor.dispose(),
  };
}
