"""
Machine Learning Prediction Pipeline Module

Implements ML-based prediction capabilities for market data analysis,
supporting model training, evaluation, and real-time predictions.
"""

import os
import logging
import datetime
import json
import pickle
import asyncio
from typing import Dict, List, Any, Optional, Union, Tuple, Callable
import uuid
from enum import Enum
from pathlib import Path

import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib

from .timeseries_db import TimeSeriesDB, get_timeseries_db
from .analytics_pipeline import DataEvent, DataProcessor, get_analytics_pipeline


logger = logging.getLogger("data.ml_predictions")


class PredictionHorizon(Enum):
    """Time horizons for predictions."""
    SHORT = "short"  # Minutes to hours
    MEDIUM = "medium"  # Hours to days
    LONG = "long"  # Days to weeks


class ModelType(Enum):
    """Types of ML models supported."""
    LINEAR = "linear"
    RANDOM_FOREST = "random_forest"
    GRADIENT_BOOSTING = "gradient_boosting"
    LSTM = "lstm"
    CUSTOM = "custom"


class FeatureType(Enum):
    """Types of features used for predictions."""
    PRICE = "price"
    VOLUME = "volume"
    TECHNICAL = "technical"
    SENTIMENT = "sentiment"
    FUNDAMENTAL = "fundamental"
    CUSTOM = "custom"


