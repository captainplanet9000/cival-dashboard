import React from "react";
type ReactNode = React.ReactNode;

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 bg-muted/20 rounded-lg border border-dashed border-muted">
      <div className="rounded-full bg-muted p-3 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-center max-w-sm mt-1.5 mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
