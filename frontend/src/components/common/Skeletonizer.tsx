import React from 'react';
import { Skeleton } from '../ui/skeleton';
import { Card } from '../ui/card';

export interface SkeletonizerProps {
  type?: 'discovery' | 'services' | 'ticket' | 'operations' | 'dashboard' | 'analytics' | 'table' | 'form';
  count?: number;
  className?: string;
}

export const Skeletonizer: React.FC<SkeletonizerProps> = ({
  type = 'discovery',
  count = 3,
  className = ''
}) => {
  if (type === 'discovery') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-md" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'services') {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="p-5 flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-72" />
            </div>
            <div className="flex items-center gap-4">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (type === 'ticket') {
    return (
      <div className={`max-w-md mx-auto space-y-6 ${className}`}>
        <Card className="p-8 text-center space-y-6">
          <Skeleton className="h-4 w-28 mx-auto rounded-full" />
          <Skeleton className="h-20 w-44 mx-auto rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 mx-auto rounded-full" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#efeee8]">
            <Skeleton className="h-14 rounded-md" />
            <Skeleton className="h-14 rounded-md" />
          </div>
        </Card>
      </div>
    );
  }

  if (type === 'dashboard' || type === 'analytics') {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-6 rounded-md" />
              </div>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-32" />
            </Card>
          ))}
        </div>
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
          <Skeleton className="h-64 w-full rounded-lg" />
        </Card>
      </div>
    );
  }

  if (type === 'operations') {
    return (
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${className}`}>
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 space-y-4">
            <Skeleton className="h-6 w-32" />
            <div className="h-48 border border-[#e6e5e0] rounded-lg p-6 flex flex-col justify-between">
              <Skeleton className="h-16 w-36 mx-auto rounded-md" />
              <div className="flex justify-center gap-3">
                <Skeleton className="h-10 w-28 rounded-md" />
                <Skeleton className="h-10 w-28 rounded-md" />
              </div>
            </div>
          </Card>
        </div>
        <Card className="p-6 space-y-4">
          <Skeleton className="h-5 w-28" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-[#efeee8]">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </Card>
      </div>
    );
  }

  // Generic table or form
  return (
    <Card className={`p-6 space-y-4 ${className}`}>
      <Skeleton className="h-6 w-1/3" />
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </Card>
  );
};
