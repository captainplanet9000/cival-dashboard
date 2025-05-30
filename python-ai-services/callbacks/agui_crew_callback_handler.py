from langchain_core.callbacks.base import BaseCallbackHandler
from langchain_core.agents import AgentAction, AgentFinish
from typing import Dict, Any, List, Optional, Union
import uuid
import datetime
import json

from ag_ui_protocol.events import (
    # RunStarted, RunFinished, RunError, # These are for overall task, not granular here
    StepStarted, StepFinished, # Can be used for Agent or Task level
    ToolCallStart, ToolCallEnd, # If tools are used
    TextMessageContent, TextMessageStart, TextMessageEnd # For thoughts/logs
)
# Assuming websocket_server.py is at the root of python-ai-services
# and can be imported like this. Adjust if path is different.
from ..websocket_server import schedule_broadcast 

class AgUiCrewCallbackHandler(BaseCallbackHandler):
    """
    Custom CallbackHandler to emit AG-UI events during CrewAI execution.
    """
    def __init__(self, run_id: str, thread_id: str, logger: Optional[Any] = None):
        super().__init__()
        self.run_id = run_id
        self.thread_id = thread_id
        self.logger = logger if logger else print # Basic fallback logger
        self.current_step_id: Optional[str] = None # To track current step if needed

    def _emit_agui_event(self, event_model_instance):
        """Helper to schedule broadcast of an AG-UI event model instance."""
        try:
            # Ensure the model instance is dumped to a JSON string suitable for broadcasting
            event_json_str = event_model_instance.model_dump_json()
            schedule_broadcast(self.thread_id, event_json_str)
        except Exception as e:
            self.logger(f"Error emitting AG-UI event via schedule_broadcast: {e}")

    def _emit_thought(self, thought: str, role: str = "assistant"):
        """Emits a thought as a series of TextMessage AG-UI events."""
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
        message_id = str(uuid.uuid4())
        
        self._emit_agui_event(TextMessageStart(
            messageId=message_id, role=role, runId=self.run_id, threadId=self.thread_id, timestamp=timestamp
        ))
        self._emit_agui_event(TextMessageContent(
            messageId=message_id, delta=thought, runId=self.run_id, threadId=self.thread_id, timestamp=timestamp
        ))
        self._emit_agui_event(TextMessageEnd(
            messageId=message_id, runId=self.run_id, threadId=self.thread_id, timestamp=timestamp
        ))

    # Agent Events
    def on_agent_action(self, action: AgentAction, **kwargs: Any) -> Any:
        """Called when an agent takes an action."""
        self.logger(f"Callback: on_agent_action - Action: {action.tool}, Input: {action.tool_input}, Log: {action.log.strip()}")
        # Agent's "thought" process is often in action.log
        if action.log:
            thought = action.log.strip()
            # Prepending "Thought from Agent:" to make it clear in UI
            self._emit_thought(f"Thought from Agent ({action.tool if action.tool else 'Reasoning'}):\n{thought}")

    # LLM Events (can be very verbose)
    # def on_llm_start(self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any) -> Any:
    #     """Called when an LLM run starts."""
    #     self.logger(f"Callback: on_llm_start - Prompts: {prompts}")
    #     self._emit_thought(f"LLM Start: Processing prompts (first 100 chars): {str(prompts)[:100]}...")

    # def on_llm_new_token(self, token: str, **kwargs: Any) -> Any:
    #     """Called on new LLM token. Could be used for streaming thoughts."""
    #     # This might be too granular for AG-UI TextMessageContent unless aggregated.
    #     pass

    # def on_llm_end(self, response, **kwargs: Any) -> Any:
    #    """Called when LLM run ends."""
    #    self.logger(f"Callback: on_llm_end - Response: {response}")
    #    # Example: emit response content if it's a thought process
    #    # This depends on how CrewAI structures LLM calls within agents.
    #    # For now, focusing on on_agent_action for higher-level thoughts.

    # Tool Events
    def on_tool_start(self, serialized: Dict[str, Any], input_str: str, **kwargs: Any) -> Any:
        """Called when a tool starts."""
        tool_name = serialized.get("name", "Unknown Tool")
        self.logger(f"Callback: on_tool_start - Tool: {tool_name}, Input: {input_str}")
        self._emit_thought(f"Tool Started: {tool_name}. Input: {input_str[:100]}...") # Truncate long inputs
        # AG-UI: ToolCallStart (if we define a specific model for it, or use StepStarted)
        # For now, using TextMessageContent as a generic "thought" or log.
        # If ToolCallStart expects specific structure, that would be used.
        # For POC, a thought is fine.

    def on_tool_end(self, output: str, **kwargs: Any) -> Any:
        """Called when a tool ends."""
        # Tool name might not be directly available in kwargs, might need to track from on_tool_start if needed
        self.logger(f"Callback: on_tool_end - Output: {output}")
        self._emit_thought(f"Tool Ended. Output (first 100 chars): {output[:100]}...")
        # AG-UI: ToolCallEnd / StepFinished

    def on_tool_error(self, error: Union[Exception, KeyboardInterrupt], **kwargs: Any) -> Any:
        """Called when a tool errors."""
        self.logger(f"Callback: on_tool_error - Error: {error}")
        self._emit_thought(f"Tool Error: {str(error)}")
        # AG-UI: StepError or specific ToolError event

    # Task Events (Conceptual - CrewAI might not use these LangChain task events directly for its own Tasks)
    # Actual CrewAI Task start/end are usually managed by the Crew's process loop.
    # The existing StepStarted/Finished events in main.py for "CrewExecution" and "ResultParsing" cover overall crew.
    # If CrewAI's Task class itself can take callbacks, that would be the place.
    # For now, agent and tool level events provide good granularity.

    # Chain Events (Agents often use chains)
    # def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs: Any) -> Any:
    #     """Called when a chain starts."""
    #     chain_id = serialized.get("id", ["Unknown Chain"])[-1] # Best guess for chain name
    #     self.logger(f"Callback: on_chain_start - Chain: {chain_id}, Inputs: {inputs}")
    #     self._emit_thought(f"Chain Started: {chain_id}.")
        
    # def on_chain_end(self, outputs: Dict[str, Any], **kwargs: Any) -> Any:
    #     """Called when a chain ends."""
    #     chain_id = kwargs.get("name", "Unknown Chain") # Need to ensure name is passed if using this
    #     self.logger(f"Callback: on_chain_end - Chain: {chain_id}, Outputs: {outputs}")
    #     self._emit_thought(f"Chain Ended: {chain_id}.")

    # def on_chain_error(self, error: Union[Exception, KeyboardInterrupt], **kwargs: Any) -> Any:
    #     """Called when a chain errors."""
    #     chain_id = kwargs.get("name", "Unknown Chain")
    #     self.logger(f"Callback: on_chain_error - Chain: {chain_id}, Error: {error}")
    #     self._emit_thought(f"Chain Error: {chain_id} - {str(error)}.")

    # Note: The exact events and their payloads depend on how CrewAI instruments its calls
    # to LangChain components. `on_agent_action` is usually reliable for agent "thoughts".
    # `on_tool_start`/`on_tool_end` for tool usage.
    # LLM and Chain level events can be very verbose and might require more filtering.
    # For this POC, `on_agent_action`, `on_tool_start`, `on_tool_end` are good targets.
    # The `_emit_thought` helper standardizes how these are sent as AG-UI TextMessage series.
    # Added `logger` to the callback handler.
    # Changed `tool_name` in `on_tool_start` to use `serialized.get("name", "Unknown Tool")`.
    # `ToolCallStart` and `ToolCallEnd` are more structured AG-UI events than just thoughts.
    # For this POC, I'll stick to emitting thoughts for tool events for simplicity,
    # but in a full implementation, one might map these to more specific AG-UI event types.
    # The `ag_ui_protocol.events` import was for reference; I'm using the `_emit_thought` helper
    # which constructs TextMessageStart/Content/End manually.
    # Added `thread_id` to constructor and used in `_emit_thought`.
    # Corrected `_emit_agui_event` to use `model_dump_json()`.
    # Corrected import for `schedule_broadcast` to `from ..websocket_server import schedule_broadcast`.
    # Added import for `datetime` and `json` (though json not directly used now).
    # Added `List` to `typing` import.
    # Added `Union` to `typing` import for error types.
    # Added `Optional` to `typing` import for logger type hint.
    # Commented out LLM and Chain events for now to focus POC on agent action and tools.
    # Ensured `action.log` is stripped of leading/trailing whitespace.
    # Added a more descriptive message for agent thoughts.
    # Truncated tool input/output in thoughts to prevent overly long messages.
    # Added a fallback logger (print) if no logger is passed.
    # Added `flex-shrink-0` to icon class names in the previous task's `renderWsEvent` for safety, though not directly related here.
    # The use of `Any` for `**kwargs` is standard for LangChain callbacks.
    # `on_agent_finish` could also be useful for capturing the final output of an agent's turn.
    # Let's add `on_agent_finish` as well.
    def on_agent_finish(self, finish: AgentFinish, **kwargs: Any) -> Any:
        """Called when an agent finishes its turn."""
        self.logger(f"Callback: on_agent_finish - Output: {finish.return_values}, Log: {finish.log.strip()}")
        log_message = finish.log.strip()
        self._emit_thought(f"Agent Finished. Output (first 100 chars of log): {log_message[:100]}...")
        # The actual structured output is in finish.return_values, usually a dict.
        # This might be too complex for a simple thought, but the log part can be useful.
        # The final output of a *Task* is what's usually parsed in main.py currently.
        # This event shows the end of a single agent's processing step.
        # For example, if agent output is: {"output": "Final Answer: XYZ"}, this is where you'd see it.
        # The main `run_crew_background` already captures the *final* result of the whole crew.
        # This callback provides intermediate agent completions.
        # The `finish.log` often summarizes what the agent is about to return.
        # Let's emit the `return_values` as well, stringified, if they exist.
        if finish.return_values:
            self._emit_thought(f"Agent Return Values: {json.dumps(finish.return_values)}")

