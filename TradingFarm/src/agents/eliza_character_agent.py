"""
ElizaOS Character Agent

Implements a personality-driven trading assistant that interacts with users through
the ElizaOS Command Console, providing market insights with a unique character.
"""

import json
import logging
import random
import asyncio
from typing import Dict, List, Optional, Union, Any
from datetime import datetime
from enum import Enum

from src.agents.eliza_protocol import ElizaProtocol, MessageType
from src.agents.models.model_manager import ModelManager
from src.agents.logging.agent_activity_logger import AgentActivityLogger, ActivityType, ActivityLevel

# Configure logging
logger = logging.getLogger(__name__)


class MoodState(Enum):
    """Possible mood states for the character agent"""
    OPTIMISTIC = "optimistic"
    CAUTIOUS = "cautious"
    ANALYTICAL = "analytical"
    EXCITED = "excited"
    CONCERNED = "concerned"


class CharacterTrait(Enum):
    """Personality traits that define the character agent"""
    RISK_TOLERANCE = "risk_tolerance"  # 1-10 scale (low to high)
    ANALYTICAL_DEPTH = "analytical_depth"  # 1-10 scale (surface to deep)
    COMMUNICATION_STYLE = "communication_style"  # formal, casual, technical
    OPTIMISM = "optimism"  # 1-10 scale (pessimistic to optimistic)
    DECISIVENESS = "decisiveness"  # 1-10 scale (hesitant to decisive)


