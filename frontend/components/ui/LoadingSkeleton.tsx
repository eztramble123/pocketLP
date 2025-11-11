'use client';

import { cn } from '../../lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'rectangle' | 'circle' | 'text';
  width?: string;
  height?: string;
}

export default function LoadingSkeleton({ 
  className, 
  variant = 'rectangle',
  width = 'w-full',
  height = 'h-4'
}: LoadingSkeletonProps) {
  const baseClasses = "shimmer bg-neutral-200 animate-pulse";
  
  const variantClasses = {
    rectangle: 'rounded-md',
    circle: 'rounded-full aspect-square',
    text: 'rounded h-4'
  };

  return (
    <div 
      className={cn(
        baseClasses, 
        variantClasses[variant],
        width,
        height,
        className
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card-premium p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <LoadingSkeleton variant="text" width="w-24" />
          <LoadingSkeleton variant="text" width="w-16" height="h-8" />
        </div>
        <LoadingSkeleton variant="circle" width="w-8" height="h-8" />
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="card-premium p-6 space-y-4">
      <LoadingSkeleton variant="text" width="w-32" height="h-6" />
      <LoadingSkeleton variant="rectangle" width="w-full" height="h-64" />
    </div>
  );
}

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-b-0">
          <div className="space-y-2">
            <LoadingSkeleton variant="text" width="w-24" />
            <LoadingSkeleton variant="text" width="w-16" height="h-3" />
          </div>
          <div className="space-y-1 text-right">
            <LoadingSkeleton variant="text" width="w-16" />
            <LoadingSkeleton variant="text" width="w-12" height="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}