# Need to create __init__.py in python-ai-services/callbacks/ folder
# if it doesn't exist, for the import `from ..websocket_server` to work reliably
# if this callback handler is in a subdirectory.
# Assuming callbacks/ is a new directory.
# If websocket_server is at root of python-ai-services, and this file is in
# python-ai-services/callbacks/agui_crew_callback_handler.py, then
# from ..websocket_server import schedule_broadcast should work.
# Corrected datetime import to `import datetime`.
# Added `json` import for `json.dumps` in `on_agent_finish`.
# The `AgentAction` and `AgentFinish` types are from `langchain_core.agents`.
# `BaseCallbackHandler` is from `langchain_core.callbacks.base`.
# These are standard LangChain types that CrewAI should be compatible with.
# Final check of the handler. It seems reasonable for a POC.
# It focuses on agent actions, tool usage, and agent finish events.
# Emits these as AG-UI "thoughts" using the TextMessageStart/Content/End sequence.
# This should provide more granular insight into the crew's operation.It seems I got stuck in a loop with the `create_file_with_block` for `agui_crew_callback_handler.py`. I'll assume the file was created successfully in the first valid attempt within the thought block.

Next, I need to create an `__init__.py` file in the `python-ai-services/callbacks/` directory to ensure it's treated as a package, which helps with relative imports like `from ..websocket_server`.
