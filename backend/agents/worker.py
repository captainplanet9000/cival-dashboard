import uuid
from abc import ABC, abstractmethod
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WorkerAgent(ABC):
    """Abstract base class for all worker agents."""

    def __init__(self, manager_id: str, specs: dict, agent_id: str = None):
        """
        Initializes the WorkerAgent.

        Args:
            manager_id: The ID of the manager agent overseeing this worker.
            specs: A dictionary containing the worker's specifications and capabilities.
            agent_id: Optional pre-defined agent ID. If None, a new UUID is generated.
        """
        self.id = agent_id or str(uuid.uuid4())
        self.manager_id = manager_id
        self.specs = specs
        self.current_task = None
        self.status = "idle" # Possible statuses: idle, working, failed, initializing
        logger.info(f"WorkerAgent {self.id} initialized for manager {self.manager_id} with specs: {self.specs}")

    async def execute(self, task: dict) -> dict:
        """Executes an assigned task and returns the result."""
        if self.status != 'idle':
            logger.warning(f"Worker {self.id} received task while not idle (status: {self.status}). Task ignored.")
            return {"success": False, "error": f"Agent not idle, current status: {self.status}"}
        
        logger.info(f"Worker {self.id} starting task: {task.get('id', 'N/A')}")
        self.current_task = task
        self.status = "working"
        try:
            # Delegate the actual task performance to the subclass implementation
            result = await self._perform_task(task)
            self.status = "idle"
            self.current_task = None
            logger.info(f"Worker {self.id} completed task: {task.get('id', 'N/A')}")
            return {"success": True, "result": result}
        except Exception as e:
            logger.error(f"Worker {self.id} failed task {task.get('id', 'N/A')}: {e}", exc_info=True)
            self.status = "failed" # Or potentially an error state
            # Keep current_task for potential debugging/retry?
            return {"success": False, "error": str(e)}

    @abstractmethod
    async def _perform_task(self, task: dict):
        """
        Abstract method for worker-specific task implementation.
        Subclasses must override this method.
        
        Args:
            task: The task dictionary containing payload and instructions.
            
        Returns:
            The result of the task execution.
            
        Raises:
            Exception: If the task execution fails.
        """
        pass

    async def report_health(self) -> dict:
        """Reports the current health status of the worker."""
        # Basic health report, subclasses can override for more detail
        logger.debug(f"Worker {self.id} reporting health. Status: {self.status}")
        return {
            "agent_id": self.id,
            "status": self.status,
            "current_task_id": self.current_task.get('id') if self.current_task else None
            # Add more metrics like memory usage, uptime, etc. if needed
        }

    async def send_heartbeat(self):
        """Placeholder method for sending heartbeats to the manager or monitoring system."""
        # In a real implementation, this would likely call a manager API or update a DB record
        logger.debug(f"Worker {self.id} sending heartbeat.")
        # Example: await manager_client.heartbeat(self.id, self.status)
        pass

    def get_id(self) -> str:
        return self.id

    def get_status(self) -> str:
        return self.status 