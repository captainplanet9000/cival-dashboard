# __init__.py for models
from .api_models import (
    TradingAnalysisCrewRequest,
    TradingSignal,
    BaseResponseModel,
    ErrorDetail,
    TradeDecisionAction,
    TradingDecision,
    ExecuteTradeRequest,
    ExecuteTradeResponse,
    RegisterAgentRequest,
    RegisterAgentResponse,
    AgentStatusResponse,
    AgentTradingHistoryResponse,
    TradeExecutionResult,
    SetTradeExecutionModeRequest,
    SetTradeExecutionModeResponse,
    GetTradeExecutionModeResponse
)

from .paper_trading_models import (
    PaperTradeOrder,
    PaperTradeFill,
    PaperAccountSummary
)

from .trading_history_models import (
    TradeSide,
    OrderStatus,
    OrderType,
    TradeRecord,
    TradingHistory
)

from .hyperliquid_models import (
    HyperliquidCredentials,
    HyperliquidPlaceOrderParams,
    HyperliquidOrderResponseData,
    HyperliquidOrderStatusInfo,
    HyperliquidAssetPosition,
    HyperliquidOpenOrderItem,
    HyperliquidMarginSummary,
    HyperliquidAccountSnapshot
)

from .agent_models import (
    AgentStrategyConfig,
    AgentRiskConfig,
    AgentConfigBase,
    AgentConfigInput,
    AgentConfigOutput,
    AgentStatus,
    AgentUpdateRequest
)

from .dashboard_models import (
    AssetPositionSummary,
    PortfolioSummary,
    TradeLogItem,
    OrderLogItem
)

from .performance_models import (
    PerformanceMetrics
)

from .alert_models import (
    AlertCondition,
    AlertConfigBase,
    AlertConfigInput,
    AlertConfigOutput,
    AlertNotification
)

__all__ = [
    # api_models
    "TradingAnalysisCrewRequest", "TradingSignal", "BaseResponseModel", "ErrorDetail",
    "TradeDecisionAction", "TradingDecision", "ExecuteTradeRequest", "ExecuteTradeResponse",
    "RegisterAgentRequest", "RegisterAgentResponse", "AgentStatusResponse",
    "AgentTradingHistoryResponse", "TradeExecutionResult",
    "SetTradeExecutionModeRequest", "SetTradeExecutionModeResponse", "GetTradeExecutionModeResponse",
    # paper_trading_models
    "PaperTradeOrder", "PaperTradeFill", "PaperAccountSummary",
    # trading_history_models
    "TradeSideType", "OrderStatusType", "OrderTypeType",
    "TradeRecord", "TradingHistory", "TradeFillData",
    # hyperliquid_models
    "HyperliquidCredentials", "HyperliquidPlaceOrderParams", "HyperliquidOrderResponseData",
    "HyperliquidOrderStatusInfo", "HyperliquidAssetPosition", "HyperliquidOpenOrderItem",
    "HyperliquidMarginSummary", "HyperliquidAccountSnapshot",
    # agent_models
    "AgentStrategyConfig", "AgentRiskConfig", "AgentConfigBase", "AgentConfigInput",
    "AgentConfigOutput", "AgentStatus", "AgentUpdateRequest",
    "AgentStrategyConfig.DarvasStrategyParams",
    "AgentStrategyConfig.WilliamsAlligatorParams",
    "AgentStrategyConfig.MarketConditionClassifierParams",
    "AgentStrategyConfig.PortfolioOptimizerRule", # For exporting nested models
    "AgentStrategyConfig.PortfolioOptimizerParams",
    "AgentStrategyConfig.NewsAnalysisParams", # Added
    # dashboard_models
    "AssetPositionSummary", "PortfolioSummary", "TradeLogItem", "OrderLogItem",
    # performance_models
    "PerformanceMetrics",
    # alert_models
    "AlertCondition", "AlertConfigBase", "AlertConfigInput", "AlertConfigOutput", "AlertNotification",
    # event_bus_models
    "Event", "TradeSignalEventPayload", "MarketInsightEventPayload", "RiskAlertEventPayload",
    "RiskAssessmentRequestData", "RiskAssessmentResponseData", "NewsArticleEventPayload", # Added
    # db_models
    "AgentConfigDB"
]
