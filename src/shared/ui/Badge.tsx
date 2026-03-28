import React from 'react';
import { cn } from '../lib/utils/cn';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
}

export const Badge = ({ className, variant = 'neutral', children, ...props }: BadgeProps) => {
  const variants = {
    success: 'text-emerald-500 bg-emerald-50 border-emerald-200',
    warning: 'text-amber-500 bg-amber-50 border-amber-200',
    error: 'text-red-500 bg-red-50 border-red-200',
    info: 'text-indigo-500 bg-indigo-50 border-indigo-200',
    neutral: 'text-slate-500 bg-slate-50 border-slate-200',
  };

  return (
    <div
      className={cn(
        'px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
