import React from 'react';

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="p-4 text-white/60 text-center">
      {message}
    </div>
  );
} 