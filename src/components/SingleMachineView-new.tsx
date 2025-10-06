import React, { useState } from 'react';
import { Clock, Trash2, AlertCircle, Info, CheckCircle2, Play, Pause } from 'lucide-react';
import type { MachineDataNew } from '../types/websocket-new';
import { ProductionContextDisplay } from './ProductionContextDisplay';

interface SingleMachineViewNewProps {
  machineData: MachineDataNew | null;
  onAddReject: (gradeId: number) => Promise<void>;
  onAddRejeito?: () => Promise<void>;
  statusParada?: boolean;
}

export function SingleMachineViewNew({ 
  machineData, 
  onAddReject, 
  onAddRejeito, 
  statusParada = false 
}: SingleMachineViewNewProps) {
  const [confirming, setConfirming] = useState<boolean>(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  console.log('[SingleMachineViewNew] Machine data:', machineData);

  if (!machineData) {
    return (
      <div className="overflow-x-auto bg-black/20 rounded-xl border border-white/30 shadow-xl backdrop-blur-sm">
        <div className="p-8 text-center">
          <Info className="w-12 h-12 text-white/70 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white">Sem dados de máquina</p>
          <p className="text-sm text-white/80">Aguardando dados do WebSocket</p>
        </div>
      </div>
    );
  }

  const { 
    id, 
    nome, 
    multipostos, 
    velocidade, 
    status, 
    sessao_operador, 
    producao_mapa,
    turnos 
  } = machineData;

  const isActive = status; // true = EM PRODUÇÃO, false = PARADA
  const hasSession = !!sessao_operador;
  const hasProductionMap = !!producao_mapa;

  // Função para adicionar rejeito via WebSocket
  const handleAddRejeito = async () => {
    if (onAddRejeito) {
      try {
        await onAddRejeito();
        setConfirming(true);
        setConfirmMessage('Rejeito adicionado com sucesso!');
        setTimeout(() => {
          setConfirming(false);
          setConfirmMessage(null);
        }, 1800);
      } catch (error) {
        console.error('Erro ao adicionar rejeito:', error);
        alert('Erro ao adicionar rejeito. Tente novamente.');
      }
    }
  };

  return (
    <div className="overflow-x-auto bg-black/20 rounded-xl border border-white/30 shadow-xl backdrop-blur-sm">
      <div className="p-6">
        {/* Cabeçalho */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-2xl font-bold text-white drop-shadow-sm">Estação de Produção</h3>
            <div className="flex items-center gap-2">
              {isActive ? (
                <div className="flex items-center gap-1 text-green-400">
                  <Play className="w-4 h-4" />
                  <span className="text-sm font-medium">EM PRODUÇÃO</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-400">
                  <Pause className="w-4 h-4" />
                  <span className="text-sm font-medium">PARADA</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-white/90 font-medium">Máquina: {nome}</p>
          <p className="text-white/70 text-sm">ID: {id} | Velocidade: {velocidade}%</p>
        </div>

        {/* Informações dos Contextos */}
        <div className="space-y-4 mb-6">
          {/* Produção Mapa */}
          <ProductionContextDisplay 
            type="production_map" 
            data={producao_mapa} 
            machineName={nome}
          />

          {/* Sessão Operador */}
          <ProductionContextDisplay 
            type="session" 
            data={sessao_operador} 
            machineName={nome}
          />
        </div>

        {/* Informações do Turno */}
        <div className="bg-white/5 rounded-lg border border-white/10 p-4 mb-6">
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Informações do Turno
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-white/70">Turno Atual:</span>
              <p className="text-white font-medium">{turnos.current || 'Não definido'}</p>
            </div>
            <div>
              <span className="text-sm text-white/70">Próximo Turno:</span>
              <p className="text-white font-medium">{turnos.next || 'Não definido'}</p>
            </div>
          </div>
        </div>

        {/* Botão de Adicionar Rejeito */}
        <div className="flex justify-center">
          <button
            onClick={handleAddRejeito}
            disabled={!onAddRejeito || !isActive}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200
              ${!onAddRejeito || !isActive
                ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg hover:shadow-red-500/25'
              }
            `}
          >
            <Trash2 className="w-5 h-5" />
            Adicionar Rejeito
          </button>
        </div>

        {/* Confirmação de rejeito */}
        {confirming && confirmMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-800">Sucesso!</h3>
              </div>
              <p className="text-gray-600 mb-4">{confirmMessage}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setConfirming(false);
                    setConfirmMessage(null);
                  }}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aviso se não há dados ativos */}
        {!hasSession && !hasProductionMap && (
          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <p className="text-yellow-400 text-sm">
                Nenhuma sessão ou ordem de produção ativa. Aguardando configuração.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}