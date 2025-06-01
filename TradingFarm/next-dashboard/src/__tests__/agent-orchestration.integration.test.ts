// INTEGRATION TESTS & DOCS FOR AGENT ORCHESTRATION
// This file contains integration tests for assignment, event, and alert flows, as well as onboarding documentation for new agents and orchestration features.

// --- INTEGRATION TESTS (Jest + React Testing Library) ---

import { renderHook, act } from '@testing-library/react-hooks';
import { useAgentAssignments, useCreateAgentAssignment, useDeleteAgentAssignment, useAgentEvents, useAgentAnomalyAlerts, useResolveAgentAnomalyAlert } from '@/hooks/useAgentOrchestration';

describe('Agent Orchestration Hooks', () => {
  it('should create and delete an agent assignment', async () => {
    const { result, waitFor } = renderHook(() => useCreateAgentAssignment());
    let assignmentId: string | undefined = undefined;
    await act(async () => {
      const assignment = await result.current.mutateAsync({
        farm_id: 1,
        agent_id: 1,
        allocation_percentage: 50,
        is_primary: true,
        instructions: 'Test assignment',
      });
      assignmentId = assignment.id;
      expect(assignment.agent_id).toBe(1);
    });
    // Delete assignment
    const { result: delResult } = renderHook(() => useDeleteAgentAssignment());
    await act(async () => {
      await delResult.current.mutateAsync(assignmentId!);
    });
  });

  it('should fetch agent events', async () => {
    const { result, waitFor } = renderHook(() => useAgentEvents('1'));
    await waitFor(() => result.current.data !== undefined);
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('should fetch and resolve anomaly alerts', async () => {
    const { result, waitFor } = renderHook(() => useAgentAnomalyAlerts('1'));
    await waitFor(() => result.current.data !== undefined);
    if (result.current.data.length > 0) {
      const { result: resolveResult } = renderHook(() => useResolveAgentAnomalyAlert());
      await act(async () => {
        await resolveResult.current.mutateAsync(result.current.data[0].id);
      });
    }
  });
});

// --- ONBOARDING & ORCHESTRATION DOCS ---
/**
 * # Agent Orchestration Onboarding Guide
 *
 * ## Assigning Agents
 * - Use the Agent Assignment Form to assign agents to farms or goals.
 * - Specify allocation %, primary/secondary, and any special instructions.
 * - All assignments are persisted and can be updated/deleted in real time.
 *
 * ## Command Console
 * - Use the ElizaOS Command Console to send real-time commands to agents.
 * - All commands and responses are logged in the agent events history.
 *
 * ## Monitoring & Alerts
 * - The Agent Monitoring Dashboard displays live health, logs, and performance for each agent.
 * - Anomaly alerts are shown in real time and can be resolved directly from the dashboard.
 *
 * ## Integration Points
 * - All orchestration features are powered by the hooks in `useAgentOrchestration.ts`.
 * - Use these hooks for CRUD, event feeds, and alert notifications in your UI.
 *
 * ## Best Practices
 * - Always use the provided hooks for type safety and real-time updates.
 * - Test all flows in a staging environment before production.
 * - For advanced workflows, extend the hooks or add new dashboard widgets as needed.
 */
