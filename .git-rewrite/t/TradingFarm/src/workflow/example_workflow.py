import logging
import asyncio
from typing import Dict, List, Any

from ..strategies.elliott_wave import ElliottWaveStrategy
from ..strategies.darvas_box import DarvasBoxStrategy
from ..strategies.renko import RenkoChartStrategy
from ..strategies.ichimoku import IchimokuCloudStrategy
from ..strategies.alligator import AlligatorStrategy
from .base import Workflow, WorkflowScheduler
from .data_ingestion import (
    HyperliquidDataFetchStep,
    SonicDataFetchStep, 
    VertexDataFetchStep,
    MarketDepthFetchStep,
    DataCleaningStep,
    DataMergeStep
)
from .signal_generation import (
    StrategyInitializationStep,
    DataUpdateStep,
    SignalGenerationStep,
    SignalFilterStep,
    SignalAggregationStep,
    SignalPersistenceStep
)
from .order_execution import (
    SignalBasedOrderExecutionStep,
    OrderVerificationStep,
    OrderPersistenceStep
)
from .risk_management import (
    PositionMonitoringStep,
    StopLossManagementStep,
    TakeProfitManagementStep,
    RiskMetricsCalculationStep,
    RiskAlertStep
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def create_hyperliquid_trading_workflow(
    symbols: List[str] = None,
    timeframes: List[str] = None
) -> Workflow:
    """
    Create a complete trading workflow for Hyperliquid exchange.
    
    This workflow includes:
    1. Data ingestion
    2. Signal generation
    3. Order execution
    4. Risk management
    
    Args:
        symbols: List of trading symbols (e.g., ["BTC-USDT", "ETH-USDT"])
        timeframes: List of timeframes to analyze (e.g., ["1h", "4h", "1d"])
    
    Returns:
        A configured Workflow instance
    """
    # Default values if not provided
    symbols = symbols or ["BTC-USDT", "ETH-USDT", "SOL-USDT"]
    timeframes = timeframes or ["15m", "1h", "4h", "1d"]
    
    # Create the workflow
    workflow = Workflow("Hyperliquid Trading Workflow")
    
    # 1. Data Ingestion Steps
    data_fetch_step = HyperliquidDataFetchStep(
        symbols=symbols,
        timeframes=timeframes,
        lookback_periods={"15m": 200, "1h": 200, "4h": 100, "1d": 100}
    )
    workflow.add_step(data_fetch_step)
    
    market_depth_step = MarketDepthFetchStep(
        exchange="hyperliquid",
        symbols=symbols,
        depth=10
    )
    workflow.add_step(market_depth_step)
    
    data_cleaning_step = DataCleaningStep(
        data_sources=["hyperliquid"]
    )
    workflow.add_step(data_cleaning_step, dependencies=[data_fetch_step])
    
    # 2. Strategy and Signal Generation Steps
    strategy_init_step = StrategyInitializationStep(
        strategies=[
            ElliottWaveStrategy,
            DarvasBoxStrategy,
            RenkoChartStrategy,
            IchimokuCloudStrategy,
            AlligatorStrategy
        ],
        timeframes=timeframes,
        symbols=symbols
    )
    workflow.add_step(strategy_init_step)
    
    data_update_step = DataUpdateStep(
        use_merged_data=False  # Using direct exchange data, not merged
    )
    workflow.add_step(data_update_step, dependencies=[strategy_init_step, data_cleaning_step])
    
    signal_generation_step = SignalGenerationStep()
    workflow.add_step(signal_generation_step, dependencies=[data_update_step])
    
    signal_filter_step = SignalFilterStep(
        min_confidence=0.65,
        max_signals_per_symbol=3
    )
    workflow.add_step(signal_filter_step, dependencies=[signal_generation_step])
    
    signal_aggregation_step = SignalAggregationStep(
        consensus_threshold=1.5,  # Lower threshold for example purposes
        timeframe_priority={
            "1d": 1.0,
            "4h": 0.8,
            "1h": 0.6,
            "15m": 0.4
        }
    )
    workflow.add_step(signal_aggregation_step, dependencies=[signal_filter_step])
    
    signal_persistence_step = SignalPersistenceStep(
        save_to_file=True,
        file_path="hyperliquid_signals.json"
    )
    workflow.add_step(signal_persistence_step, dependencies=[signal_aggregation_step])
    
    # 3. Order Execution Steps
    order_execution_step = SignalBasedOrderExecutionStep(
        exchange="hyperliquid",
        order_type="limit",  # Using limit orders for better execution
        position_sizing=0.05,  # Using 5% of account balance per position
        max_slippage_percent=0.3
    )
    workflow.add_step(order_execution_step, dependencies=[signal_aggregation_step])
    
    order_verification_step = OrderVerificationStep(
        exchange="hyperliquid",
        verification_retries=5,
        retry_delay_seconds=2
    )
    workflow.add_step(order_verification_step, dependencies=[order_execution_step])
    
    order_persistence_step = OrderPersistenceStep(
        save_to_file=True,
        file_path="hyperliquid_orders.json"
    )
    workflow.add_step(order_persistence_step, dependencies=[order_verification_step])
    
    # 4. Risk Management Steps
    position_monitoring_step = PositionMonitoringStep(
        exchange="hyperliquid",
        monitoring_interval_seconds=60
    )
    workflow.add_step(position_monitoring_step, dependencies=[order_verification_step])
    
    stop_loss_step = StopLossManagementStep(
        exchange="hyperliquid",
        default_stop_loss_pct=5.0,
        trailing_stop_enabled=True,
        trailing_activation_pct=2.0,
        trailing_distance_pct=2.0
    )
    workflow.add_step(stop_loss_step, dependencies=[position_monitoring_step])
    
    take_profit_step = TakeProfitManagementStep(
        exchange="hyperliquid",
        default_take_profit_pct=10.0,
        partial_tp_enabled=True,
        partial_tp_levels=[
            {'percent': 5.0, 'size_percent': 30.0},
            {'percent': 10.0, 'size_percent': 30.0},
            {'percent': 15.0, 'size_percent': 20.0},
            {'percent': 20.0, 'size_percent': 20.0}
        ]
    )
    workflow.add_step(take_profit_step, dependencies=[position_monitoring_step])
    
    risk_metrics_step = RiskMetricsCalculationStep(
        exchanges=["hyperliquid"]
    )
    workflow.add_step(risk_metrics_step, dependencies=[position_monitoring_step])
    
    risk_alert_step = RiskAlertStep(
        max_portfolio_exposure=2.0,
        max_position_concentration=30.0,
        max_drawdown_percent=5.0,
        alert_methods=["log"]  # Add other alert methods as needed
    )
    workflow.add_step(risk_alert_step, dependencies=[risk_metrics_step])
    
    return workflow


async def create_multi_exchange_workflow(
    symbols: Dict[str, List[str]] = None,
    timeframes: List[str] = None
) -> Workflow:
    """
    Create a complete trading workflow for multiple exchanges.
    
    This workflow integrates data from Hyperliquid, Sonic, and Vertex exchanges
    and manages trading across all platforms.
    
    Args:
        symbols: Dictionary mapping exchange names to symbol lists
        timeframes: List of timeframes to analyze
    
    Returns:
        A configured Workflow instance
    """
    # Default values if not provided
    symbols = symbols or {
        "hyperliquid": ["BTC-USDT", "ETH-USDT"],
        "sonic": ["BTC-USDT", "ETH-USDT"],
        "vertex": ["BTC-USDT", "ETH-USDT"]
    }
    timeframes = timeframes or ["1h", "4h", "1d"]
    
    # Create the workflow
    workflow = Workflow("Multi-Exchange Trading Workflow")
    
    # 1. Data Ingestion Steps - One per exchange
    hyperliquid_data_step = HyperliquidDataFetchStep(
        symbols=symbols["hyperliquid"],
        timeframes=timeframes
    )
    workflow.add_step(hyperliquid_data_step)
    
    sonic_data_step = SonicDataFetchStep(
        symbols=symbols["sonic"],
        timeframes=timeframes
    )
    workflow.add_step(sonic_data_step)
    
    vertex_data_step = VertexDataFetchStep(
        symbols=symbols["vertex"],
        timeframes=timeframes
    )
    workflow.add_step(vertex_data_step)
    
    data_cleaning_step = DataCleaningStep(
        data_sources=["hyperliquid", "sonic", "vertex"]
    )
    workflow.add_step(data_cleaning_step, dependencies=[
        hyperliquid_data_step, sonic_data_step, vertex_data_step
    ])
    
    data_merge_step = DataMergeStep(
        target_exchange="hyperliquid"  # Use Hyperliquid as primary source
    )
    workflow.add_step(data_merge_step, dependencies=[data_cleaning_step])
    
    # 2. Strategy and Signal Generation Steps
    # Initialize strategies for each exchange's symbols
    all_symbols = list(set().union(*symbols.values()))
    
    strategy_init_step = StrategyInitializationStep(
        strategies=[
            ElliottWaveStrategy,
            DarvasBoxStrategy,
            RenkoChartStrategy,
            IchimokuCloudStrategy,
            AlligatorStrategy
        ],
        timeframes=timeframes,
        symbols=all_symbols
    )
    workflow.add_step(strategy_init_step)
    
    data_update_step = DataUpdateStep(
        use_merged_data=True  # Using merged data from all exchanges
    )
    workflow.add_step(data_update_step, dependencies=[
        strategy_init_step, data_merge_step
    ])
    
    signal_generation_step = SignalGenerationStep()
    workflow.add_step(signal_generation_step, dependencies=[data_update_step])
    
    signal_filter_step = SignalFilterStep(
        min_confidence=0.7,
        max_signals_per_symbol=2
    )
    workflow.add_step(signal_filter_step, dependencies=[signal_generation_step])
    
    signal_aggregation_step = SignalAggregationStep(
        consensus_threshold=1.8,
        timeframe_priority={
            "1d": 1.0,
            "4h": 0.7,
            "1h": 0.5
        }
    )
    workflow.add_step(signal_aggregation_step, dependencies=[signal_filter_step])
    
    signal_persistence_step = SignalPersistenceStep(
        save_to_file=True,
        file_path="multi_exchange_signals.json"
    )
    workflow.add_step(signal_persistence_step, dependencies=[signal_aggregation_step])
    
    # 3. Order Execution Steps - One per exchange
    order_execution_steps = []
    for exchange in symbols.keys():
        execution_step = SignalBasedOrderExecutionStep(
            exchange=exchange,
            order_type="limit",
            position_sizing=0.05,
            max_slippage_percent=0.3
        )
        workflow.add_step(execution_step, dependencies=[signal_aggregation_step])
        order_execution_steps.append(execution_step)
        
        verification_step = OrderVerificationStep(
            exchange=exchange,
            verification_retries=5
        )
        workflow.add_step(verification_step, dependencies=[execution_step])
    
    order_persistence_step = OrderPersistenceStep(
        save_to_file=True,
        file_path="multi_exchange_orders.json"
    )
    workflow.add_step(order_persistence_step, dependencies=order_execution_steps)
    
    # 4. Risk Management Steps - Consolidated across exchanges
    position_monitoring_steps = []
    for exchange in symbols.keys():
        monitoring_step = PositionMonitoringStep(
            exchange=exchange
        )
        workflow.add_step(monitoring_step, dependencies=order_execution_steps)
        position_monitoring_steps.append(monitoring_step)
        
        stop_loss_step = StopLossManagementStep(
            exchange=exchange,
            default_stop_loss_pct=5.0,
            trailing_stop_enabled=True
        )
        workflow.add_step(stop_loss_step, dependencies=[monitoring_step])
        
        take_profit_step = TakeProfitManagementStep(
            exchange=exchange,
            default_take_profit_pct=10.0,
            partial_tp_enabled=True
        )
        workflow.add_step(take_profit_step, dependencies=[monitoring_step])
    
    risk_metrics_step = RiskMetricsCalculationStep(
        exchanges=list(symbols.keys())
    )
    workflow.add_step(risk_metrics_step, dependencies=position_monitoring_steps)
    
    risk_alert_step = RiskAlertStep(
        max_portfolio_exposure=3.0,  # Higher limit for multi-exchange
        max_position_concentration=40.0,
        max_drawdown_percent=7.0
    )
    workflow.add_step(risk_alert_step, dependencies=[risk_metrics_step])
    
    return workflow


async def create_scheduled_workflow():
    """
    Create and schedule a trading workflow to run at regular intervals.
    """
    # Create a Hyperliquid workflow
    hyperliquid_workflow = await create_hyperliquid_trading_workflow()
    
    # Create a workflow scheduler
    scheduler = WorkflowScheduler()
    
    # Schedule the workflow to run every hour
    scheduler.schedule_workflow(
        workflow=hyperliquid_workflow,
        interval_seconds=3600,  # 1 hour
        initial_delay_seconds=0  # Start immediately
    )
    
    # Start the scheduler
    await scheduler.start()


async def main():
    """
    Main entry point for running the trading workflow.
    """
    logger.info("Starting trading workflow")
    
    # Option 1: Run a single workflow once
    workflow = await create_hyperliquid_trading_workflow()
    context = await workflow.execute()
    
    logger.info("Workflow execution completed")
    
    # Option 2: Run a scheduled workflow (uncomment to use)
    # await create_scheduled_workflow()
    
    return context


if __name__ == "__main__":
    # Run the main function
    asyncio.run(main())
