'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { IconType } from 'react-icons';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: IconType;
  trend?: { value: number; isPositive: boolean };
  gradient?: string;
  className?: string;
}

export default function StatCard({ title, value, icon: Icon, trend, gradient, className }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn('glass-card group', className)}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {trend && (
            <p className={cn(
              'text-xs mt-2 font-medium',
              trend.isPositive ? 'text-emerald-400' : 'text-red-400'
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </p>
          )}
        </div>
        <div
          className={cn(
            'p-3 rounded-xl transition-all duration-300',
            gradient || 'bg-primary-500/20'
          )}
        >
          <Icon className="w-6 h-6 text-primary-400" />
        </div>
      </div>
    </motion.div>
  );
}
