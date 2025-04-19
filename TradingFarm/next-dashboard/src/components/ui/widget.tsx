import React from "react";
import { Card, CardContent } from "./card";

export interface WidgetProps {
  title: React.ReactNode;
  width?: "full" | "medium" | "small";
  height?: "small" | "medium" | "large";
  children: React.ReactNode;
  className?: string;
}

export const Widget: React.FC<WidgetProps> = ({
  title,
  width = "full",
  height = "medium",
  children,
  className = "",
}) => {
  // Responsive sizing logic
  const widthClass =
    width === "full"
      ? "w-full"
      : width === "medium"
      ? "md:w-1/2"
      : "md:w-1/3";
  const heightClass =
    height === "large"
      ? "h-96"
      : height === "medium"
      ? "h-64"
      : "h-48";

  return (
    <Card className={`${widthClass} ${heightClass} ${className}`}>
      <CardContent className="p-4 flex flex-col h-full">
        <div className="font-semibold text-lg mb-2">{title}</div>
        <div className="flex-1">{children}</div>
      </CardContent>
    </Card>
  );
};
