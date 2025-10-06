import React from 'react';
import { X } from 'lucide-react';

interface NumPadProps {
  onNumberClick: (number: string) => void;
  onDelete: () => void;
  className?: string;
  disabled?: boolean;
}

export const NumPad: React.FC<NumPadProps> = ({ onNumberClick, onDelete, className = '', disabled = false }) => {
  const numbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  const buttonSize = 'w-16 h-16';

  return (
    <div className={`grid grid-cols-3 gap-6 w-full max-w-xs ${className}`}>
      {numbers.map((num, index) => (
        <button
          key={index}
          onClick={() => num === 'del' ? onDelete() : num && onNumberClick(num)}
          className={`
            ${buttonSize} rounded-full text-2xl font-semibold
            ${num === 'del' 
              ? 'bg-gradient-to-br from-red-500/80 to-red-600/80 hover:from-red-600/80 hover:to-red-700/80 text-white ring-red-400/30' 
              : 'bg-gradient-to-br from-white/20 to-white/10 hover:from-white/30 hover:to-white/20 text-white ring-white/30'
            }
            transition-all duration-200
            flex items-center justify-center
            ${!num && 'cursor-default'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            hover:scale-105 active:scale-95
            backdrop-blur-sm
            ring-1 hover:ring-2
            shadow-[0_8px_16px_rgba(0,0,0,0.1)]
            hover:shadow-[0_12px_24px_rgba(0,0,0,0.2)]
          `}
          disabled={!num || disabled}
        >
          {num === 'del' ? <X className="w-6 h-6" /> : num}
        </button>
      ))}
    </div>
  );
};