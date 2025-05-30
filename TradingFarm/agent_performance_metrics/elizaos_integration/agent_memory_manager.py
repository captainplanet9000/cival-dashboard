"""
Agent Memory Manager Module

Manages memory and learning for ElizaOS trading agents.
Provides tools for storing, retrieving, and analyzing agent experiences.
"""

import json
import logging
from typing import Dict, List, Optional, Union, Any, Callable
from datetime import datetime
import pandas as pd
import numpy as np
import os
import pickle


class AgentMemoryManager:
    """
    Manages memory and learning for ElizaOS trading agents.
    
    Provides methods to:
    - Store and retrieve agent trading experiences
    - Manage episodic and semantic memories
    - Analyze patterns in trading histories
    - Extract insights from trading experiences
    - Support reinforcement learning workflows
    """
    
    def __init__(self, storage_path: str = "./agent_memories", 
                log_level: int = logging.INFO):
        """
        Initialize the agent memory manager.
        
        Parameters:
        -----------
        storage_path : str
            Directory path for storing agent memories
        log_level : int
            Logging level for memory operations
        """
        self.storage_path = storage_path
        
        # Create storage directory if it doesn't exist
        os.makedirs(storage_path, exist_ok=True)
        
        # Configure logging
        self.logger = logging.getLogger("AgentMemoryManager")
        self.logger.setLevel(log_level)
        
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
        
        # Initialize memory cache
        self.memory_cache = {}
        self.agent_metadata = {}
        
    def store_trading_experience(self, agent_id: str, experience: Dict) -> bool:
        """
        Store a trading experience for an agent.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent
        experience : dict
            Trading experience data including:
            - timestamp: When the experience occurred
            - action: Trading action taken
            - state: Market state at the time
            - reward: Outcome/reward from the action
            - insight: Agent's reasoning for the action
            
        Returns:
        --------
        bool
            True if experience was stored successfully, False otherwise
        """
        try:
            # Ensure experience has required fields
            required_fields = ["timestamp", "action", "state"]
            for field in required_fields:
                if field not in experience:
                    self.logger.error(f"Missing required field in experience: {field}")
                    return False
            
            # Add additional metadata
            experience["stored_at"] = datetime.now().isoformat()
            
            # Create agent directory if it doesn't exist
            agent_dir = os.path.join(self.storage_path, agent_id)
            os.makedirs(agent_dir, exist_ok=True)
            
            # Generate a unique filename based on timestamp
            timestamp = datetime.fromisoformat(experience["timestamp"]) \
                if isinstance(experience["timestamp"], str) else experience["timestamp"]
            
            filename = timestamp.strftime("%Y%m%d%H%M%S") + ".json"
            filepath = os.path.join(agent_dir, filename)
            
            # Write experience to file
            with open(filepath, 'w') as f:
                json.dump(experience, f, indent=2)
            
            # Update cache
            if agent_id not in self.memory_cache:
                self.memory_cache[agent_id] = []
                
            self.memory_cache[agent_id].append(experience)
            
            # Limit cache size
            if len(self.memory_cache[agent_id]) > 1000:
                self.memory_cache[agent_id] = self.memory_cache[agent_id][-1000:]
            
            self.logger.debug(f"Stored experience for agent {agent_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error storing experience: {str(e)}")
            return False
    
    def store_batch_experiences(self, agent_id: str, experiences: List[Dict]) -> int:
        """
        Store multiple trading experiences for an agent.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent
        experiences : list
            List of trading experience dictionaries
            
        Returns:
        --------
        int
            Number of successfully stored experiences
        """
        success_count = 0
        
        for experience in experiences:
            if self.store_trading_experience(agent_id, experience):
                success_count += 1
                
        self.logger.info(f"Stored {success_count}/{len(experiences)} experiences for agent {agent_id}")
        return success_count
    
    def retrieve_experiences(self, agent_id: str, 
                          start_time: Optional[datetime] = None,
                          end_time: Optional[datetime] = None,
                          filters: Optional[Dict] = None,
                          limit: int = 100) -> List[Dict]:
        """
        Retrieve trading experiences for an agent.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent
        start_time : datetime, optional
            Start of time range
        end_time : datetime, optional
            End of time range
        filters : dict, optional
            Additional filters (e.g., action type, symbol)
        limit : int
            Maximum number of experiences to retrieve
            
        Returns:
        --------
        list
            List of matching experience dictionaries
        """
        try:
            # Check cache first
            if agent_id in self.memory_cache and len(self.memory_cache[agent_id]) > 0:
                experiences = self._filter_experiences(self.memory_cache[agent_id], 
                                                     start_time, end_time, filters)
                
                # If we have enough experiences in cache, return them
                if len(experiences) >= limit:
                    return experiences[:limit]
            
            # Otherwise, read from disk
            agent_dir = os.path.join(self.storage_path, agent_id)
            
            if not os.path.exists(agent_dir):
                self.logger.warning(f"No experiences found for agent {agent_id}")
                return []
            
            # Get all experience files
            files = [f for f in os.listdir(agent_dir) if f.endswith(".json")]
            
            # Sort by timestamp (filename)
            files.sort(reverse=True)
            
            experiences = []
            
            for file in files:
                if len(experiences) >= limit:
                    break
                    
                filepath = os.path.join(agent_dir, file)
                
                try:
                    with open(filepath, 'r') as f:
                        experience = json.load(f)
                        
                    # Apply time filters
                    timestamp = datetime.fromisoformat(experience["timestamp"]) \
                        if isinstance(experience["timestamp"], str) else experience["timestamp"]
                    
                    if start_time and timestamp < start_time:
                        continue
                        
                    if end_time and timestamp > end_time:
                        continue
                    
                    # Apply additional filters
                    if filters:
                        match = True
                        for key, value in filters.items():
                            if key not in experience or experience[key] != value:
                                match = False
                                break
                                
                        if not match:
                            continue
                    
                    experiences.append(experience)
                    
                except Exception as e:
                    self.logger.error(f"Error reading experience file {filepath}: {str(e)}")
            
            # Update cache with these experiences
            if agent_id not in self.memory_cache:
                self.memory_cache[agent_id] = []
                
            for exp in experiences:
                if exp not in self.memory_cache[agent_id]:
                    self.memory_cache[agent_id].append(exp)
            
            # Sort by timestamp
            experiences.sort(key=lambda x: x["timestamp"], reverse=True)
            
            return experiences[:limit]
            
        except Exception as e:
            self.logger.error(f"Error retrieving experiences: {str(e)}")
            return []
    
    def analyze_action_patterns(self, agent_id: str, 
                              period_days: int = 30) -> Dict:
        """
        Analyze patterns in agent trading actions.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent
        period_days : int
            Number of days to analyze
            
        Returns:
        --------
        dict
            Analysis results including action frequencies and success rates
        """
        try:
            # Calculate start time
            end_time = datetime.now()
            start_time = end_time - pd.Timedelta(days=period_days)
            
            # Get experiences for the period
            experiences = self.retrieve_experiences(
                agent_id, 
                start_time=start_time,
                end_time=end_time,
                limit=10000  # Get a large sample
            )
            
            if not experiences:
                return {
                    "success": False,
                    "message": f"No experiences found for agent {agent_id} in the last {period_days} days"
                }
            
            # Convert to DataFrame for analysis
            df = pd.DataFrame(experiences)
            
            # Ensure timestamp is datetime
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            # Action frequency
            action_counts = {}
            if 'action' in df.columns:
                action_counts = df['action'].value_counts().to_dict()
            
            # Success rate (if reward information is available)
            success_rates = {}
            if 'reward' in df.columns:
                df['success'] = df['reward'] > 0
                
                if 'action' in df.columns:
                    for action in df['action'].unique():
                        action_df = df[df['action'] == action]
                        success_count = action_df['success'].sum()
                        total_count = len(action_df)
                        
                        if total_count > 0:
                            success_rates[action] = (success_count / total_count) * 100
            
            # Time-of-day patterns
            time_of_day_patterns = {}
            if 'timestamp' in df.columns:
                df['hour'] = df['timestamp'].dt.hour
                
                time_of_day_counts = df['hour'].value_counts().sort_index().to_dict()
                time_of_day_patterns = {f"{hour:02d}:00": count for hour, count in time_of_day_counts.items()}
            
            # Symbol frequency
            symbol_counts = {}
            if 'state' in df.columns and df['state'].apply(lambda x: isinstance(x, dict)).all():
                symbols = df['state'].apply(lambda x: x.get('symbol', 'unknown'))
                symbol_counts = symbols.value_counts().to_dict()
            
            return {
                "success": True,
                "period_days": period_days,
                "total_experiences": len(experiences),
                "action_frequency": action_counts,
                "success_rates": success_rates,
                "time_of_day_patterns": time_of_day_patterns,
                "symbol_frequency": symbol_counts
            }
            
        except Exception as e:
            self.logger.error(f"Error analyzing action patterns: {str(e)}")
            return {
                "success": False,
                "message": f"Error analyzing action patterns: {str(e)}"
            }
    
    def extract_trading_insights(self, agent_id: str) -> Dict:
        """
        Extract insights from an agent's trading history.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent
            
        Returns:
        --------
        dict
            Trading insights including:
            - Best performing actions
            - Best performing symbols
            - Best performing times
            - Common patterns in successful trades
        """
        try:
            # Get a large sample of experiences
            experiences = self.retrieve_experiences(agent_id, limit=5000)
            
            if not experiences:
                return {
                    "success": False,
                    "message": f"No experiences found for agent {agent_id}"
                }
            
            # Convert to DataFrame for analysis
            df = pd.DataFrame(experiences)
            
            # Ensure timestamp is datetime
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            insights = {
                "success": True,
                "total_experiences_analyzed": len(experiences),
                "best_performing_actions": {},
                "best_performing_symbols": {},
                "best_performing_times": {},
                "common_patterns": []
            }
            
            # Calculate insights if reward information is available
            if 'reward' in df.columns:
                # Best performing actions
                if 'action' in df.columns:
                    action_rewards = df.groupby('action')['reward'].agg(['mean', 'sum', 'count'])
                    action_rewards = action_rewards.sort_values('mean', ascending=False)
                    
                    insights["best_performing_actions"] = {
                        action: {
                            "mean_reward": row['mean'],
                            "total_reward": row['sum'],
                            "count": row['count']
                        }
                        for action, row in action_rewards.iterrows()
                    }
                
                # Best performing symbols
                if 'state' in df.columns and df['state'].apply(lambda x: isinstance(x, dict)).all():
                    df['symbol'] = df['state'].apply(lambda x: x.get('symbol', 'unknown'))
                    
                    symbol_rewards = df.groupby('symbol')['reward'].agg(['mean', 'sum', 'count'])
                    symbol_rewards = symbol_rewards.sort_values('mean', ascending=False)
                    
                    insights["best_performing_symbols"] = {
                        symbol: {
                            "mean_reward": row['mean'],
                            "total_reward": row['sum'],
                            "count": row['count']
                        }
                        for symbol, row in symbol_rewards.iterrows()
                    }
                
                # Best performing times
                if 'timestamp' in df.columns:
                    df['hour'] = df['timestamp'].dt.hour
                    
                    hour_rewards = df.groupby('hour')['reward'].agg(['mean', 'sum', 'count'])
                    hour_rewards = hour_rewards.sort_values('mean', ascending=False)
                    
                    insights["best_performing_times"] = {
                        f"{hour:02d}:00": {
                            "mean_reward": row['mean'],
                            "total_reward": row['sum'],
                            "count": row['count']
                        }
                        for hour, row in hour_rewards.iterrows()
                    }
                
                # Find common patterns in successful trades
                successful_trades = df[df['reward'] > 0]
                
                if len(successful_trades) > 10:
                    # Pattern 1: Action type and time of day
                    if 'action' in df.columns and 'timestamp' in df.columns:
                        df['hour'] = df['timestamp'].dt.hour
                        action_hour_success = df.groupby(['action', 'hour'])['reward'].agg(['mean', 'count'])
                        action_hour_success = action_hour_success[action_hour_success['count'] >= 5]
                        action_hour_success = action_hour_success.sort_values('mean', ascending=False)
                        
                        for (action, hour), row in action_hour_success.head(5).iterrows():
                            insights["common_patterns"].append({
                                "type": "action_time",
                                "action": action,
                                "time": f"{hour:02d}:00",
                                "mean_reward": row['mean'],
                                "count": row['count']
                            })
                    
                    # Pattern 2: Market condition indicators
                    if 'state' in df.columns and df['state'].apply(lambda x: isinstance(x, dict)).all():
                        # Look for common market conditions in state
                        # This is a simplified example - in practice, you'd extract relevant indicators
                        market_conditions = []
                        
                        for _, row in successful_trades.iterrows():
                            state = row['state']
                            action = row.get('action', 'unknown')
                            
                            if 'market_trend' in state:
                                market_conditions.append({
                                    "condition": state['market_trend'],
                                    "action": action,
                                    "reward": row['reward']
                                })
                        
                        if market_conditions:
                            df_conditions = pd.DataFrame(market_conditions)
                            condition_success = df_conditions.groupby(['condition', 'action'])['reward'].agg(['mean', 'count'])
                            condition_success = condition_success[condition_success['count'] >= 3]
                            condition_success = condition_success.sort_values('mean', ascending=False)
                            
                            for (condition, action), row in condition_success.head(5).iterrows():
                                insights["common_patterns"].append({
                                    "type": "market_condition",
                                    "condition": condition,
                                    "action": action,
                                    "mean_reward": row['mean'],
                                    "count": row['count']
                                })
            
            return insights
            
        except Exception as e:
            self.logger.error(f"Error extracting trading insights: {str(e)}")
            return {
                "success": False,
                "message": f"Error extracting trading insights: {str(e)}"
            }
    
    def create_training_dataset(self, agent_id: str, 
                              format_type: str = "reinforcement_learning") -> Dict:
        """
        Create a training dataset from agent's experiences.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent
        format_type : str
            Type of training dataset to create:
            - "reinforcement_learning": For RL training
            - "supervised_learning": For supervised learning
            - "experience_replay": For experience replay in DQN
            
        Returns:
        --------
        dict
            Dataset information and path to saved dataset
        """
        try:
            # Get a large sample of experiences
            experiences = self.retrieve_experiences(agent_id, limit=10000)
            
            if not experiences:
                return {
                    "success": False,
                    "message": f"No experiences found for agent {agent_id}"
                }
            
            # Ensure agent directory exists
            agent_dir = os.path.join(self.storage_path, agent_id)
            os.makedirs(agent_dir, exist_ok=True)
            
            dataset_dir = os.path.join(agent_dir, "datasets")
            os.makedirs(dataset_dir, exist_ok=True)
            
            # Generate a unique filename
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            filename = f"{format_type}_{timestamp}.pkl"
            filepath = os.path.join(dataset_dir, filename)
            
            # Process experiences based on format type
            if format_type == "reinforcement_learning":
                # Format for RL: state, action, reward, next_state, done
                rl_data = []
                
                for i in range(len(experiences) - 1):
                    exp = experiences[i]
                    next_exp = experiences[i + 1]
                    
                    # Check if experiences have required fields
                    if all(k in exp for k in ["state", "action", "reward"]) and "state" in next_exp:
                        rl_data.append({
                            "state": exp["state"],
                            "action": exp["action"],
                            "reward": exp["reward"],
                            "next_state": next_exp["state"],
                            "done": False  # Assuming sequential experiences
                        })
                
                # Last experience
                if experiences and all(k in experiences[-1] for k in ["state", "action", "reward"]):
                    rl_data.append({
                        "state": experiences[-1]["state"],
                        "action": experiences[-1]["action"],
                        "reward": experiences[-1]["reward"],
                        "next_state": None,
                        "done": True
                    })
                
                # Save dataset
                with open(filepath, 'wb') as f:
                    pickle.dump(rl_data, f)
                
                return {
                    "success": True,
                    "format_type": format_type,
                    "dataset_size": len(rl_data),
                    "filepath": filepath
                }
                
            elif format_type == "supervised_learning":
                # Format for supervised learning: features, labels
                sl_data = {
                    "features": [],
                    "labels": []
                }
                
                for exp in experiences:
                    if all(k in exp for k in ["state", "action"]):
                        # Convert state to feature vector
                        # This is simplified - in practice, you'd extract relevant features
                        features = self._state_to_features(exp["state"])
                        
                        if features:
                            sl_data["features"].append(features)
                            sl_data["labels"].append(exp["action"])
                
                # Save dataset
                with open(filepath, 'wb') as f:
                    pickle.dump(sl_data, f)
                
                return {
                    "success": True,
                    "format_type": format_type,
                    "dataset_size": len(sl_data["features"]),
                    "filepath": filepath
                }
                
            elif format_type == "experience_replay":
                # Format for experience replay: direct storage of experiences
                # Save dataset
                with open(filepath, 'wb') as f:
                    pickle.dump(experiences, f)
                
                return {
                    "success": True,
                    "format_type": format_type,
                    "dataset_size": len(experiences),
                    "filepath": filepath
                }
                
            else:
                return {
                    "success": False,
                    "message": f"Unsupported format type: {format_type}"
                }
            
        except Exception as e:
            self.logger.error(f"Error creating training dataset: {str(e)}")
            return {
                "success": False,
                "message": f"Error creating training dataset: {str(e)}"
            }
    
    def store_agent_metadata(self, agent_id: str, metadata: Dict) -> bool:
        """
        Store metadata about an agent.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent
        metadata : dict
            Agent metadata
            
        Returns:
        --------
        bool
            True if metadata was stored successfully, False otherwise
        """
        try:
            # Ensure agent directory exists
            agent_dir = os.path.join(self.storage_path, agent_id)
            os.makedirs(agent_dir, exist_ok=True)
            
            # Add timestamp
            metadata["last_updated"] = datetime.now().isoformat()
            
            # Write metadata to file
            metadata_path = os.path.join(agent_dir, "metadata.json")
            
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Update cache
            self.agent_metadata[agent_id] = metadata
            
            self.logger.debug(f"Stored metadata for agent {agent_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error storing agent metadata: {str(e)}")
            return False
    
    def get_agent_metadata(self, agent_id: str) -> Optional[Dict]:
        """
        Get metadata about an agent.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent
            
        Returns:
        --------
        dict or None
            Agent metadata or None if not found
        """
        try:
            # Check cache first
            if agent_id in self.agent_metadata:
                return self.agent_metadata[agent_id]
            
            # Check if metadata file exists
            metadata_path = os.path.join(self.storage_path, agent_id, "metadata.json")
            
            if not os.path.exists(metadata_path):
                return None
            
            # Read metadata from file
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            # Update cache
            self.agent_metadata[agent_id] = metadata
            
            return metadata
            
        except Exception as e:
            self.logger.error(f"Error getting agent metadata: {str(e)}")
            return None
    
    def list_agent_ids(self) -> List[str]:
        """
        Get a list of all agent IDs with stored memories.
        
        Returns:
        --------
        list
            List of agent IDs
        """
        try:
            # Get all directories in storage path
            agent_ids = [d for d in os.listdir(self.storage_path) 
                       if os.path.isdir(os.path.join(self.storage_path, d))]
            
            return agent_ids
            
        except Exception as e:
            self.logger.error(f"Error listing agent IDs: {str(e)}")
            return []
    
    def get_memory_stats(self, agent_id: Optional[str] = None) -> Dict:
        """
        Get statistics about stored memories.
        
        Parameters:
        -----------
        agent_id : str, optional
            ID of a specific agent or None for all agents
            
        Returns:
        --------
        dict
            Memory statistics
        """
        try:
            stats = {
                "total_agents": 0,
                "total_experiences": 0,
                "agents": {}
            }
            
            # Get agent IDs
            agent_ids = [agent_id] if agent_id else self.list_agent_ids()
            stats["total_agents"] = len(agent_ids)
            
            # Get stats for each agent
            for aid in agent_ids:
                agent_dir = os.path.join(self.storage_path, aid)
                
                if not os.path.exists(agent_dir):
                    continue
                
                # Count experience files
                experience_count = len([f for f in os.listdir(agent_dir) 
                                     if f.endswith(".json") and f != "metadata.json"])
                
                stats["total_experiences"] += experience_count
                
                # Get metadata if available
                metadata = self.get_agent_metadata(aid)
                
                stats["agents"][aid] = {
                    "experience_count": experience_count,
                    "metadata": metadata
                }
            
            return stats
            
        except Exception as e:
            self.logger.error(f"Error getting memory stats: {str(e)}")
            return {
                "error": str(e)
            }
    
    def clear_agent_memories(self, agent_id: str) -> bool:
        """
        Clear all memories for an agent.
        
        Parameters:
        -----------
        agent_id : str
            ID of the agent
            
        Returns:
        --------
        bool
            True if memories were cleared successfully, False otherwise
        """
        try:
            agent_dir = os.path.join(self.storage_path, agent_id)
            
            if not os.path.exists(agent_dir):
                self.logger.warning(f"No memories found for agent {agent_id}")
                return True
            
            # Delete all JSON files except metadata.json
            for filename in os.listdir(agent_dir):
                if filename.endswith(".json") and filename != "metadata.json":
                    filepath = os.path.join(agent_dir, filename)
                    os.remove(filepath)
            
            # Clear cache
            if agent_id in self.memory_cache:
                self.memory_cache[agent_id] = []
            
            self.logger.info(f"Cleared memories for agent {agent_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error clearing agent memories: {str(e)}")
            return False
    
    def _filter_experiences(self, experiences: List[Dict],
                          start_time: Optional[datetime] = None,
                          end_time: Optional[datetime] = None,
                          filters: Optional[Dict] = None) -> List[Dict]:
        """
        Filter experiences based on time range and additional filters.
        
        Parameters:
        -----------
        experiences : list
            List of experience dictionaries
        start_time : datetime, optional
            Start of time range
        end_time : datetime, optional
            End of time range
        filters : dict, optional
            Additional filters
            
        Returns:
        --------
        list
            Filtered list of experiences
        """
        filtered = []
        
        for exp in experiences:
            # Apply time filters
            if "timestamp" in exp:
                timestamp = datetime.fromisoformat(exp["timestamp"]) \
                    if isinstance(exp["timestamp"], str) else exp["timestamp"]
                
                if start_time and timestamp < start_time:
                    continue
                    
                if end_time and timestamp > end_time:
                    continue
            
            # Apply additional filters
            if filters:
                match = True
                for key, value in filters.items():
                    if key not in exp or exp[key] != value:
                        match = False
                        break
                        
                if not match:
                    continue
            
            filtered.append(exp)
        
        return filtered
    
    def _state_to_features(self, state: Dict) -> Optional[List[float]]:
        """
        Convert a state dictionary to a feature vector.
        
        Parameters:
        -----------
        state : dict
            State dictionary
            
        Returns:
        --------
        list or None
            Feature vector or None if conversion failed
        """
        try:
            # This is a simplified example - in practice, you'd extract relevant features
            features = []
            
            # Example: extract price and volume
            if "price" in state:
                features.append(float(state["price"]))
            
            if "volume" in state:
                features.append(float(state["volume"]))
            
            # Example: extract technical indicators
            if "indicators" in state and isinstance(state["indicators"], dict):
                indicators = state["indicators"]
                
                if "rsi" in indicators:
                    features.append(float(indicators["rsi"]))
                
                if "macd" in indicators:
                    features.append(float(indicators["macd"]))
            
            return features if features else None
            
        except Exception as e:
            self.logger.error(f"Error converting state to features: {str(e)}")
            return None
