// ⚙️ Modal de Configuração de Layout de Tela

import React from 'react';
import { X, Monitor, Grid3x3 } from 'lucide-react';
import type { LayoutType } from '../types/layout';

interface LayoutConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: LayoutType;
  machineName: string;
  onSelectLayout: (layoutType: LayoutType) => void;
}

// ✅ Memoizar modal para evitar re-renders desnecessários
export const LayoutConfigModal = React.memo(function LayoutConfigModal({
  isOpen,
  onClose,
  currentLayout,
  machineName,
  onSelectLayout
}: LayoutConfigModalProps) {
  
  if (!isOpen) return null;
  
  const layouts = [
    {
      type: 'default' as LayoutType,
      name: 'Padrão (Cards)',
      description: 'Layout padrão com cards individuais para cada estação',
      icon: Grid3x3,
      recommended: !machineName.toLowerCase().includes('eva')
    },
    {
      type: 'eva_16_stations' as LayoutType,
      name: 'EVA 16 Estações',
      description: 'Layout otimizado para EVA com 2 colunas (ESQUERDA/DIREITA) e 8 postos cada',
      icon: Monitor,
      recommended: machineName.toLowerCase().includes('eva')
    }
  ];
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-blue-400/30">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-400/30">
          <div>
            <h2 className="text-2xl font-bold text-white">Configuração de Tela</h2>
            <p className="text-blue-300 text-sm mt-1">
              Selecione o layout de visualização para {machineName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-700/50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-blue-300" />
          </button>
        </div>
        
        {/* Opções de Layout */}
        <div className="p-6 space-y-4">
          {layouts.map(layout => {
            const Icon = layout.icon;
            const isSelected = currentLayout === layout.type;
            
            return (
              <button
                key={layout.type}
                onClick={() => onSelectLayout(layout.type)}
                className={`
                  w-full p-6 rounded-xl border-2 transition-all
                  ${isSelected 
                    ? 'border-blue-400 bg-blue-700/40 shadow-lg shadow-blue-500/20' 
                    : 'border-blue-400/30 bg-blue-800/20 hover:bg-blue-700/30 hover:border-blue-400/50'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    p-3 rounded-lg
                    ${isSelected ? 'bg-blue-500/30' : 'bg-blue-700/30'}
                  `}>
                    <Icon className={`w-8 h-8 ${isSelected ? 'text-blue-300' : 'text-blue-400'}`} />
                  </div>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-white">
                        {layout.name}
                      </h3>
                      {layout.recommended && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                          Recomendado
                        </span>
                      )}
                      {isSelected && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded">
                          Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-blue-300 text-sm">
                      {layout.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-blue-400/30 bg-blue-900/40">
          <div className="flex items-center justify-between">
            <p className="text-blue-300 text-sm">
              💾 A configuração será salva automaticamente
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}); // ✅ Fechar React.memo