class ModelMetadata:
    """Metadata for ML models."""
    
    def __init__(
        self,
        model_id: str,
        model_type: ModelType,
        exchange: str,
        symbol: str,
        resolution: str,
        features: List[str],
        target: str,
        horizon: PredictionHorizon,
        training_start: datetime.datetime,
        training_end: datetime.datetime,
        metrics: Dict[str, float] = None
    ):
        """
        Initialize model metadata.
        
        Args:
            model_id: Model ID
            model_type: Type of model
            exchange: Exchange
            symbol: Trading symbol
            resolution: Data resolution
            features: Feature columns
            target: Target column
            horizon: Prediction horizon
            training_start: Training start time
            training_end: Training end time
            metrics: Optional evaluation metrics
        """
        self.model_id = model_id
        self.model_type = model_type
        self.exchange = exchange
        self.symbol = symbol
        self.resolution = resolution
        self.features = features
        self.target = target
        self.horizon = horizon
        self.training_start = training_start
        self.training_end = training_end
        self.metrics = metrics or {}
        self.created_at = datetime.datetime.now()
        self.updated_at = self.created_at
        self.version = 1
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert to dictionary.
        
        Returns:
            Dictionary representation
        """
        return {
            "model_id": self.model_id,
            "model_type": self.model_type.value,
            "exchange": self.exchange,
            "symbol": self.symbol,
            "resolution": self.resolution,
            "features": self.features,
            "target": self.target,
            "horizon": self.horizon.value,
            "training_start": self.training_start.isoformat(),
            "training_end": self.training_end.isoformat(),
            "metrics": self.metrics,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "version": self.version
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ModelMetadata':
        """
        Create from dictionary.
        
        Args:
            data: Dictionary representation
            
        Returns:
            ModelMetadata instance
        """
        metadata = cls(
            model_id=data["model_id"],
            model_type=ModelType(data["model_type"]),
            exchange=data["exchange"],
            symbol=data["symbol"],
            resolution=data["resolution"],
            features=data["features"],
            target=data["target"],
            horizon=PredictionHorizon(data["horizon"]),
            training_start=datetime.datetime.fromisoformat(data["training_start"]),
            training_end=datetime.datetime.fromisoformat(data["training_end"]),
            metrics=data.get("metrics", {})
        )
        
        if "created_at" in data:
            metadata.created_at = datetime.datetime.fromisoformat(data["created_at"])
        if "updated_at" in data:
            metadata.updated_at = datetime.datetime.fromisoformat(data["updated_at"])
        if "version" in data:
            metadata.version = data["version"]
            
        return metadata


class FeatureEngineering:
    """Feature engineering for ML models."""
    
    @staticmethod
    def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
        """
        Add technical indicators to dataframe.
        
        Args:
            df: Price dataframe with OHLCV data
            
        Returns:
            Dataframe with added indicators
        """
        result = df.copy()
        
        # Simple Moving Averages
        for window in [5, 10, 20, 50, 200]:
            if len(df) >= window:
                result[f'sma_{window}'] = df['close'].rolling(window=window).mean()
        
        # Exponential Moving Averages
        for window in [5, 10, 20, 50, 200]:
            if len(df) >= window:
                result[f'ema_{window}'] = df['close'].ewm(span=window, adjust=False).mean()
        
        # MACD
        if len(df) >= 26:
            result['ema_12'] = df['close'].ewm(span=12, adjust=False).mean()
            result['ema_26'] = df['close'].ewm(span=26, adjust=False).mean()
            result['macd'] = result['ema_12'] - result['ema_26']
            if len(df) >= 35:  # 26 + 9
                result['macd_signal'] = result['macd'].ewm(span=9, adjust=False).mean()
                result['macd_hist'] = result['macd'] - result['macd_signal']
        
        # RSI
        if len(df) >= 14:
            delta = df['close'].diff()
            gain = delta.where(delta > 0, 0)
            loss = -delta.where(delta < 0, 0)
            
            avg_gain = gain.rolling(window=14).mean()
            avg_loss = loss.rolling(window=14).mean()
            
            rs = avg_gain / avg_loss
            result['rsi_14'] = 100 - (100 / (1 + rs))
        
        # Bollinger Bands
        if len(df) >= 20:
            result['bb_middle'] = df['close'].rolling(window=20).mean()
            result['bb_std'] = df['close'].rolling(window=20).std()
            result['bb_upper'] = result['bb_middle'] + 2 * result['bb_std']
            result['bb_lower'] = result['bb_middle'] - 2 * result['bb_std']
            result['bb_width'] = (result['bb_upper'] - result['bb_lower']) / result['bb_middle']
        
        # Price change features
        result['price_change_1'] = df['close'].pct_change(1)
        if len(df) >= 5:
            result['price_change_5'] = df['close'].pct_change(5)
        if len(df) >= 10:
            result['price_change_10'] = df['close'].pct_change(10)
        
        # Volume features
        result['volume_change_1'] = df['volume'].pct_change(1)
        result['volume_sma_5'] = df['volume'].rolling(window=5).mean()
        
        # Drop NaN values
        result = result.dropna()
        
        return result
    
    @staticmethod
    def create_target_variable(
        df: pd.DataFrame,
        horizon: PredictionHorizon,
        target_col: str = 'close'
    ) -> pd.DataFrame:
        """
        Create target variable for prediction.
        
        Args:
            df: Dataframe with features
            horizon: Prediction horizon
            target_col: Target column
            
        Returns:
            Dataframe with target variable
        """
        result = df.copy()
        
        # Map horizon to shift periods
        horizon_map = {
            PredictionHorizon.SHORT: 1,  # Next period
            PredictionHorizon.MEDIUM: 6,  # 6 periods ahead
            PredictionHorizon.LONG: 24   # 24 periods ahead
        }
        
        periods = horizon_map.get(horizon, 1)
        
        # Create future price
        result['future_price'] = df[target_col].shift(-periods)
        
        # Create return as target
        result['future_return'] = result['future_price'] / df[target_col] - 1
        
        # Create direction as target (binary)
        result['future_direction'] = (result['future_price'] > df[target_col]).astype(int)
        
        # Drop rows with NaN targets
        result = result.dropna(subset=['future_price', 'future_return', 'future_direction'])
        
        return result
    
    @staticmethod
    def prepare_features_targets(
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: str = 'future_return'
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare features and target for model training.
        
        Args:
            df: Dataframe with features and targets
            feature_cols: Feature columns
            target_col: Target column
            
        Returns:
            Features and target
        """
        features = df[feature_cols].copy()
        target = df[target_col].copy()
        
        return features, target


