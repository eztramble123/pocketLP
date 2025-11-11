'use client';

import { cn } from '../../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={cn("animate-spin", sizeClasses[size], className)}>
      <div className="w-full h-full border-2 border-primary-200 border-t-primary-600 rounded-full"></div>
    </div>
  );
}