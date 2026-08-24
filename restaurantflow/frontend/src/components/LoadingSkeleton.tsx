import React from 'react';

export const LoadingSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass-card p-6 animate-pulse space-y-3 bg-slate-900/60 border-slate-800"
        >
          <div className="h-4 bg-slate-800 rounded-lg w-1/3"></div>
          <div className="h-3 bg-slate-800/60 rounded-lg w-2/3"></div>
          <div className="h-3 bg-slate-800/40 rounded-lg w-1/2"></div>
        </div>
      ))}
    </div>
  );
};
