import logging
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Callable, Awaitable
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class WorkflowStep(ABC):
    """Base class for all workflow steps in the trading farm."""

    def __init__(self, name: str):
        self.name = name
        self.start_time = None
        self.end_time = None
        self.status = "not_started"  # Possible values: not_started, running, completed, failed
        self.error = None
        self.result = None
        self.next_steps = []
        self.previous_steps = []
        self.dependencies = []  # Steps that must complete before this one can start
        self.on_success_callbacks = []
        self.on_failure_callbacks = []

    @abstractmethod
    async def execute(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the workflow step and return the result."""
        pass

    def add_next_step(self, step: 'WorkflowStep') -> None:
        """Add a step to be executed after this one."""
        self.next_steps.append(step)
        step.previous_steps.append(self)

    def add_dependency(self, step: 'WorkflowStep') -> None:
        """Add a dependency that must complete before this step can execute."""
        if step not in self.dependencies:
            self.dependencies.append(step)

    def on_success(self, callback: Callable[['WorkflowStep', Dict[str, Any]], Awaitable[None]]) -> None:
        """Register a callback to be invoked when this step completes successfully."""
        self.on_success_callbacks.append(callback)

    def on_failure(self, callback: Callable[['WorkflowStep', Exception], Awaitable[None]]) -> None:
        """Register a callback to be invoked when this step fails."""
        self.on_failure_callbacks.append(callback)

    async def _execute_with_tracking(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the step with timing and status tracking.
        This is a template method that handles common logic for all steps.
        """
        self.status = "running"
        self.start_time = datetime.now()
        logger.info(f"Starting workflow step: {self.name}")

        try:
            # Execute the actual step logic
            self.result = await self.execute(context)
            self.status = "completed"
            logger.info(f"Completed workflow step: {self.name}")

            # Invoke success callbacks
            for callback in self.on_success_callbacks:
                await callback(self, self.result)

            return self.result
        except Exception as e:
            self.status = "failed"
            self.error = str(e)
            logger.error(f"Failed workflow step: {self.name} - {str(e)}", exc_info=True)

            # Invoke failure callbacks
            for callback in self.on_failure_callbacks:
                await callback(self, e)

            raise
        finally:
            self.end_time = datetime.now()

    def execution_time(self) -> Optional[timedelta]:
        """Return the execution time of this step, or None if not completed."""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None

    def __str__(self) -> str:
        return f"WorkflowStep(name={self.name}, status={self.status})"


class Workflow:
    """
    A Workflow manages the execution of a sequence of WorkflowStep objects,
    handling dependencies, parallelization, and error handling.
    """

    def __init__(self, name: str, steps: Optional[List[WorkflowStep]] = None):
        self.name = name
        self.steps = steps or []
        self.context = {}  # Shared context among workflow steps
        self.status = "not_started"
        self.start_time = None
        self.end_time = None
        self.on_completion_callbacks = []
        self.max_concurrent_steps = 5  # Default max parallel steps

    def add_step(self, step: WorkflowStep) -> None:
        """Add a step to the workflow."""
        self.steps.append(step)

    def add_context(self, key: str, value: Any) -> None:
        """Add a value to the shared context."""
        self.context[key] = value

    def on_completion(self, callback: Callable[['Workflow'], Awaitable[None]]) -> None:
        """Register a callback to be invoked when the workflow completes."""
        self.on_completion_callbacks.append(callback)

    def set_max_concurrent_steps(self, max_steps: int) -> None:
        """Set the maximum number of steps that can run concurrently."""
        self.max_concurrent_steps = max_steps

    async def execute(self) -> Dict[str, Any]:
        """Execute the entire workflow, respecting dependencies."""
        self.status = "running"
        self.start_time = datetime.now()
        logger.info(f"Starting workflow: {self.name}")

        try:
            # Create a copy of the steps list to track remaining steps
            remaining_steps = self.steps.copy()
            active_steps = []
            completed_steps = []
            failed = False

            # Create a semaphore to limit concurrent steps
            semaphore = asyncio.Semaphore(self.max_concurrent_steps)

            async def execute_step_with_semaphore(step):
                async with semaphore:
                    try:
                        result = await step._execute_with_tracking(self.context)
                        completed_steps.append(step)
                        return True
                    except Exception:
                        nonlocal failed
                        failed = True
                        return False
                    finally:
                        active_steps.remove(step)

            # Keep executing steps until all are done or one fails
            while remaining_steps and not failed:
                # Find steps that are ready to execute (all dependencies are completed)
                ready_steps = [
                    step for step in remaining_steps
                    if all(dep in completed_steps for dep in step.dependencies)
                ]

                # If no steps are ready but we have active steps, wait for some to complete
                if not ready_steps and active_steps:
                    await asyncio.sleep(0.1)
                    continue

                # If no steps are ready and no active steps, we have a deadlock or are done
                if not ready_steps and not active_steps:
                    if len(completed_steps) < len(self.steps):
                        logger.error(f"Workflow deadlock detected in {self.name}")
                        failed = True
                    break

                # Start executing ready steps
                for step in ready_steps:
                    remaining_steps.remove(step)
                    active_steps.append(step)
                    asyncio.create_task(execute_step_with_semaphore(step))

                # Give other tasks a chance to run
                await asyncio.sleep(0.01)

            if failed:
                self.status = "failed"
                logger.error(f"Workflow {self.name} failed")
            else:
                self.status = "completed"
                logger.info(f"Workflow {self.name} completed successfully")

            # Invoke completion callbacks
            for callback in self.on_completion_callbacks:
                await callback(self)

            return self.context
        finally:
            self.end_time = datetime.now()

    def execution_time(self) -> Optional[timedelta]:
        """Return the execution time of the workflow, or None if not completed."""
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None

    def get_step_by_name(self, name: str) -> Optional[WorkflowStep]:
        """Find a step by its name."""
        for step in self.steps:
            if step.name == name:
                return step
        return None

    def __str__(self) -> str:
        return f"Workflow(name={self.name}, steps={len(self.steps)}, status={self.status})"


class WorkflowScheduler:
    """
    Manages scheduling and execution of workflows at specified intervals.
    """

    def __init__(self):
        self.scheduled_workflows = {}  # Map of workflow name to (workflow, interval) tuples
        self.running_workflows = {}  # Map of workflow name to task
        self._stop_event = asyncio.Event()
        self._main_task = None

    def schedule(self, workflow: Workflow, interval_seconds: int) -> None:
        """Schedule a workflow to run at the specified interval."""
        self.scheduled_workflows[workflow.name] = (workflow, interval_seconds)
        logger.info(f"Scheduled workflow {workflow.name} to run every {interval_seconds} seconds")

    def unschedule(self, workflow_name: str) -> None:
        """Remove a workflow from the schedule."""
        if workflow_name in self.scheduled_workflows:
            del self.scheduled_workflows[workflow_name]
            logger.info(f"Unscheduled workflow {workflow_name}")

    async def start(self) -> None:
        """Start the scheduler."""
        if self._main_task is not None:
            logger.warning("Scheduler is already running")
            return

        self._stop_event.clear()
        self._main_task = asyncio.create_task(self._scheduler_loop())
        logger.info("Workflow scheduler started")

    async def stop(self) -> None:
        """Stop the scheduler."""
        if self._main_task is None:
            logger.warning("Scheduler is not running")
            return

        self._stop_event.set()
        await self._main_task
        self._main_task = None
        logger.info("Workflow scheduler stopped")

    async def _scheduler_loop(self) -> None:
        """Main scheduler loop."""
        last_run = {name: datetime.min for name in self.scheduled_workflows}

        while not self._stop_event.is_set():
            now = datetime.now()

            for name, (workflow, interval) in self.scheduled_workflows.items():
                # Check if it's time to run this workflow
                if (now - last_run[name]).total_seconds() >= interval and name not in self.running_workflows:
                    # Start the workflow
                    last_run[name] = now
                    self.running_workflows[name] = asyncio.create_task(self._run_workflow(workflow))

            # Remove completed workflow tasks
            completed_workflows = [name for name, task in self.running_workflows.items() 
                                  if task.done()]
            for name in completed_workflows:
                task = self.running_workflows.pop(name)
                try:
                    await task  # Retrieve any exceptions
                except Exception as e:
                    logger.error(f"Workflow {name} failed with error: {str(e)}", exc_info=True)

            await asyncio.sleep(0.1)  # Small delay to prevent busy waiting

    async def _run_workflow(self, workflow: Workflow) -> None:
        """Run a single workflow and handle any errors."""
        try:
            await workflow.execute()
        except Exception as e:
            logger.error(f"Error running workflow {workflow.name}: {str(e)}", exc_info=True)
        finally:
            if workflow.name in self.running_workflows:
                self.running_workflows.pop(workflow.name)

    def is_running(self, workflow_name: str) -> bool:
        """Check if a workflow is currently running."""
        return workflow_name in self.running_workflows

    def get_status(self) -> Dict[str, Dict[str, Any]]:
        """Get the status of all scheduled workflows."""
        status = {}
        for name, (workflow, interval) in self.scheduled_workflows.items():
            status[name] = {
                "interval": interval,
                "is_running": name in self.running_workflows,
                "last_status": workflow.status,
                "last_execution_time": workflow.execution_time()
            }
        return status
