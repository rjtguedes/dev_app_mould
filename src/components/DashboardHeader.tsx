import React from 'react';
import { User as UserIcon, Gauge, RefreshCcw } from 'lucide-react';
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
  onRefresh
}: DashboardHeaderProps) {
  return (
    <nav className={`
      fixed top-0 right-0 h-16 bg-black/30 backdrop-blur-md border-b border-white/10 z-30
      transition-all duration-300
      ${sidebarCollapsed ? 'left-16' : 'left-64'}
    `}>
      <div className="h-full px-6 flex items-center justify-between">
        <div className="flex-1" />
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