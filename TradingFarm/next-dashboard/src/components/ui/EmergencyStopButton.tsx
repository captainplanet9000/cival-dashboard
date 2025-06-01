import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EmergencyStopButtonProps {
  agentId: string;
  onStopped?: () => void;
}

export default function EmergencyStopButton({ agentId, onStopped }: EmergencyStopButtonProps) {
  const queryClient = useQueryClient();
  const { mutate, isLoading } = useMutation({
    mutationFn: async () => {
      await fetch(`/api/agents/${agentId}/emergency-stop`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["agent", agentId]);
      onStopped?.();
    },
  });

  return (
    <Button variant="destructive" disabled={isLoading} onClick={() => mutate()}>
      {isLoading ? "Stopping..." : "Emergency Stop"}
    </Button>
  );
}
