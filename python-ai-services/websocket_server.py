import asyncio
import json
import websockets
from websockets.exceptions import ConnectionClosed
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

event_broadcast_queue = asyncio.Queue()
SERVER_EVENT_LOOP = None

# Structure: { "agent_id_1": {client_websocket_1, client_websocket_2, ...}, ... }
agent_subscriptions = {} 
# Structure: { client_websocket_1: "agent_id_subscribed_to" }
client_to_agent_map = {} 

async def process_broadcast_queue():
    logger.info("Event broadcast queue processor started.")
    while True:
        try:
            agent_id, event_message_dict = await event_broadcast_queue.get()
            logger.info(f"Queue processing event for agent {agent_id}: type {event_message_dict.get('type')}")
            await broadcast_event_to_agent_subscribers(agent_id, event_message_dict)
            event_broadcast_queue.task_done()
        except Exception as e:
            logger.error(f"Error in process_broadcast_queue: {e}", exc_info=True)

def schedule_broadcast(agent_id: str, event_message_dict: dict):
    if SERVER_EVENT_LOOP is None:
        logger.error("WebSocket server event loop not available for schedule_broadcast.")
        return
    
    SERVER_EVENT_LOOP.call_soon_threadsafe(event_broadcast_queue.put_nowait, (agent_id, event_message_dict))
    # logger.info(f"Scheduled broadcast for agent {agent_id}, event type {event_message_dict.get('type')}")

async def register_client(websocket, agent_id):
    if agent_id not in agent_subscriptions:
        agent_subscriptions[agent_id] = set()
    agent_subscriptions[agent_id].add(websocket)
    client_to_agent_map[websocket] = agent_id
    logger.info(f"Client {websocket.remote_address} registered for agent_id: {agent_id}")

async def unregister_client(websocket):
    agent_id = client_to_agent_map.pop(websocket, None)
    if agent_id and agent_id in agent_subscriptions:
        agent_subscriptions[agent_id].remove(websocket)
        if not agent_subscriptions[agent_id]: 
            del agent_subscriptions[agent_id]
        logger.info(f"Client {websocket.remote_address} unregistered from agent_id: {agent_id}")
    else:
        logger.info(f"Client {websocket.remote_address} already unregistered or had no agent_id.")

async def handle_websocket_connection(websocket, path):
    logger.info(f"Client connected: {websocket.remote_address}, path: {path}")
    try:
        subscription_message = await websocket.recv()
        message_data = json.loads(subscription_message)

        if message_data.get("type") == "subscribe" and "agent_id" in message_data:
            agent_id_to_subscribe = message_data["agent_id"]
            await register_client(websocket, agent_id_to_subscribe)
            await websocket.send(json.dumps({"status": "subscribed", "agent_id": agent_id_to_subscribe}))
            
            while True:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=60.0) 
                    logger.info(f"Received message from {agent_id_to_subscribe}: {message}")
                    # Future: Handle user input messages to agent via AG-UI
                except asyncio.TimeoutError:
                    # Send a ping to keep the connection alive if no message received
                    await websocket.ping()
                except ConnectionClosed:
                    logger.info(f"Connection closed by client {agent_id_to_subscribe}.")
                    break
        else:
            logger.warning(f"Invalid subscription message from {websocket.remote_address}: {subscription_message}")
            await websocket.close(reason="Invalid subscription message")
    
    except ConnectionClosed as e:
        logger.info(f"Client {websocket.remote_address} disconnected: {e.code} {e.reason}")
    except Exception as e:
        logger.error(f"Error during WebSocket connection with {websocket.remote_address}: {e}", exc_info=True)
    finally:
        await unregister_client(websocket)
        logger.info(f"Cleaned up client {websocket.remote_address}")

async def broadcast_event_to_agent_subscribers(agent_id: str, event_message: dict):
    # This function will be called by other services (e.g., StrategyExecutor)
    # to send AG-UI events to relevant subscribed frontend clients.
    # The event_message should be a dictionary that can be JSON serialized.
    if agent_id in agent_subscriptions:
        message_json = json.dumps(event_message) 
        
        # Create a list of tasks for sending messages
        tasks = []
        # Create a list of clients that failed to send for potential removal
        failed_clients = []

        for client in agent_subscriptions[agent_id]:
            try:
                # Check if client connection is open before attempting to send
                if client.open:
                    tasks.append(client.send(message_json))
                else:
                    logger.warning(f"Client {client.remote_address} for agent {agent_id} is not open. Marking for removal.")
                    failed_clients.append(client)
            except websockets.exceptions.ConnectionClosed:
                logger.warning(f"Client {client.remote_address} for agent {agent_id} connection closed during send attempt. Marking for removal.")
                failed_clients.append(client)
            except Exception as e:
                logger.error(f"Unexpected error sending to client {client.remote_address} for agent {agent_id}: {e}")
                failed_clients.append(client)


        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    # This client identification is simplified; direct mapping would be better if set order is not guaranteed
                    # For now, we can't directly map result index to client if some were skipped.
                    # The failed_clients list handles clients that couldn't even attempt a send.
                    logger.error(f"Failed to send event to a client for agent {agent_id}: {result}")
        
        # Clean up clients that failed or were closed before send
        for client in failed_clients:
            if client in agent_subscriptions.get(agent_id, set()): # Check if still subscribed
                 agent_subscriptions[agent_id].remove(client)
                 if client in client_to_agent_map:
                     del client_to_agent_map[client] # Remove from reverse map
                 logger.info(f"Removed failed/closed client {client.remote_address} from agent {agent_id} subscriptions.")
        
        if not agent_subscriptions.get(agent_id): # If set is empty after removal
            del agent_subscriptions[agent_id]
            logger.info(f"No more subscribers for agent {agent_id}, removed entry.")

        if tasks: # Only log if there were tasks attempted
             logger.info(f"Broadcasted event type '{event_message.get('type')}' to {len(tasks)} clients for agent {agent_id}")
        elif not agent_subscriptions.get(agent_id) and not failed_clients: # No clients were there to begin with
            logger.info(f"No active subscribers for agent {agent_id} to broadcast event type '{event_message.get('type')}'")


# This 'main_server_runner' is a placeholder for how the server might be started.
# The actual startup will depend on how python-ai-services are deployed/managed.
# For now, worker just needs to define the functions above.
async def main_server_runner(host="0.0.0.0", port=8765):
    global SERVER_EVENT_LOOP
    SERVER_EVENT_LOOP = asyncio.get_running_loop() # Get current running loop
    logger.info(f"WebSocket server on {host}:{port}. Event loop set.")
    
    # Start the queue processor
    asyncio.create_task(process_broadcast_queue())

    async with websockets.serve(handle_websocket_connection, host, port):
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    # This allows running this file directly to start the WebSocket server.
    # In a real deployment, this might be managed by a process manager or integrated into a larger app.
    asyncio.run(main_server_runner())
