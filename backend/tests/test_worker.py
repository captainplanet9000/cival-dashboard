import pytest
# Assuming WorkerAgent is importable (adjust path as needed)
# from backend.agents.worker import WorkerAgent 

# Placeholder for concrete implementation for testing
class ConcreteWorker(WorkerAgent):
    async def _perform_task(self, task: dict):
        # Simple mock implementation for testing base class features
        if task.get("action") == "succeed":
            return {"data": "success result"}
        elif task.get("action") == "fail":
            raise ValueError("Task failed intentionally")
        return None

@pytest.mark.asyncio
async def test_worker_initialization():
    """Tests basic initialization of a worker agent."""
    manager_id = "manager-1"
    specs = {"capability": "test"}
    worker = ConcreteWorker(manager_id, specs)
    assert worker.get_id() is not None
    assert worker.manager_id == manager_id
    assert worker.specs == specs
    assert worker.get_status() == "idle"
    print(f"\nWorker Initialized: ID={worker.get_id()}, Status={worker.get_status()}")

@pytest.mark.asyncio
async def test_worker_execute_success():
    """Tests successful task execution flow."""
    worker = ConcreteWorker("manager-1", {})
    task = {"id": "task-succeed", "action": "succeed"}
    result = await worker.execute(task)
    assert result["success"] is True
    assert result["result"] == {"data": "success result"}
    assert worker.get_status() == "idle"
    assert worker.current_task is None
    print(f"\nWorker Execute Success: Result={result}, Status={worker.get_status()}")

@pytest.mark.asyncio
async def test_worker_execute_failure():
    """Tests failed task execution flow."""
    worker = ConcreteWorker("manager-1", {})
    task = {"id": "task-fail", "action": "fail"}
    result = await worker.execute(task)
    assert result["success"] is False
    assert "Task failed intentionally" in result["error"]
    assert worker.get_status() == "failed"
    assert worker.current_task == task # Task might be kept for inspection on failure
    print(f"\nWorker Execute Failure: Result={result}, Status={worker.get_status()}")

@pytest.mark.asyncio
async def test_worker_execute_when_not_idle():
    """Tests that a worker rejects tasks if not idle."""
    worker = ConcreteWorker("manager-1", {})
    worker.status = "working" # Manually set status
    task = {"id": "task-ignored", "action": "succeed"}
    result = await worker.execute(task)
    assert result["success"] is False
    assert "Agent not idle" in result["error"]
    assert worker.get_status() == "working" # Status should remain unchanged
    print(f"\nWorker Execute Not Idle: Result={result}, Status={worker.get_status()}")

# TODO: Add tests for report_health
# TODO: Add tests for send_heartbeat (might require mocking)
# TODO: Add tests for ElizaWorkerAgent subclass 