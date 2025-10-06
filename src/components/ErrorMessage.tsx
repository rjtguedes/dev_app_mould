import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-white m-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="w-5 h-5" />
        <h2 className="font-semibold">Erro</h2>
      </div>
      <p>{message}</p>
    </div>
  );
} 