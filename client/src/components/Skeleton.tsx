'use client';

import { cn } from '@/lib/utils';

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card animate-pulse', className)}>
      <div className="skeleton h-48 w-full mb-4" />
      <div className="skeleton h-4 w-3/4 mb-2" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  );
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn('glass-card animate-pulse', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="skeleton h-4 w-24 mb-3" />
          <div className="skeleton h-8 w-20" />
        </div>
        <div className="skeleton h-12 w-12 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 p-4 glass-card animate-pulse', className)}>
      <div className="skeleton h-16 w-24 rounded-lg" />
      <div className="flex-1">
        <div className="skeleton h-4 w-48 mb-2" />
        <div className="skeleton h-3 w-32" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
