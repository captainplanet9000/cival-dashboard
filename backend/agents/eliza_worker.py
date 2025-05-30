from .worker import WorkerAgent # Assuming worker.py is in the same directory
import logging
import asyncio # For placeholder sleep

# Placeholder for ElizaOS Client - replace with actual client import and implementation
class PlaceholderElizaOSClient:
    async def store_memory(self, agent_id: str, memory_type: str, content: dict):
        logging.info(f"[PlaceholderElizaOSClient] Storing memory for {agent_id} ({memory_type}): {content}")
        await asyncio.sleep(0.05) # Simulate async call

    async def query(self, topic: str, prompt: str) -> dict:
        logging.info(f"[PlaceholderElizaOSClient] Querying ({topic}): {prompt}")
        await asyncio.sleep(0.1) # Simulate async call
        # Simulate getting an execution plan
        if topic == 'task_execution':
            return {"steps": ["step 1: analyze", "step 2: execute", "step 3: verify"], "details": prompt}
        return {"result": "mocked eliza query response"}

    async def execute_agent_task(self, agent_id: str, task: dict) -> dict:
        logging.info(f"[PlaceholderElizaOSClient] Executing agent task for {agent_id}: {task}")
        await asyncio.sleep(0.2) # Simulate task execution time
        # Simulate successful execution based on plan
        return {"status": "completed", "output": f"Successfully executed: {task.get('details', '')}"}

logger = logging.getLogger(__name__)

class ElizaWorkerAgent(WorkerAgent):
    """Concrete worker agent implementation integrated with ElizaOS."""

    def __init__(self, manager_id: str, specs: dict, eliza_client: PlaceholderElizaOSClient, agent_id: str = None):
        """
        Initializes the ElizaWorkerAgent.

        Args:
            manager_id: The ID of the manager agent.
            specs: Worker specifications.
            eliza_client: An instance of the ElizaOS client (placeholder used here).
            agent_id: Optional pre-defined agent ID.
        """
        super().__init__(manager_id, specs, agent_id)
        self.eliza = eliza_client
        # Note: The original design mentioned self.memory = None, relying on ElizaOS.
        # Depending on implementation, you might still want local short-term memory or cache.
        logger.info(f"ElizaWorkerAgent {self.id} initialized.")

    async def _perform_task(self, task: dict):
        """
        Performs the task by coordinating with ElizaOS.
        1. Stores the task in ElizaOS memory.
        2. Queries ElizaOS for an execution plan.
        3. Executes the plan via ElizaOS.
        """
        task_id = task.get('id', 'N/A')
        logger.info(f"ElizaWorker {self.id} starting task {task_id} via ElizaOS.")
        
        try:
            # 1. Store task in ElizaOS memory first (optional, depends on ElizaOS design)
            await self.eliza.store_memory(
                agent_id=self.id,
                memory_type='task_received', # Example memory type
                content=task
            )

            # 2. Get execution plan from ElizaOS
            # We might pass the whole task or just the relevant payload
            task_payload = task.get('payload', task) # Adjust as needed
            plan = await self.eliza.query(
                'task_execution',
                f"Create execution plan for task {task_id}: {task_payload}"
            )
            logger.debug(f"ElizaWorker {self.id} received execution plan: {plan}")

            # 3. Execute with ElizaOS oversight
            # Pass the structured plan, not just the original task
            execution_result = await self.eliza.execute_agent_task(
                agent_id=self.id,
                task=plan # Pass the plan received from ElizaOS
            )
            logger.info(f"ElizaWorker {self.id} task {task_id} execution result: {execution_result}")

            # Check result from ElizaOS execution
            if execution_result.get('status') == 'completed':
                return execution_result.get('output', "Execution completed successfully.")
            else:
                error_message = execution_result.get('error', 'Unknown execution error from ElizaOS')
                logger.error(f"ElizaWorker {self.id} task {task_id} failed during ElizaOS execution: {error_message}")
                raise Exception(f"ElizaOS execution failed: {error_message}")

        except Exception as e:
            logger.error(f"ElizaWorker {self.id} error during _perform_task for task {task_id}: {e}", exc_info=True)
            # Re-raise the exception so the main execute method catches it
            raise e

    # Optional: Override report_health or other methods if Eliza integration provides more details
    # async def report_health(self) -> dict:
    #     base_health = await super().report_health()
    #     eliza_status = await self.eliza.get_agent_status(self.id) # Fictional method
    #     base_health['eliza_status'] = eliza_status
    #     return base_health 