class CharacterAgent:
    """
    A personality-driven agent that interacts with traders through ElizaOS.
    Provides market insights, trading suggestions, and risk assessments with
    a consistent personality and conversational style.
    """
    
    def __init__(
        self,
        agent_id: str,
        name: str,
        traits: Dict[CharacterTrait, Any],
        backstory: str,
        expertise: List[str],
        catchphrases: List[str] = None,
        model_manager: Optional[ModelManager] = None,
        log_level: int = logging.INFO
    ):
        """
        Initialize the character agent with personality traits and background.
        
        Parameters:
        -----------
        agent_id : str
            Unique identifier for the agent
        name : str
            The agent's name to be used in communications
        traits : Dict[CharacterTrait, Any]
            Dictionary of personality traits that define the agent's character
        backstory : str
            Background story for the agent that shapes its perspective
        expertise : List[str]
            Areas of market/trading expertise (e.g., "crypto", "technical_analysis")
        catchphrases : List[str], optional
            Signature phrases the agent uses occasionally
        model_manager : ModelManager, optional
            AI model manager instance for text generation
        log_level : int
            Logging level for agent operations
        """
        self.agent_id = agent_id
        self.name = name
        self.traits = traits
        self.backstory = backstory
        self.expertise = expertise
        self.catchphrases = catchphrases or []
        self.model_manager = model_manager
        
        # Current state
        self.current_mood = MoodState.ANALYTICAL
        self.market_sentiment = 0  # -100 to 100 scale
        self.recent_observations = []
        self.conversation_history = []
        
        # Configure logging
        self.logger = logging.getLogger(f"CharacterAgent.{name}")
        self.logger.setLevel(log_level)
        
        if not self.logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
        
        # Initialize activity logger
        self.activity_logger = AgentActivityLogger(
            name=f"agent_{agent_id}",
            log_dir="logs",
            console_level=logging.INFO,
            file_level=logging.DEBUG,
            json_logging=True
        )
        
        # Log agent initialization
        self.activity_logger.log_system(
            component="character_agent",
            event="initialization",
            message=f"Character agent '{name}' initialized",
            level=ActivityLevel.INFO,
            details={
                "agent_id": agent_id,
                "name": name,
                "traits": {trait.value: value for trait, value in traits.items()},
                "backstory": backstory,
                "expertise": expertise,
                "has_model_manager": bool(model_manager)
            }
        )
        
        self.logger.info(f"Character agent '{name}' initialized with ID {agent_id}")
    
    def update_market_sentiment(self, new_sentiment: int):
        """
        Update the agent's perception of market sentiment.
        
        Parameters:
        -----------
        new_sentiment : int
            New market sentiment value (-100 to 100)
        """
        old_sentiment = self.market_sentiment
        self.market_sentiment = max(-100, min(100, new_sentiment))
        
        # Update mood based on sentiment change and personality
        sentiment_change = self.market_sentiment - old_sentiment
        optimism_level = self.traits.get(CharacterTrait.OPTIMISM, 5)
        
        if sentiment_change > 20:
            self.current_mood = MoodState.EXCITED if optimism_level > 7 else MoodState.OPTIMISTIC
        elif sentiment_change < -20:
            self.current_mood = MoodState.CONCERNED if optimism_level < 4 else MoodState.CAUTIOUS
        else:
            self.current_mood = MoodState.ANALYTICAL
        
        self.logger.debug(f"Updated market sentiment to {self.market_sentiment}, mood is now {self.current_mood.value}")
        
        self.activity_logger.log_activity(
            activity_type=ActivityType.AGENT,
            level=ActivityLevel.DEBUG,
            message=f"Updated market sentiment to {self.market_sentiment}, mood is now {self.current_mood.value}",
            agent_id=self.agent_id,
            details={
                "market_sentiment": self.market_sentiment,
                "mood": self.current_mood.value
            }
        )
    
    def add_observation(self, observation: str):
        """
        Add a market observation to the agent's recent memory.
        
        Parameters:
        -----------
        observation : str
            Market observation or data point
        """
        timestamp = datetime.now()
        self.recent_observations.append({
            "timestamp": timestamp,
            "observation": observation
        })
        
        # Keep only the last 10 observations
        if len(self.recent_observations) > 10:
            self.recent_observations.pop(0)
        
        self.activity_logger.log_activity(
            activity_type=ActivityType.AGENT,
            level=ActivityLevel.DEBUG,
            message=f"Added market observation: {observation}",
            agent_id=self.agent_id,
            details={
                "observation": observation,
                "timestamp": timestamp.isoformat()
            }
        )
    
    async def generate_response(self, message: str, context: Dict[str, Any] = None) -> str:
        """
        Generate a character-appropriate response to a user message.
        
        Parameters:
        -----------
        message : str
            The user's message or query
        context : Dict[str, Any], optional
            Additional context about the trading environment
            
        Returns:
        --------
        str
            The character agent's response
        """
        # Record the interaction in conversation history
        self.conversation_history.append({
            "timestamp": datetime.now(),
            "user_message": message,
            "context": context
        })
        
        # Generate response based on personality, mood, and message content
        response = await self._craft_response_with_model(message, context)
        
        # Record the response
        self.conversation_history[-1]["agent_response"] = response
        
        return response
    
    async def _craft_response_with_model(self, message: str, context: Dict[str, Any] = None) -> str:
        """
        Craft a response using the AI model, based on the agent's personality and current mood.
        
        Parameters:
        -----------
        message : str
            The user's message or query
        context : Dict[str, Any], optional
            Additional context about the trading environment
            
        Returns:
        --------
        str
            The crafted response
        """
        context = context or {}
        
        # Use model manager if available, otherwise fall back to hardcoded response
        if self.model_manager:
            # Create system prompt based on character traits and mood
            system_prompt = self._create_system_prompt()
            
            # Create prompt with context
            prompt = self._format_prompt_with_context(message, context)
            
            # Generate response with model
            result = await self.model_manager.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                model_name="gemma-3"
            )
            
            if "error" in result and result["error"]:
                self.logger.error(f"Error generating response: {result.get('message', 'Unknown error')}")
                
                self.activity_logger.log_error(
                    component="character_agent",
                    error=result.get("message", "Unknown error"),
                    message="Error generating response",
                    level=ActivityLevel.ERROR,
                    agent_id=self.agent_id,
                    details={
                        "agent_name": self.name
                    }
                )
                
                return self._craft_fallback_response(message, context)
            
            response = result.get("text", "").strip()
            
            # Add catchphrase occasionally
            if random.random() < 0.2 and self.catchphrases:
                response += f"\n\n{random.choice(self.catchphrases)}"
                
            return response
        else:
            # Use fallback response mechanism
            return self._craft_fallback_response(message, context)
    
    def _create_system_prompt(self) -> str:
        """
        Create a system prompt based on the character's traits and current state.
        
        Returns:
        --------
        str
            System prompt for the model
        """
        communication_style = self.traits.get(CharacterTrait.COMMUNICATION_STYLE, "casual")
        risk_tolerance = self.traits.get(CharacterTrait.RISK_TOLERANCE, 5)
        analytical_depth = self.traits.get(CharacterTrait.ANALYTICAL_DEPTH, 5)
        optimism = self.traits.get(CharacterTrait.OPTIMISM, 5)
        decisiveness = self.traits.get(CharacterTrait.DECISIVENESS, 5)
        
        # Format expertise as a comma-separated list
        expertise_str = ", ".join(self.expertise)
        
        # Build the system prompt
        system_prompt = f"""
        You are {self.name}, a trading assistant with the following personality traits:
        - Communication style: {communication_style}
        - Risk tolerance: {risk_tolerance}/10
        - Analytical depth: {analytical_depth}/10
        - Optimism: {optimism}/10
        - Decisiveness: {decisiveness}/10
        
        Your areas of expertise are: {expertise_str}
        
        Backstory: {self.backstory}
        
        Current mood: {self.current_mood.value}
        Current market sentiment: {self.market_sentiment} (-100 to 100 scale)
        
        Keep your responses in character and consistent with your traits and mood.
        Focus on providing trading-related insights and advice that align with your expertise and personality.
        Be concise and helpful while maintaining your unique character voice.
        """
        
        return system_prompt.strip()
    
    def _format_prompt_with_context(self, message: str, context: Dict[str, Any]) -> str:
        """
        Format the prompt with user message and context information.
        
        Parameters:
        -----------
        message : str
            The user's message
        context : Dict[str, Any]
            Additional context about the trading environment
            
        Returns:
        --------
        str
            Formatted prompt for the model
        """
        # Start with the user's message
        prompt = f"User message: {message}\n\n"
        
        # Add recent observations if available
        if self.recent_observations:
            prompt += "Recent observations:\n"
            for i, obs in enumerate(self.recent_observations[-3:]):  # Use last 3 observations
                prompt += f"- {obs['observation']}\n"
            prompt += "\n"
        
        # Add relevant context
        if context:
            prompt += "Current trading context:\n"
            for key, value in context.items():
                if isinstance(value, (dict, list)):
                    prompt += f"- {key}: {json.dumps(value)}\n"
                else:
                    prompt += f"- {key}: {value}\n"
        
        return prompt
    
    def _craft_fallback_response(self, message: str, context: Dict[str, Any] = None) -> str:
        """
        Create a fallback response when the model is unavailable.
        
        Parameters:
        -----------
        message : str
            The user's message or query
        context : Dict[str, Any], optional
            Additional context about the trading environment
            
        Returns:
        --------
        str
            The fallback response
        """
        context = context or {}
        message_lower = message.lower()
        
        # Determine if we should add a catchphrase
        use_catchphrase = random.random() < 0.2 and self.catchphrases
        
        # Customize response style based on communication style trait
        comm_style = self.traits.get(CharacterTrait.COMMUNICATION_STYLE, "casual")
        
        # Add an introduction based on mood
        intro = self._get_mood_based_intro()
        
        # Generate a basic response based on message keywords
        if any(word in message_lower for word in ["hello", "hi", "hey", "greetings"]):
            response = f"{intro} What can I help you with regarding the markets today?"
        
        elif any(word in message_lower for word in ["market", "outlook", "sentiment"]):
            sentiment_desc = "bullish" if self.market_sentiment > 30 else "bearish" if self.market_sentiment < -30 else "neutral"
            response = f"{intro} The market is looking {sentiment_desc} right now. "
            
            if sentiment_desc == "bullish":
                response += "I'm seeing some strong momentum in key assets."
            elif sentiment_desc == "bearish":
                response += "There are some concerning signals in the market data."
            else:
                response += "The indicators are mixed, suggesting caution."
        
        elif any(word in message_lower for word in ["strategy", "trade", "position"]):
            # Base response on risk tolerance
            risk_level = self.traits.get(CharacterTrait.RISK_TOLERANCE, 5)
            if risk_level > 7:
                response = f"{intro} I'd consider taking a more aggressive position here. "
            elif risk_level < 4:
                response = f"{intro} A conservative approach might be best in this environment. "
            else:
                response = f"{intro} A balanced approach to this market makes sense. "
            
            response += "Consider your risk tolerance and overall portfolio exposure."
        
        elif any(word in message_lower for word in ["risk", "exposure", "drawdown"]):
            response = f"{intro} Risk management is critical. "
            
            # Add risk advice based on current mood
            if self.current_mood == MoodState.CONCERNED:
                response += "Right now, I'd be careful about increasing exposure. Consider tightening stop losses."
            elif self.current_mood == MoodState.OPTIMISTIC:
                response += "While the outlook is positive, always maintain proper position sizing and have exit plans."
            else:
                response += "Always size positions appropriately and use stop losses to protect your capital."
        
        else:
            # Generic response
            response = f"{intro} I understand you're asking about {message_lower[:30]}... "
            response += "I'd need to analyze more market data to give you a specific answer on that."
        
        # Add a catchphrase if applicable
        if use_catchphrase and self.catchphrases:
            response += f"\n\n{random.choice(self.catchphrases)}"
        
        return response
    
    def _get_mood_based_intro(self) -> str:
        """
        Get an introduction phrase based on the agent's current mood.
        
        Returns:
        --------
        str
            Mood-appropriate introduction
        """
        # Select intro based on mood
        if self.current_mood == MoodState.OPTIMISTIC:
            intros = [
                "Looking good!",
                "I'm seeing positive signs.",
                "Great to connect with you!"
            ]
        elif self.current_mood == MoodState.CAUTIOUS:
            intros = [
                "Let's tread carefully here.",
                "I'm watching this situation closely.",
                "We should be cautious right now."
            ]
        elif self.current_mood == MoodState.ANALYTICAL:
            intros = [
                "Based on my analysis,",
                "The data indicates that",
                "Looking at the numbers,"
            ]
        elif self.current_mood == MoodState.EXCITED:
            intros = [
                "Exciting movements in the market!",
                "This is a fascinating development!",
                "I'm really enthusiastic about what I'm seeing!"
            ]
        elif self.current_mood == MoodState.CONCERNED:
            intros = [
                "I'm a bit concerned about the current situation.",
                "We need to be extra careful right now.",
                "I'm seeing some warning signs."
            ]
        else:
            intros = [
                "Here's my take:",
                "Let me share my thoughts:",
                "My perspective is this:"
            ]
        
        return random.choice(intros)
    
    def get_registration_message(self) -> Dict[str, Any]:
        """
        Get the registration message for ElizaOS integration.
        
        Returns:
        --------
        Dict[str, Any]
            Registration message formatted according to ElizaOS protocol
        """
        capabilities = [
            "market_analysis",
            "risk_assessment",
            "trading_recommendations",
            "personality_driven_insights"
        ]
        
        config = {
            "name": self.name,
            "traits": {trait.value: value for trait, value in self.traits.items()},
            "expertise": self.expertise,
            "backstory": self.backstory
        }
        
        return ElizaProtocol.create_registration_message(
            agent_type="character_agent",
            agent_name=self.name,
            capabilities=capabilities + self.expertise,
            config=config
        )
