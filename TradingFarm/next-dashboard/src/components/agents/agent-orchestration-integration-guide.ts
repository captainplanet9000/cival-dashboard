// AGENT ORCHESTRATION HOOKS INTEGRATION - PHASE 4
// This update integrates new real-time hooks for assignments, events, and alerts into the main agent orchestration UI components.

// 1. AgentAssignmentForm: useAgentAssignments, useCreateAgentAssignment
// 2. ElizaCommandConsole: persist commands/events to agent_events
// 3. AgentMonitoringDashboard: useAgentEvents, useAgentAnomalyAlerts
// 4. ElizaAgentLogs: (future) can be adapted to use agent_events for log display

// --- 1. AgentAssignmentForm Integration ---
import { useCreateAgentAssignment } from '@/hooks/useAgentOrchestration';

// ...inside AgentAssignmentForm component:
// Replace enhancedFarmService.assignAgentToFarm/Goal with useCreateAgentAssignment
// (see below for integration snippet)

// --- 2. ElizaCommandConsole Integration ---
import { useAgentEvents } from '@/hooks/useAgentOrchestration';

// ...inside ElizaCommandConsole component:
// On command send, persist to agent_events table (via supabase)
// On receiving response, also persist to agent_events
// Use useAgentEvents(agentId) to display full command/event history

// --- 3. AgentMonitoringDashboard Integration ---
import { useAgentEvents, useAgentAnomalyAlerts } from '@/hooks/useAgentOrchestration';

// ...inside AgentMonitoringDashboard component:
// Use useAgentEvents(agentId) for event feed
// Use useAgentAnomalyAlerts(agentId) for real-time alert feed
// Subscribe to these hooks for live dashboard updates

// --- 4. ElizaAgentLogs (future) ---
// Can be adapted to use agent_events for unified log/event display

// --- Integration Example for AgentAssignmentForm ---
// import { useCreateAgentAssignment } from '@/hooks/useAgentOrchestration';
// const createAssignment = useCreateAgentAssignment();
//
// const onSubmit = async (values) => {
//   setIsPending(true);
//   setError(undefined);
//   setSuccess(undefined);
//   try {
//     await createAssignment.mutateAsync({
//       farm_id: values.farm_id,
//       goal_id: values.goal_id,
//       agent_id: values.agent_id,
//       allocation_percentage: values.allocation_percentage,
//       is_primary: values.is_primary,
//       instructions: values.instructions,
//     });
//     setSuccess('Agent assigned successfully!');
//     // ...redirect or refresh logic
//   } catch (err) {
//     setError(err.message);
//   } finally {
//     setIsPending(false);
//   }
// };

// --- Integration Example for ElizaCommandConsole ---
// import { useAgentEvents } from '@/hooks/useAgentOrchestration';
// const { data: events } = useAgentEvents(agentId);
// // Use events to display command/event history
// // On command send/response, insert new event into agent_events table

// --- Integration Example for AgentMonitoringDashboard ---
// import { useAgentEvents, useAgentAnomalyAlerts } from '@/hooks/useAgentOrchestration';
// const { data: events } = useAgentEvents(agentId);
// const { data: alerts } = useAgentAnomalyAlerts(agentId);
// // Use these for dashboard widgets, notifications, and live updates

// --- End Integration Guide ---
