import React from 'react';
import { User as UserIcon, Gauge, RefreshCcw, Monitor } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { Machine } from '../types/machine';

interface DashboardHeaderProps {
  machine: Machine;
  realtimeMachine: Machine | null;
  user: User | null;
  currentShift: { descricao: string } | null;
  shiftError: string | null;
  sidebarCollapsed: boolean;
  velocidade: number;
  statusParada: boolean;
  onRefresh?: () => void;
  // Novos props para contextos
  contextoAtivo?: 'sessao' | 'turno' | 'taloes';
  onContextoChange?: (contexto: 'sessao' | 'turno' | 'taloes') => void;
  showContextButtons?: boolean;
  // Novo: Configuração de layout
  onOpenLayoutConfig?: () => void;
  showLayoutButton?: boolean;
}

export function DashboardHeader({
  machine,
  realtimeMachine,
  user,
  currentShift,
  shiftError,
  sidebarCollapsed,
  velocidade,
  statusParada,
  onRefresh,
  contextoAtivo = 'sessao',
  onContextoChange,
  showContextButtons = false,
  onOpenLayoutConfig,
  showLayoutButton = false
}: DashboardHeaderProps) {
  return (
    <nav className={`
      fixed top-0 right-0 h-16 bg-black/30 backdrop-blur-md border-b border-white/10 z-30
      transition-all duration-300
      ${sidebarCollapsed ? 'left-16' : 'left-64'}
    `}>
      <div className="h-full px-6 flex items-center justify-between">
        {/* Botões de Contexto (lado esquerdo) */}
        {showContextButtons && onContextoChange ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onContextoChange('sessao')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg backdrop-blur-sm border transition-all duration-200 ${
                contextoAtivo === 'sessao' 
                  ? 'bg-green-600 border-green-400 text-white shadow-lg transform scale-105 ring-2 ring-green-400/50' 
                  : 'bg-green-600/30 hover:bg-green-600/50 border-green-500/30 text-green-200 hover:text-white'
              }`}
            >
              👤 Sessão
            </button>
            
            <button
              onClick={() => onContextoChange('turno')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg backdrop-blur-sm border transition-all duration-200 ${
                contextoAtivo === 'turno' 
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg transform scale-105 ring-2 ring-blue-400/50' 
                  : 'bg-blue-600/30 hover:bg-blue-600/50 border-blue-500/30 text-blue-200 hover:text-white'
              }`}
            >
              📊 Turno
            </button>
            
            <button
              onClick={() => onContextoChange('taloes')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg backdrop-blur-sm border transition-all duration-200 ${
                contextoAtivo === 'taloes' 
                  ? 'bg-purple-600 border-purple-400 text-white shadow-lg transform scale-105 ring-2 ring-purple-400/50' 
                  : 'bg-purple-600/30 hover:bg-purple-600/50 border-purple-500/30 text-purple-200 hover:text-white'
              }`}
            >
              📋 Talões
            </button>

            {/* Indicador de Destaque do Modo Ativo */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/50 rounded-lg border border-white/30 ml-3">
              <span className="text-xs text-white/80 font-medium">EXIBINDO:</span>
              <span className={`text-sm font-bold tracking-wide ${
                contextoAtivo === 'sessao' ? 'text-green-300' : 
                contextoAtivo === 'turno' ? 'text-blue-300' : 'text-purple-300'
              }`}>
                {contextoAtivo === 'sessao' ? '👤 SESSÃO OPERADOR' : 
                 contextoAtivo === 'turno' ? '📊 PRODUÇÃO TURNO' : '📋 PRODUÇÃO TALÕES'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Informações da Máquina e Usuário (lado direito) */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-lg font-bold text-white tracking-tight">{machine.nome}</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg border border-white/10">
              <Gauge className="w-4 h-4 text-blue-300" />
              <span className="text-base font-bold text-white">
                {velocidade} pçs/h
              </span>
            </div>
            {statusParada && (
              <div className="px-3 py-1 bg-red-600/80 rounded-lg border border-red-500/80 ml-2">
                <span className="text-base font-bold text-white">PARADA</span>
              </div>
            )}
            {showLayoutButton && onOpenLayoutConfig && (
              <button
                onClick={onOpenLayoutConfig}
                className="ml-2 p-2 rounded-full bg-blue-600/40 hover:bg-blue-600/60 border border-blue-400/40 transition-colors group"
                title="Configurar Layout de Tela"
              >
                <Monitor className="w-5 h-5 text-blue-200 group-hover:text-white" />
              </button>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="ml-2 p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                title="Atualizar dados"
              >
                <RefreshCcw className="w-5 h-5 text-blue-200" />
              </button>
            )}
          </div>
          {shiftError ? (
            <div className="px-3 py-1 bg-red-500/20 rounded-lg border border-red-500/30">
              <span className="text-base font-medium text-red-200">
                {shiftError}
              </span>
            </div>
          ) : currentShift && (
            <div className="px-3 py-1 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <span className="text-base font-medium text-blue-200">
                Turno: {currentShift.descricao}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 text-blue-200 border-l border-white/10 pl-4">
            <UserIcon className="w-4 h-4 text-blue-300" />
            <span>{user?.email}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}