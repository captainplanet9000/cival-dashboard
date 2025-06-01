'use client';

import { Badge, BadgeProps } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle, CircleDashed } from 'lucide-react';
import { GoalStatus } from '@/types/goals';

interface GoalStatusDisplayProps {
  status: GoalStatus;
  className?: string;
  showIcon?: boolean;
  variant?: BadgeProps['variant'];
  size?: 'sm' | 'md' | 'lg';
}

export default function GoalStatusDisplay({ 
  status, 
  className = '', 
  showIcon = true,
  variant,
  size = 'md'
}: GoalStatusDisplayProps) {
  // Determine badge variant based on status
  const getVariant = (): BadgeProps['variant'] => {
    if (variant) return variant;
    
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'default';
      case 'not_started':
        return 'secondary';
      case 'missed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Get appropriate icon based on status
  const getIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="mr-1 h-3 w-3" />;
      case 'in_progress':
        return <Clock className="mr-1 h-3 w-3" />;
      case 'not_started':
        return <CircleDashed className="mr-1 h-3 w-3" />;
      case 'missed':
        return <AlertCircle className="mr-1 h-3 w-3" />;
      default:
        return null;
    }
  };

  // Format status for display
  const getDisplayText = () => {
    switch (status) {
      case 'not_started':
        return 'Not Started';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'missed':
        return 'Missed';
      default:
        return status.replace(/_/g, ' ');
    }
  };

  // Set size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs py-0 px-1.5';
      case 'lg':
        return 'text-sm py-1 px-3';
      case 'md':
      default:
        return '';
    }
  };

  return (
    <Badge
      variant={getVariant()}
      className={`flex items-center ${getSizeClasses()} ${className}`}
    >
      {showIcon && getIcon()}
      {getDisplayText()}
    </Badge>
  );
} 