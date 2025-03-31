"""
Exposure Calculator Module

Calculates and tracks exposure metrics across different dimensions including assets,
strategies, markets, and risk factors. Provides tools for understanding portfolio exposure.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Union, Tuple, Set
from datetime import datetime


class ExposureCalculator:
    """
    Calculates and tracks trading exposure across multiple dimensions.
    
    Provides methods to:
    - Calculate exposure by symbol, strategy, market sector
    - Track changes in exposure over time
    - Calculate correlation-adjusted exposure
    - Set exposure limits and alerts
    - Integrate with ElizaOS for automated exposure management
    """
    
    def __init__(self):
        """Initialize the exposure calculator."""
        self._positions = {}  # position_id -> position details
        self._sector_mappings = {}  # symbol -> sector
        self._exposure_limits = {}  # dimension -> limit
        self._exposure_snapshots = []  # historical exposure records
        self._elizaos_integrated = False
        
    def add_position(self, position_id: str, symbol: str, quantity: float, 
                   current_price: float, side: str = 'long',
                   strategy_id: str = None, sector: str = None, 
                   correlation_group: str = None, **kwargs) -> None:
        """
        Add a position to be included in exposure calculations.
        
        Parameters:
        -----------
        position_id : str
            Unique identifier for the position
        symbol : str
            The trading symbol/instrument
        quantity : float
            Size of the position
        current_price : float
            Current market price
        side : str
            'long' or 'short'
        strategy_id : str, optional
            ID of the strategy that opened the position
        sector : str, optional
            Market sector or category for the symbol
        correlation_group : str, optional
            Group of correlated assets
        **kwargs : dict
            Any additional position parameters
        """
        # Calculate the market value
        market_value = quantity * current_price
        
        # Adjust for side (long/short)
        exposure = market_value if side.lower() == 'long' else -market_value
        
        # Store position details
        self._positions[position_id] = {
            'position_id': position_id,
            'symbol': symbol,
            'quantity': quantity,
            'current_price': current_price,
            'side': side.lower(),
            'strategy_id': strategy_id,
            'sector': sector,
            'correlation_group': correlation_group,
            'market_value': market_value,
            'exposure': exposure,
            'timestamp': datetime.now(),
            **kwargs
        }
        
        # Add sector mapping if provided
        if sector and symbol not in self._sector_mappings:
            self._sector_mappings[symbol] = sector
    
    def update_position(self, position_id: str, 
                      current_price: Optional[float] = None,
                      quantity: Optional[float] = None) -> bool:
        """
        Update an existing position with new price or quantity.
        
        Parameters:
        -----------
        position_id : str
            ID of the position to update
        current_price : float, optional
            Updated market price
        quantity : float, optional
            Updated position size
            
        Returns:
        --------
        bool
            True if update was successful, False if position not found
        """
        if position_id not in self._positions:
            return False
        
        position = self._positions[position_id]
        
        # Update price if provided
        if current_price is not None:
            position['current_price'] = current_price
        
        # Update quantity if provided
        if quantity is not None:
            position['quantity'] = quantity
        
        # Recalculate market value and exposure
        position['market_value'] = position['quantity'] * position['current_price']
        
        if position['side'] == 'long':
            position['exposure'] = position['market_value']
        else:  # short
            position['exposure'] = -position['market_value']
        
        position['timestamp'] = datetime.now()
        return True
    
    def remove_position(self, position_id: str) -> bool:
        """
        Remove a position from exposure calculations.
        
        Parameters:
        -----------
        position_id : str
            ID of the position to remove
            
        Returns:
        --------
        bool
            True if removal was successful, False if position not found
        """
        if position_id in self._positions:
            self._positions.pop(position_id)
            return True
        return False
    
    def set_sector_mapping(self, symbol: str, sector: str) -> None:
        """
        Set or update the sector mapping for a symbol.
        
        Parameters:
        -----------
        symbol : str
            The trading symbol
        sector : str
            Market sector or category
        """
        self._sector_mappings[symbol] = sector
        
        # Update sector in existing positions with this symbol
        for position in self._positions.values():
            if position['symbol'] == symbol:
                position['sector'] = sector
    
    def set_exposure_limit(self, dimension: str, limit: float, 
                         is_percentage: bool = False) -> None:
        """
        Set an exposure limit for a specific dimension.
        
        Parameters:
        -----------
        dimension : str
            Dimension for the limit (e.g., 'symbol:AAPL', 'sector:Technology')
        limit : float
            Maximum allowed exposure (absolute value or percentage)
        is_percentage : bool
            If True, limit is a percentage of total exposure
        """
        self._exposure_limits[dimension] = {
            'limit': limit,
            'is_percentage': is_percentage
        }
    
    def calculate_total_exposure(self) -> float:
        """
        Calculate the total absolute exposure across all positions.
        
        Returns:
        --------
        float
            Total exposure value
        """
        return sum(abs(p['exposure']) for p in self._positions.values())
    
    def calculate_net_exposure(self) -> float:
        """
        Calculate the net exposure (long minus short).
        
        Returns:
        --------
        float
            Net exposure value
        """
        return sum(p['exposure'] for p in self._positions.values())
    
    def calculate_exposure_by_symbol(self) -> Dict[str, float]:
        """
        Calculate exposure broken down by trading symbol.
        
        Returns:
        --------
        dict
            Dictionary mapping symbols to exposure values
        """
        exposure_by_symbol = {}
        
        for position in self._positions.values():
            symbol = position['symbol']
            
            if symbol in exposure_by_symbol:
                exposure_by_symbol[symbol] += position['exposure']
            else:
                exposure_by_symbol[symbol] = position['exposure']
        
        return exposure_by_symbol
    
    def calculate_exposure_by_sector(self) -> Dict[str, float]:
        """
        Calculate exposure broken down by market sector.
        
        Returns:
        --------
        dict
            Dictionary mapping sectors to exposure values
        """
        exposure_by_sector = {}
        
        for position in self._positions.values():
            # Skip positions without sector information
            if not position.get('sector'):
                continue
                
            sector = position['sector']
            
            if sector in exposure_by_sector:
                exposure_by_sector[sector] += position['exposure']
            else:
                exposure_by_sector[sector] = position['exposure']
        
        return exposure_by_sector
    
    def calculate_exposure_by_strategy(self) -> Dict[str, float]:
        """
        Calculate exposure broken down by strategy.
        
        Returns:
        --------
        dict
            Dictionary mapping strategy IDs to exposure values
        """
        exposure_by_strategy = {}
        
        for position in self._positions.values():
            # Skip positions without strategy information
            if not position.get('strategy_id'):
                continue
                
            strategy_id = position['strategy_id']
            
            if strategy_id in exposure_by_strategy:
                exposure_by_strategy[strategy_id] += position['exposure']
            else:
                exposure_by_strategy[strategy_id] = position['exposure']
        
        return exposure_by_strategy
    
    def calculate_exposure_by_side(self) -> Dict[str, float]:
        """
        Calculate exposure broken down by side (long/short).
        
        Returns:
        --------
        dict
            Dictionary with 'long' and 'short' exposure values
        """
        long_exposure = sum(p['exposure'] for p in self._positions.values() 
                          if p['side'] == 'long')
        short_exposure = sum(abs(p['exposure']) for p in self._positions.values() 
                           if p['side'] == 'short')
        
        return {
            'long': long_exposure,
            'short': short_exposure
        }
    
    def calculate_exposure_percentages(self) -> Dict[str, Dict[str, float]]:
        """
        Calculate exposure percentages across different dimensions.
        
        Returns:
        --------
        dict
            Dictionary with percentage breakdowns by symbol, sector, and strategy
        """
        total_exposure = self.calculate_total_exposure()
        
        if total_exposure == 0:
            return {
                'by_symbol': {},
                'by_sector': {},
                'by_strategy': {}
            }
        
        # Get raw exposure values
        by_symbol = self.calculate_exposure_by_symbol()
        by_sector = self.calculate_exposure_by_sector()
        by_strategy = self.calculate_exposure_by_strategy()
        
        # Convert to percentages
        by_symbol_pct = {k: (abs(v) / total_exposure) * 100 for k, v in by_symbol.items()}
        by_sector_pct = {k: (abs(v) / total_exposure) * 100 for k, v in by_sector.items()}
        by_strategy_pct = {k: (abs(v) / total_exposure) * 100 for k, v in by_strategy.items()}
        
        return {
            'by_symbol': by_symbol_pct,
            'by_sector': by_sector_pct,
            'by_strategy': by_strategy_pct
        }
    
    def check_exposure_limits(self) -> List[Dict]:
        """
        Check if any exposure limits have been exceeded.
        
        Returns:
        --------
        list
            List of dictionaries with limit breach information
        """
        if not self._exposure_limits:
            return []
        
        limit_breaches = []
        total_exposure = self.calculate_total_exposure()
        
        # Check each dimension
        for dimension, limit_info in self._exposure_limits.items():
            dimension_type, dimension_value = dimension.split(':', 1)
            current_exposure = 0
            
            # Calculate current exposure for this dimension
            if dimension_type == 'symbol':
                by_symbol = self.calculate_exposure_by_symbol()
                current_exposure = abs(by_symbol.get(dimension_value, 0))
            elif dimension_type == 'sector':
                by_sector = self.calculate_exposure_by_sector()
                current_exposure = abs(by_sector.get(dimension_value, 0))
            elif dimension_type == 'strategy':
                by_strategy = self.calculate_exposure_by_strategy()
                current_exposure = abs(by_strategy.get(dimension_value, 0))
            elif dimension_type == 'total':
                current_exposure = total_exposure
            elif dimension_type == 'net':
                current_exposure = abs(self.calculate_net_exposure())
            
            # Check if limit is breached
            limit_value = limit_info['limit']
            
            if limit_info['is_percentage']:
                # Convert percentage to absolute value
                limit_value = (limit_value / 100) * total_exposure
            
            if current_exposure > limit_value:
                limit_breaches.append({
                    'dimension': dimension,
                    'current_exposure': current_exposure,
                    'limit': limit_value,
                    'excess': current_exposure - limit_value,
                    'excess_percentage': ((current_exposure - limit_value) / limit_value) * 100
                })
        
        return limit_breaches
    
    def calculate_correlation_adjusted_exposure(self, correlation_matrix: Optional[Dict] = None) -> float:
        """
        Calculate exposure adjusted for correlations between assets.
        
        Parameters:
        -----------
        correlation_matrix : dict, optional
            Dictionary mapping symbol pairs to correlation values
            
        Returns:
        --------
        float
            Correlation-adjusted exposure
        """
        if not self._positions:
            return 0.0
        
        if correlation_matrix is None:
            # If no correlation matrix is provided, assume all assets are uncorrelated
            # Simple sum of squared exposures with square root
            return np.sqrt(sum(p['exposure'] ** 2 for p in self._positions.values()))
        
        # Calculate correlation-adjusted exposure using the correlation matrix
        symbols = set(p['symbol'] for p in self._positions.values())
        symbol_exposures = self.calculate_exposure_by_symbol()
        
        total = 0.0
        
        # Sum the weighted exposure pairs
        for symbol1 in symbols:
            for symbol2 in symbols:
                exposure1 = symbol_exposures.get(symbol1, 0)
                exposure2 = symbol_exposures.get(symbol2, 0)
                
                # Get correlation between symbol1 and symbol2
                if symbol1 == symbol2:
                    correlation = 1.0
                else:
                    pair_key = tuple(sorted([symbol1, symbol2]))
                    correlation = correlation_matrix.get(pair_key, 0.0)
                
                total += exposure1 * exposure2 * correlation
        
        return np.sqrt(total)
    
    def snapshot_current_exposure(self) -> None:
        """
        Take a snapshot of current exposure for historical tracking.
        """
        timestamp = datetime.now()
        
        snapshot = {
            'timestamp': timestamp,
            'total_exposure': self.calculate_total_exposure(),
            'net_exposure': self.calculate_net_exposure(),
            'exposure_by_symbol': self.calculate_exposure_by_symbol(),
            'exposure_by_sector': self.calculate_exposure_by_sector(),
            'exposure_by_strategy': self.calculate_exposure_by_strategy(),
            'exposure_by_side': self.calculate_exposure_by_side()
        }
        
        self._exposure_snapshots.append(snapshot)
    
    def analyze_exposure_trend(self, dimension: str, 
                            start_time: Optional[datetime] = None,
                            end_time: Optional[datetime] = None) -> List[Dict]:
        """
        Analyze how exposure has changed over time.
        
        Parameters:
        -----------
        dimension : str
            Dimension to analyze: 'total', 'net', 'symbol', 'sector', 'strategy', 'side'
        start_time : datetime, optional
            Start of time period
        end_time : datetime, optional
            End of time period
            
        Returns:
        --------
        list
            List of exposure values over time
        """
        if not self._exposure_snapshots:
            return []
        
        # Filter snapshots by time range
        snapshots = self._exposure_snapshots
        
        if start_time:
            snapshots = [s for s in snapshots if s['timestamp'] >= start_time]
        
        if end_time:
            snapshots = [s for s in snapshots if s['timestamp'] <= end_time]
        
        # Extract the relevant dimension
        result = []
        
        for snapshot in snapshots:
            if dimension == 'total':
                result.append({
                    'timestamp': snapshot['timestamp'],
                    'exposure': snapshot['total_exposure']
                })
            elif dimension == 'net':
                result.append({
                    'timestamp': snapshot['timestamp'],
                    'exposure': snapshot['net_exposure']
                })
            elif dimension == 'side':
                for side, exposure in snapshot['exposure_by_side'].items():
                    result.append({
                        'timestamp': snapshot['timestamp'],
                        'dimension_value': side,
                        'exposure': exposure
                    })
            elif dimension in ['symbol', 'sector', 'strategy']:
                key = f"exposure_by_{dimension}"
                
                for value, exposure in snapshot[key].items():
                    result.append({
                        'timestamp': snapshot['timestamp'],
                        'dimension_value': value,
                        'exposure': exposure
                    })
        
        return result
    
    def calculate_sector_diversification(self) -> float:
        """
        Calculate a diversification score based on sector allocation.
        
        Returns:
        --------
        float
            Diversification score (0-1), higher is more diversified
        """
        sector_exposures = self.calculate_exposure_by_sector()
        
        if not sector_exposures:
            return 0.0
        
        total_exposure = sum(abs(e) for e in sector_exposures.values())
        
        if total_exposure == 0:
            return 0.0
        
        # Calculate normalized sector weights
        weights = [abs(e) / total_exposure for e in sector_exposures.values()]
        
        # Calculate Herfindahl-Hirschman Index (HHI)
        hhi = sum(w ** 2 for w in weights)
        
        # Convert HHI to diversification score (1 - HHI)
        # When fully concentrated in one sector, HHI = 1 and score = 0
        # When equally distributed, HHI approaches 0 and score approaches 1
        return 1 - hhi
    
    def integrate_with_elizaos(self, enable: bool = True) -> bool:
        """
        Enable or disable ElizaOS integration for automated exposure management.
        
        Parameters:
        -----------
        enable : bool
            Whether to enable ElizaOS integration
            
        Returns:
        --------
        bool
            True if integration status changed, False otherwise
        """
        if self._elizaos_integrated == enable:
            return False
        
        self._elizaos_integrated = enable
        
        # Here we would implement actual ElizaOS integration logic
        # For now, this is just a placeholder
        
        return True
    
    def get_elizaos_exposure_recommendations(self) -> List[Dict]:
        """
        Get exposure management recommendations from ElizaOS.
        
        Returns:
        --------
        list
            List of recommendation dictionaries
        """
        if not self._elizaos_integrated:
            return [{
                'type': 'warning',
                'message': 'ElizaOS integration is not enabled.'
            }]
        
        # This is a placeholder for actual ElizaOS recommendations
        recommendations = []
        limit_breaches = self.check_exposure_limits()
        
        if limit_breaches:
            for breach in limit_breaches:
                recommendations.append({
                    'type': 'reduce_exposure',
                    'dimension': breach['dimension'],
                    'current': breach['current_exposure'],
                    'target': breach['limit'],
                    'reduction_needed': breach['excess']
                })
        
        # Check for concentration risk
        div_score = self.calculate_sector_diversification()
        if div_score < 0.5:
            recommendations.append({
                'type': 'diversify',
                'current_score': div_score,
                'target_score': 0.7,
                'message': 'Portfolio is overly concentrated. Consider diversifying across more sectors.'
            })
        
        return recommendations
    
    def to_dataframe(self) -> Dict[str, pd.DataFrame]:
        """
        Convert exposure data to pandas DataFrames.
        
        Returns:
        --------
        dict
            Dictionary of DataFrames with exposure information
        """
        positions_df = pd.DataFrame(list(self._positions.values())) if self._positions else pd.DataFrame()
        
        # Convert exposure snapshots to DataFrame
        if self._exposure_snapshots:
            # Flatten snapshots for total and net exposure
            total_net_records = []
            for snapshot in self._exposure_snapshots:
                total_net_records.append({
                    'timestamp': snapshot['timestamp'],
                    'metric': 'total_exposure',
                    'value': snapshot['total_exposure']
                })
                total_net_records.append({
                    'timestamp': snapshot['timestamp'],
                    'metric': 'net_exposure',
                    'value': snapshot['net_exposure']
                })
            
            total_net_df = pd.DataFrame(total_net_records)
            
            # Create DataFrames for dimensional exposure
            symbol_records = []
            sector_records = []
            strategy_records = []
            
            for snapshot in self._exposure_snapshots:
                for symbol, exposure in snapshot['exposure_by_symbol'].items():
                    symbol_records.append({
                        'timestamp': snapshot['timestamp'],
                        'symbol': symbol,
                        'exposure': exposure
                    })
                
                for sector, exposure in snapshot['exposure_by_sector'].items():
                    sector_records.append({
                        'timestamp': snapshot['timestamp'],
                        'sector': sector,
                        'exposure': exposure
                    })
                
                for strategy, exposure in snapshot['exposure_by_strategy'].items():
                    strategy_records.append({
                        'timestamp': snapshot['timestamp'],
                        'strategy': strategy,
                        'exposure': exposure
                    })
            
            symbol_df = pd.DataFrame(symbol_records) if symbol_records else pd.DataFrame()
            sector_df = pd.DataFrame(sector_records) if sector_records else pd.DataFrame()
            strategy_df = pd.DataFrame(strategy_records) if strategy_records else pd.DataFrame()
            
            return {
                'positions': positions_df,
                'total_net': total_net_df,
                'by_symbol': symbol_df,
                'by_sector': sector_df,
                'by_strategy': strategy_df
            }
        
        return {'positions': positions_df}
    
    def get_unique_sectors(self) -> Set[str]:
        """
        Get the set of unique sectors in the current positions.
        
        Returns:
        --------
        set
            Set of sector names
        """
        sectors = set()
        
        for position in self._positions.values():
            if position.get('sector'):
                sectors.add(position['sector'])
        
        return sectors
    
    def get_unique_strategies(self) -> Set[str]:
        """
        Get the set of unique strategies in the current positions.
        
        Returns:
        --------
        set
            Set of strategy IDs
        """
        strategies = set()
        
        for position in self._positions.values():
            if position.get('strategy_id'):
                strategies.add(position['strategy_id'])
        
        return strategies
    
    def count(self) -> int:
        """
        Get the number of positions being tracked.
        
        Returns:
        --------
        int
            Count of positions
        """
        return len(self._positions)
    
    def clear(self) -> None:
        """
        Clear all position data (use with caution).
        """
        self._positions.clear()
        # Keep sector mappings and exposure limits
        # But clear snapshots
        self._exposure_snapshots = []