class ModelManager:
    """Manager for ML models."""
    
    def __init__(self, model_dir: str = 'models'):
        """
        Initialize model manager.
        
        Args:
            model_dir: Directory for model storage
        """
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.timeseries_db = None
        
        # Scalers for feature normalization
        self.scalers: Dict[str, Any] = {}
    
    async def initialize(self) -> None:
        """Initialize the model manager."""
        if self.timeseries_db is None:
            self.timeseries_db = await get_timeseries_db()
    
    def _get_model_path(self, model_id: str) -> Path:
        """Get path for model file."""
        return self.model_dir / f"{model_id}.joblib"
    
    def _get_metadata_path(self, model_id: str) -> Path:
        """Get path for model metadata file."""
        return self.model_dir / f"{model_id}_metadata.json"
    
    def _get_scaler_path(self, model_id: str) -> Path:
        """Get path for model scaler file."""
        return self.model_dir / f"{model_id}_scaler.joblib"
    
    def _create_model(self, model_type: ModelType, **kwargs) -> Any:
        """
        Create a model based on type.
        
        Args:
            model_type: Type of model
            kwargs: Additional parameters
            
        Returns:
            Model instance
        """
        if model_type == ModelType.LINEAR:
            return LinearRegression(**kwargs)
        elif model_type == ModelType.RANDOM_FOREST:
            return RandomForestRegressor(**kwargs)
        elif model_type == ModelType.GRADIENT_BOOSTING:
            return GradientBoostingRegressor(**kwargs)
        elif model_type == ModelType.LSTM:
            # LSTM requires additional setup with frameworks like TensorFlow/Keras
            # This is a placeholder for demonstration
            logger.warning("LSTM models are not fully implemented")
            return None
        else:
            logger.error(f"Unsupported model type: {model_type}")
            return None
    
    def _evaluate_model(
        self,
        model: Any,
        X_test: pd.DataFrame,
        y_test: pd.Series
    ) -> Dict[str, float]:
        """
        Evaluate model performance.
        
        Args:
            model: Trained model
            X_test: Test features
            y_test: Test target
            
        Returns:
            Evaluation metrics
        """
        predictions = model.predict(X_test)
        
        return {
            "mse": mean_squared_error(y_test, predictions),
            "rmse": np.sqrt(mean_squared_error(y_test, predictions)),
            "mae": mean_absolute_error(y_test, predictions),
            "r2": r2_score(y_test, predictions)
        }
    
    async def train_model(
        self,
        exchange: str,
        symbol: str,
        resolution: str,
        model_type: ModelType,
        features: List[str],
        target: str,
        horizon: PredictionHorizon,
        start_time: datetime.datetime,
        end_time: datetime.datetime,
        test_size: float = 0.2,
        model_params: Dict[str, Any] = None
    ) -> Optional[str]:
        """
        Train a new model.
        
        Args:
            exchange: Exchange name
            symbol: Trading symbol
            resolution: Data resolution
            model_type: Type of model
            features: Feature columns
            target: Target column
            horizon: Prediction horizon
            start_time: Training start time
            end_time: Training end time
            test_size: Test set size
            model_params: Additional model parameters
            
        Returns:
            Model ID if successful, None otherwise
        """
        try:
            await self.initialize()
            
            # Generate model ID
            model_id = f"{exchange}_{symbol}_{resolution}_{model_type.value}_{horizon.value}_{uuid.uuid4().hex[:8]}"
            
            # Fetch historical data
            data = await self.timeseries_db.query_market_data(
                exchange=exchange,
                symbol=symbol,
                resolution=resolution,
                start_time=start_time,
                end_time=end_time
            )
            
            if data is None or data.empty:
                logger.error(f"No data available for {exchange}:{symbol}:{resolution}")
                return None
            
            # Feature engineering
            data = FeatureEngineering.add_technical_indicators(data)
            data = FeatureEngineering.create_target_variable(data, horizon)
            
            # Check if we have all required features
            missing_features = [f for f in features if f not in data.columns]
            if missing_features:
                logger.error(f"Missing features: {missing_features}")
                return None
            
            # Prepare features and target
            X, y = FeatureEngineering.prepare_features_targets(
                data, features, target
            )
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, shuffle=False
            )
            
            # Create and fit scaler
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            # Convert back to dataframes for convenience
            X_train_scaled = pd.DataFrame(
                X_train_scaled, columns=X_train.columns, index=X_train.index
            )
            X_test_scaled = pd.DataFrame(
                X_test_scaled, columns=X_test.columns, index=X_test.index
            )
            
            # Create and train model
            model = self._create_model(model_type, **(model_params or {}))
            if model is None:
                return None
                
            model.fit(X_train_scaled, y_train)
            
            # Evaluate model
            metrics = self._evaluate_model(model, X_test_scaled, y_test)
            logger.info(f"Model {model_id} trained with metrics: {metrics}")
            
            # Create metadata
            metadata = ModelMetadata(
                model_id=model_id,
                model_type=model_type,
                exchange=exchange,
                symbol=symbol,
                resolution=resolution,
                features=features,
                target=target,
                horizon=horizon,
                training_start=start_time,
                training_end=end_time,
                metrics=metrics
            )
            
            # Save model, scaler, and metadata
            joblib.dump(model, self._get_model_path(model_id))
            joblib.dump(scaler, self._get_scaler_path(model_id))
            
            with open(self._get_metadata_path(model_id), 'w') as f:
                json.dump(metadata.to_dict(), f, indent=2)
            
            return model_id
            
        except Exception as e:
            logger.error(f"Error training model: {str(e)}")
            return None
    
    def load_model(self, model_id: str) -> Tuple[Optional[Any], Optional[ModelMetadata]]:
        """
        Load a saved model.
        
        Args:
            model_id: Model ID
            
        Returns:
            Model and metadata
        """
        try:
            model_path = self._get_model_path(model_id)
            metadata_path = self._get_metadata_path(model_id)
            scaler_path = self._get_scaler_path(model_id)
            
            if not model_path.exists() or not metadata_path.exists():
                logger.error(f"Model {model_id} not found")
                return None, None
            
            # Load model
            model = joblib.load(model_path)
            
            # Load metadata
            with open(metadata_path, 'r') as f:
                metadata_dict = json.load(f)
            
            metadata = ModelMetadata.from_dict(metadata_dict)
            
            # Load scaler if exists
            if scaler_path.exists():
                self.scalers[model_id] = joblib.load(scaler_path)
            
            return model, metadata
            
        except Exception as e:
            logger.error(f"Error loading model {model_id}: {str(e)}")
            return None, None
    
    def get_model_metadata(self, model_id: str) -> Optional[ModelMetadata]:
        """
        Get model metadata.
        
        Args:
            model_id: Model ID
            
        Returns:
            Model metadata
        """
        try:
            metadata_path = self._get_metadata_path(model_id)
            
            if not metadata_path.exists():
                return None
            
            with open(metadata_path, 'r') as f:
                metadata_dict = json.load(f)
            
            return ModelMetadata.from_dict(metadata_dict)
            
        except Exception as e:
            logger.error(f"Error getting metadata for {model_id}: {str(e)}")
            return None
    
    def list_models(self) -> List[ModelMetadata]:
        """
        List all available models.
        
        Returns:
            List of model metadata
        """
        models = []
        
        for metadata_file in self.model_dir.glob("*_metadata.json"):
            try:
                with open(metadata_file, 'r') as f:
                    metadata_dict = json.load(f)
                
                metadata = ModelMetadata.from_dict(metadata_dict)
                models.append(metadata)
                
            except Exception as e:
                logger.error(f"Error loading metadata from {metadata_file}: {str(e)}")
        
        return models
    
    async def make_prediction(
        self,
        model_id: str,
        current_data: Optional[pd.DataFrame] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Make prediction using model.
        
        Args:
            model_id: Model ID
            current_data: Optional current data (if not provided, latest data will be fetched)
            
        Returns:
            Prediction results
        """
        await self.initialize()
        
        try:
            # Load model and metadata
            model, metadata = self.load_model(model_id)
            if model is None or metadata is None:
                return None
            
            # Get data if not provided
            if current_data is None:
                # Calculate time range based on required features
                end_time = datetime.datetime.now()
                # We need enough data for technical indicators
                start_time = end_time - datetime.timedelta(days=30)
                
                current_data = await self.timeseries_db.query_market_data(
                    exchange=metadata.exchange,
                    symbol=metadata.symbol,
                    resolution=metadata.resolution,
                    start_time=start_time,
                    end_time=end_time
                )
                
                if current_data is None or current_data.empty:
                    logger.error(f"No data available for prediction")
                    return None
            
            # Feature engineering
            current_data = FeatureEngineering.add_technical_indicators(current_data)
            
            # Get latest data point
            latest_data = current_data.iloc[-1:].copy()
            
            # Ensure all features are available
            for feature in metadata.features:
                if feature not in latest_data.columns:
                    logger.error(f"Missing feature for prediction: {feature}")
                    return None
            
            # Extract features
            features = latest_data[metadata.features]
            
            # Apply scaler if available
            if model_id in self.scalers:
                features_scaled = self.scalers[model_id].transform(features)
                features = pd.DataFrame(
                    features_scaled, columns=features.columns, index=features.index
                )
            
            # Make prediction
            prediction = model.predict(features)[0]
            
            # Get current price
            current_price = latest_data['close'].iloc[0]
            
            # Prepare result
            result = {
                "model_id": model_id,
                "timestamp": datetime.datetime.now().isoformat(),
                "exchange": metadata.exchange,
                "symbol": metadata.symbol,
                "resolution": metadata.resolution,
                "current_price": current_price,
            }
            
            # Add target-specific predictions
            if metadata.target == 'future_price':
                result["predicted_price"] = prediction
                result["predicted_change"] = prediction / current_price - 1
            elif metadata.target == 'future_return':
                result["predicted_return"] = prediction
                result["predicted_price"] = current_price * (1 + prediction)
            elif metadata.target == 'future_direction':
                result["predicted_direction"] = "up" if prediction > 0.5 else "down"
                result["confidence"] = abs(prediction - 0.5) * 2  # Scale to 0-1
            
            return result
            
        except Exception as e:
            logger.error(f"Error making prediction: {str(e)}")
            return None
    
    def delete_model(self, model_id: str) -> bool:
        """
        Delete a model.
        
        Args:
            model_id: Model ID
            
        Returns:
            True if successful
        """
        try:
            model_path = self._get_model_path(model_id)
            metadata_path = self._get_metadata_path(model_id)
            scaler_path = self._get_scaler_path(model_id)
            
            # Delete files if they exist
            if model_path.exists():
                model_path.unlink()
                
            if metadata_path.exists():
                metadata_path.unlink()
                
            if scaler_path.exists():
                scaler_path.unlink()
                
            # Remove from scalers dict
            if model_id in self.scalers:
                del self.scalers[model_id]
                
            return True
            
        except Exception as e:
            logger.error(f"Error deleting model {model_id}: {str(e)}")
            return False


class PredictionProcessor(DataProcessor):
    """Processor for real-time predictions."""
    
    def __init__(
        self,
        model_manager: ModelManager,
        model_id: str
    ):
        """
        Initialize prediction processor.
        
        Args:
            model_manager: Model manager
            model_id: Model ID to use
        """
        super().__init__(f"prediction_{model_id}")
        self.model_manager = model_manager
        self.model_id = model_id
        self.metadata = None
        self.buffer = {}
    
    async def initialize(self) -> bool:
        """Initialize the processor."""
        self.metadata = self.model_manager.get_model_metadata(self.model_id)
        return self.metadata is not None
    
    def _get_buffer_key(self, event: DataEvent) -> str:
        """Get buffer key for event."""
        data = event.data
        return f"{data['exchange']}:{data['symbol']}:{data['resolution']}"
    
    async def process(self, event: DataEvent) -> Optional[DataEvent]:
        """
        Process data event.
        
        Args:
            event: Input event
            
        Returns:
            Prediction event or None
        """
        if not self.metadata:
            return None
            
        # Only process market data events
        if event.event_type != "market_data":
            return None
            
        data = event.data
        
        # Check if data matches model configuration
        if (data['exchange'] != self.metadata.exchange or
                data['symbol'] != self.metadata.symbol or
                data['resolution'] != self.metadata.resolution):
            return None
            
        # Get buffer key
        key = self._get_buffer_key(event)
        
        # Initialize buffer if needed
        if key not in self.buffer:
            self.buffer[key] = pd.DataFrame()
        
        # Add data to buffer
        new_row = pd.DataFrame([{
            'open': data.get('open'),
            'high': data.get('high'),
            'low': data.get('low'),
            'close': data.get('close'),
            'volume': data.get('volume')
        }], index=[event.timestamp])
        
        self.buffer[key] = pd.concat([self.buffer[key], new_row])
        
        # Keep buffer within reasonable size
        max_size = 500  # Enough for technical indicators
        if len(self.buffer[key]) > max_size:
            self.buffer[key] = self.buffer[key].iloc[-max_size:]
        
        # Only make prediction if we have enough data
        if len(self.buffer[key]) >= 200:  # Need enough data for technical indicators
            # Make prediction
            prediction = await self.model_manager.make_prediction(
                self.model_id, self.buffer[key]
            )
            
            if prediction:
                # Create prediction event
                result = DataEvent(
                    event_type="prediction",
                    timestamp=event.timestamp,
                    data={
                        "exchange": data["exchange"],
                        "symbol": data["symbol"],
                        "resolution": data["resolution"],
                        "current_price": data.get("close"),
                        **prediction
                    },
                    metadata={
                        "processor": self.name,
                        "model_id": self.model_id,
                        "original_event_id": event.id
                    }
                )
                
                return result
        
        return None


# Singleton instance
_model_manager_instance = None


async def get_model_manager() -> ModelManager:
    """
    Get the singleton model manager instance.
    
    Returns:
        ModelManager instance
    """
    global _model_manager_instance
    
    if _model_manager_instance is None:
        _model_manager_instance = ModelManager()
        await _model_manager_instance.initialize()
    
    return _model_manager_instance


# Helper functions for common ML tasks
async def train_price_prediction_model(
    exchange: str,
    symbol: str,
    resolution: str = "1h",
    days_of_data: int = 60,
    model_type: ModelType = ModelType.RANDOM_FOREST,
    horizon: PredictionHorizon = PredictionHorizon.MEDIUM
) -> Optional[str]:
    """
    Train a price prediction model.
    
    Args:
        exchange: Exchange name
        symbol: Trading symbol
        resolution: Data resolution
        days_of_data: Days of historical data
        model_type: Model type
        horizon: Prediction horizon
        
    Returns:
        Model ID if successful
    """
    manager = await get_model_manager()
    
    # Calculate time range
    end_time = datetime.datetime.now()
    start_time = end_time - datetime.timedelta(days=days_of_data)
    
    # Standard features for price prediction
    features = [
        'close', 'volume', 'price_change_1', 'price_change_5',
        'volume_change_1', 'rsi_14', 'sma_20', 'ema_20',
        'macd', 'bb_width'
    ]
    
    # Train model
    model_id = await manager.train_model(
        exchange=exchange,
        symbol=symbol,
        resolution=resolution,
        model_type=model_type,
        features=features,
        target='future_return',
        horizon=horizon,
        start_time=start_time,
        end_time=end_time,
        test_size=0.2,
        model_params={
            'n_estimators': 100,
            'max_depth': 10,
            'random_state': 42
        }
    )
    
    return model_id


async def add_prediction_processor_to_pipeline(
    model_id: str,
    pipeline=None
) -> bool:
    """
    Add prediction processor to analytics pipeline.
    
    Args:
        model_id: Model ID to use
        pipeline: Optional pipeline instance
        
    Returns:
        True if successful
    """
    try:
        # Get model manager
        manager = await get_model_manager()
        
        # Create processor
        processor = PredictionProcessor(manager, model_id)
        if not await processor.initialize():
            logger.error(f"Failed to initialize prediction processor for {model_id}")
            return False
        
        # Get pipeline
        if pipeline is None:
            pipeline = await get_analytics_pipeline()
        
        # Add processor
        await pipeline.add_processor(processor)
        
        return True
        
    except Exception as e:
        logger.error(f"Error adding prediction processor: {str(e)}")
        return False
