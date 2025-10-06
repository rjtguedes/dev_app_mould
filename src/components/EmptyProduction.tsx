import React from 'react';
import { Package, PlusCircle } from 'lucide-react';

interface EmptyProductionProps {
  onStartNewProduction: () => void;
}

export function EmptyProduction({ onStartNewProduction }: EmptyProductionProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-blue-200">
      <Package className="w-12 h-12 mb-4 opacity-50" />
      <p className="text-lg">Nenhuma produção em andamento</p>
      <button
        onClick={onStartNewProduction}
        className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg
                 transition-colors duration-200 flex items-center gap-2"
      >
        <PlusCircle className="w-4 h-4" />
        Iniciar Nova Produção
      </button>
    </div>
  );
}