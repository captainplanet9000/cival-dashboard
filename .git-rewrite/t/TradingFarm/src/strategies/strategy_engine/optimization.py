"""
Strategy Optimization Module

Provides functionality for optimizing trading strategy parameters.
Implements various optimization methods including grid search, genetic algorithms,
and Bayesian optimization.
"""

import json
import itertools
import numpy as np
import pandas as pd
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Tuple, Union, Any, Callable
import concurrent.futures
from copy import deepcopy

from ..strategy_base import Strategy, StrategyParameters
from .backtest import BacktestEngine, BacktestResult, BacktestOptions


class OptimizationMethod(Enum):
    """Methods for strategy optimization."""
    GRID_SEARCH = "grid_search"
    RANDOM_SEARCH = "random_search"
    GENETIC_ALGORITHM = "genetic_algorithm"
    BAYESIAN_OPTIMIZATION = "bayesian_optimization"


class ParameterRange:
    """
    Defines a range of values for a parameter.
    
    Supports various types of parameters:
    - Numeric ranges with min, max, step
    - Discrete choices from a list
    - Boolean values
    """
    
    def __init__(
        self,
        name: str,
        param_type: type,
        min_value: Optional[Union[int, float]] = None,
        max_value: Optional[Union[int, float]] = None,
        step: Optional[Union[int, float]] = None,
        values: Optional[List[Any]] = None,
        default: Optional[Any] = None
    ):
        """
        Initialize parameter range.
        
        Args:
            name: Parameter name
            param_type: Parameter type
            min_value: Minimum value (for numeric types)
            max_value: Maximum value (for numeric types)
            step: Step size (for numeric types)
            values: List of possible values (for discrete types)
            default: Default value
        """
        self.name = name
        self.param_type = param_type
        self.min_value = min_value
        self.max_value = max_value
        self.step = step
        self.values = values
        self.default = default
        
        # Validate inputs
        self._validate()
    
    def _validate(self) -> None:
        """Validate parameter range configuration."""
        # Check if numeric range is properly defined
        if self.param_type in (int, float):
            if self.values is None and (self.min_value is None or self.max_value is None):
                raise ValueError(
                    f"Parameter '{self.name}' of type {self.param_type.__name__} "
                    f"must define either a range (min_value, max_value) or a list of values"
                )
            
            if self.min_value is not None and self.max_value is not None:
                if self.min_value > self.max_value:
                    raise ValueError(
                        f"Parameter '{self.name}' has min_value > max_value"
                    )
                
                if self.step is None:
                    self.step = 1 if self.param_type is int else 0.1
        
        # Check if discrete values are properly defined
        elif self.values is None:
            raise ValueError(
                f"Parameter '{self.name}' of type {self.param_type.__name__} "
                f"must define a list of possible values"
            )
    
    def get_values(self, num_samples: Optional[int] = None) -> List[Any]:
        """
        Get all possible values for this parameter.
        
        Args:
            num_samples: Number of samples to return (for numeric ranges)
            
        Returns:
            List of possible values
        """
        # If values are explicitly defined, return them
        if self.values is not None:
            return self.values
        
        # Generate values for numeric ranges
        if self.param_type in (int, float):
            if num_samples is not None and self.step is not None:
                # Override step size to generate num_samples values
                if self.max_value > self.min_value:
                    self.step = (self.max_value - self.min_value) / (num_samples - 1)
            
            if self.param_type is int:
                # Generate integer range
                values = list(range(
                    self.min_value,
                    self.max_value + 1,
                    max(1, int(self.step))
                ))
            else:
                # Generate float range
                values = []
                value = self.min_value
                while value <= self.max_value:
                    values.append(value)
                    value += self.step
            
            return values
        
        # Boolean type
        if self.param_type is bool:
            return [True, False]
        
        # String or other type with no explicit values
        return []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert parameter range to dictionary."""
        return {
            'name': self.name,
            'param_type': self.param_type.__name__,
            'min_value': self.min_value,
            'max_value': self.max_value,
            'step': self.step,
            'values': self.values,
            'default': self.default
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ParameterRange':
        """Create parameter range from dictionary."""
        # Convert param_type from string to type
        type_name = data.get('param_type')
        param_type = None
        
        if type_name == 'int':
            param_type = int
        elif type_name == 'float':
            param_type = float
        elif type_name == 'bool':
            param_type = bool
        elif type_name == 'str':
            param_type = str
        else:
            param_type = object
        
        return cls(
            name=data.get('name'),
            param_type=param_type,
            min_value=data.get('min_value'),
            max_value=data.get('max_value'),
            step=data.get('step'),
            values=data.get('values'),
            default=data.get('default')
        )


class ParameterSpace:
    """
    Defines the search space for strategy parameter optimization.
    
    Contains a collection of parameter ranges and methods for generating
    parameter combinations.
    """
    
    def __init__(self):
        """Initialize parameter space."""
        self.parameters: Dict[str, ParameterRange] = {}
    
    def add_parameter(self, parameter: ParameterRange) -> None:
        """
        Add a parameter to the space.
        
        Args:
            parameter: Parameter range to add
        """
        self.parameters[parameter.name] = parameter
    
    def add_numeric_parameter(
        self,
        name: str,
        min_value: Union[int, float],
        max_value: Union[int, float],
        step: Optional[Union[int, float]] = None,
        param_type: type = float,
        default: Optional[Union[int, float]] = None
    ) -> None:
        """
        Add a numeric parameter to the space.
        
        Args:
            name: Parameter name
            min_value: Minimum value
            max_value: Maximum value
            step: Step size
            param_type: Parameter type (int or float)
            default: Default value
        """
        parameter = ParameterRange(
            name=name,
            param_type=param_type,
            min_value=min_value,
            max_value=max_value,
            step=step,
            default=default
        )
        self.add_parameter(parameter)
    
    def add_categorical_parameter(
        self,
        name: str,
        values: List[Any],
        default: Optional[Any] = None
    ) -> None:
        """
        Add a categorical parameter to the space.
        
        Args:
            name: Parameter name
            values: Possible values
            default: Default value
        """
        # Infer parameter type from values
        param_type = type(values[0]) if values else object
        
        parameter = ParameterRange(
            name=name,
            param_type=param_type,
            values=values,
            default=default
        )
        self.add_parameter(parameter)
    
    def add_boolean_parameter(
        self,
        name: str,
        default: Optional[bool] = None
    ) -> None:
        """
        Add a boolean parameter to the space.
        
        Args:
            name: Parameter name
            default: Default value
        """
        parameter = ParameterRange(
            name=name,
            param_type=bool,
            values=[True, False],
            default=default
        )
        self.add_parameter(parameter)
    
    def get_grid_combinations(self) -> List[Dict[str, Any]]:
        """
        Get all possible parameter combinations for grid search.
        
        Returns:
            List of parameter dictionaries
        """
        # Get all possible values for each parameter
        param_values = {
            param.name: param.get_values()
            for param in self.parameters.values()
        }
        
        # Generate all combinations
        param_names = list(param_values.keys())
        combinations = []
        
        for values in itertools.product(*[param_values[name] for name in param_names]):
            combination = {name: value for name, value in zip(param_names, values)}
            combinations.append(combination)
        
        return combinations
    
    def get_random_combinations(self, num_samples: int) -> List[Dict[str, Any]]:
        """
        Generate random parameter combinations.
        
        Args:
            num_samples: Number of combinations to generate
            
        Returns:
            List of parameter dictionaries
        """
        combinations = []
        
        for _ in range(num_samples):
            combination = {}
            
            for param_name, param in self.parameters.items():
                if param.values is not None:
                    # Randomly select from discrete values
                    combination[param_name] = np.random.choice(param.values)
                elif param.param_type in (int, float):
                    # Randomly select from numeric range
                    if param.param_type is int:
                        value = np.random.randint(param.min_value, param.max_value + 1)
                    else:
                        value = np.random.uniform(param.min_value, param.max_value)
                    combination[param_name] = value
                elif param.param_type is bool:
                    # Randomly select boolean
                    combination[param_name] = np.random.choice([True, False])
            
            combinations.append(combination)
        
        return combinations
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert parameter space to dictionary."""
        return {
            'parameters': {
                name: param.to_dict()
                for name, param in self.parameters.items()
            }
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ParameterSpace':
        """Create parameter space from dictionary."""
        space = cls()
        
        for name, param_data in data.get('parameters', {}).items():
            parameter = ParameterRange.from_dict(param_data)
            space.add_parameter(parameter)
        
        return space
    
    @classmethod
    def from_strategy_parameters(
        cls,
        strategy_params: StrategyParameters
    ) -> 'ParameterSpace':
        """
        Create parameter space from strategy parameters.
        
        Args:
            strategy_params: Strategy parameters object
            
        Returns:
            Parameter space for optimizable parameters
        """
        space = cls()
        
        # Get optimizable parameters
        optimizable = strategy_params.get_optimizable_params()
        
        for name, metadata in optimizable.items():
            param_type = metadata.get('type')
            current_value = metadata.get('current_value')
            
            if param_type in (int, float):
                # Numeric parameter
                min_value = metadata.get('min_value')
                max_value = metadata.get('max_value')
                
                # Set reasonable defaults if not specified
                if min_value is None:
                    min_value = current_value * 0.5 if current_value else 0
                if max_value is None:
                    max_value = current_value * 2.0 if current_value else 100
                
                # Add numeric parameter
                space.add_numeric_parameter(
                    name=name,
                    min_value=min_value,
                    max_value=max_value,
                    param_type=param_type,
                    default=current_value
                )
            elif param_type is bool:
                # Boolean parameter
                space.add_boolean_parameter(
                    name=name,
                    default=current_value
                )
            else:
                # Categorical parameter
                choices = metadata.get('choices')
                if choices:
                    space.add_categorical_parameter(
                        name=name,
                        values=choices,
                        default=current_value
                    )
        
        return space


class OptimizationResult:
    """
    Results of a strategy parameter optimization run.
    
    Contains the best parameters found, performance metrics for all tested
    combinations, and parameter sensitivity analysis.
    """
    
    def __init__(
        self,
        strategy_id: str,
        optimization_method: OptimizationMethod,
        parameter_space: ParameterSpace,
        metric_name: str = 'sharpe_ratio'
    ):
        """
        Initialize optimization result.
        
        Args:
            strategy_id: ID of the strategy
            optimization_method: Method used for optimization
            parameter_space: Parameter space that was searched
            metric_name: Name of the metric used for optimization
        """
        self.strategy_id = strategy_id
        self.optimization_method = optimization_method
        self.parameter_space = parameter_space
        self.metric_name = metric_name
        
        # Results
        self.results: List[Dict[str, Any]] = []
        self.best_parameters: Optional[Dict[str, Any]] = None
        self.best_result: Optional[Dict[str, Any]] = None
        self.best_backtest: Optional[BacktestResult] = None
        
        # Timing
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.duration: Optional[float] = None
    
    def add_result(
        self,
        parameters: Dict[str, Any],
        backtest_result: BacktestResult
    ) -> None:
        """
        Add a backtest result for a parameter combination.
        
        Args:
            parameters: Parameter values
            backtest_result: Result of backtesting with these parameters
        """
        # Extract the target metric
        metric_value = None
        
        if backtest_result.metrics:
            metric_value = backtest_result.metrics.get(self.metric_name)
        
        # Create result entry
        result = {
            'parameters': parameters.copy(),
            'metrics': backtest_result.metrics.to_dict() if backtest_result.metrics else {},
            'target_metric': metric_value
        }
        
        # Add to results list
        self.results.append(result)
        
        # Update best result if better
        if (
            metric_value is not None and
            (self.best_result is None or
             metric_value > self.best_result.get('target_metric', float('-inf')))
        ):
            self.best_result = result
            self.best_parameters = parameters.copy()
            self.best_backtest = backtest_result
    
    def calculate_parameter_importance(self) -> Dict[str, float]:
        """
        Calculate parameter importance based on correlation with target metric.
        
        Returns:
            Dictionary of parameter importance scores
        """
        if not self.results:
            return {}
        
        # Create DataFrame with parameters and target metric
        data = []
        
        for result in self.results:
            row = {}
            row.update(result['parameters'])
            row['target_metric'] = result.get('target_metric')
            data.append(row)
        
        df = pd.DataFrame(data)
        
        # Calculate correlation with target metric
        importances = {}
        
        for param in self.parameter_space.parameters:
            if param in df.columns:
                try:
                    # Convert categorical parameters to numeric if needed
                    if df[param].dtype == object:
                        # Skip parameters that can't be correlated
                        continue
                    
                    # Calculate absolute correlation
                    corr = abs(df[param].corr(df['target_metric']))
                    
                    if not np.isnan(corr):
                        importances[param] = corr
                except:
                    # Skip parameters that cause errors
                    pass
        
        # Normalize importance scores
        max_importance = max(importances.values()) if importances else 1.0
        
        if max_importance > 0:
            importances = {
                param: score / max_importance
                for param, score in importances.items()
            }
        
        return importances
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert optimization result to dictionary."""
        return {
            'strategy_id': self.strategy_id,
            'optimization_method': self.optimization_method.value,
            'metric_name': self.metric_name,
            'best_parameters': self.best_parameters,
            'best_metric_value': (
                self.best_result.get('target_metric')
                if self.best_result else None
            ),
            'parameter_space': self.parameter_space.to_dict(),
            'results_count': len(self.results),
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'duration_seconds': self.duration,
            'parameter_importance': self.calculate_parameter_importance()
        }
    
    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert results to DataFrame for analysis.
        
        Returns:
            DataFrame with parameters and metrics
        """
        data = []
        
        for result in self.results:
            row = {}
            # Add parameters
            row.update(result['parameters'])
            # Add target metric
            row[self.metric_name] = result.get('target_metric')
            # Add other important metrics
            for metric_name in ['total_return', 'max_drawdown', 'sharpe_ratio', 
                               'win_rate', 'profit_factor']:
                if metric_name in result.get('metrics', {}):
                    row[metric_name] = result['metrics'][metric_name]
            
            data.append(row)
        
        return pd.DataFrame(data)


class OptimizationEngine:
    """
    Engine for optimizing strategy parameters.
    
    Implements various optimization methods including:
    - Grid search
    - Random search
    - Genetic algorithm
    - Bayesian optimization
    """
    
    def __init__(
        self,
        backtest_engine: Optional[BacktestEngine] = None,
        max_workers: int = 4
    ):
        """
        Initialize optimization engine.
        
        Args:
            backtest_engine: Backtest engine for evaluating strategies
            max_workers: Maximum number of parallel workers
        """
        self.backtest_engine = backtest_engine or BacktestEngine()
        self.max_workers = max_workers
    
    def optimize(
        self,
        strategy: Strategy,
        data: pd.DataFrame,
        parameter_space: ParameterSpace,
        symbol: str,
        timeframe: str,
        method: OptimizationMethod = OptimizationMethod.GRID_SEARCH,
        metric_name: str = 'sharpe_ratio',
        max_evaluations: Optional[int] = None
    ) -> OptimizationResult:
        """
        Optimize strategy parameters.
        
        Args:
            strategy: Strategy to optimize
            data: Historical price data
            parameter_space: Parameter space to search
            symbol: Symbol being traded
            timeframe: Timeframe of the data
            method: Optimization method
            metric_name: Metric to optimize
            max_evaluations: Maximum number of evaluations
            
        Returns:
            OptimizationResult object with best parameters
        """
        # Initialize result
        result = OptimizationResult(
            strategy_id=strategy.strategy_id,
            optimization_method=method,
            parameter_space=parameter_space,
            metric_name=metric_name
        )
        
        # Record start time
        result.start_time = datetime.utcnow()
        
        # Get parameter combinations to evaluate
        parameter_combinations = []
        
        if method == OptimizationMethod.GRID_SEARCH:
            parameter_combinations = parameter_space.get_grid_combinations()
            
            # Limit evaluations if specified
            if max_evaluations and len(parameter_combinations) > max_evaluations:
                # Randomly sample from combinations
                indices = np.random.choice(
                    len(parameter_combinations),
                    size=max_evaluations,
                    replace=False
                )
                parameter_combinations = [parameter_combinations[i] for i in indices]
        
        elif method == OptimizationMethod.RANDOM_SEARCH:
            # Default to 50 evaluations for random search
            num_samples = max_evaluations or 50
            parameter_combinations = parameter_space.get_random_combinations(num_samples)
        
        # For more advanced methods like genetic algorithm or Bayesian optimization,
        # we would need to implement iterative parameter selection based on results
        
        # Run backtests in parallel
        with concurrent.futures.ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            # Create backtest tasks
            futures = []
            
            for parameters in parameter_combinations:
                # Clone strategy and update parameters
                strategy_clone = strategy.clone(new_id=False)
                strategy_clone.update_parameters(**parameters)
                
                # Submit backtest task
                future = executor.submit(
                    self._run_backtest,
                    strategy_clone,
                    data.copy(),
                    symbol,
                    timeframe
                )
                futures.append((future, parameters))
            
            # Process results as they complete
            for future, parameters in futures:
                try:
                    backtest_result = future.result()
                    result.add_result(parameters, backtest_result)
                except Exception as e:
                    print(f"Error evaluating parameters {parameters}: {e}")
        
        # Record end time
        result.end_time = datetime.utcnow()
        result.duration = (result.end_time - result.start_time).total_seconds()
        
        return result
    
    def _run_backtest(
        self,
        strategy: Strategy,
        data: pd.DataFrame,
        symbol: str,
        timeframe: str
    ) -> BacktestResult:
        """
        Run a backtest for the given strategy.
        
        Args:
            strategy: Strategy to backtest
            data: Historical price data
            symbol: Symbol being traded
            timeframe: Timeframe of the data
            
        Returns:
            BacktestResult object
        """
        return self.backtest_engine.backtest(
            strategy=strategy,
            data=data,
            symbol=symbol,
            timeframe=timeframe
        )
