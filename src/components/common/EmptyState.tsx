import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border-2 border-dashed border-[#EBE5DF] rounded-3xl bg-white/50 ${className}`}>
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-[#FDF2F0] text-[#E8A598] flex items-center justify-center mb-4 shadow-xs">
          {icon}
        </div>
      )}
      <h4 className="text-base sm:text-lg font-bold text-[#2B2D42] mb-1.5">{title}</h4>
      <p className="text-xs sm:text-sm text-[#5A6275] max-w-md mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} icon={actionIcon} variant="primary" size="md">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
