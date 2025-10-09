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
    turnos,
    parada_ativa 
  } = machineData;

  // ✅ NOVA LÓGICA: máquina está parada se parada_ativa não for null
  const isStopped = parada_ativa !== null && parada_ativa !== undefined;
  const isActive = !isStopped; // true = EM PRODUÇÃO, false = PARADA
  const hasSession = !!sessao_operador;
  const hasProductionMap = !!producao_mapa;
  
  console.log('[SingleMachineViewNew] Status - parada_ativa:', parada_ativa, 'isStopped:', isStopped, 'isActive:', isActive);

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
        {/* Cabeçalho - Industrial */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-4xl font-black text-white drop-shadow-sm">Estação de Produção</h3>
            <div className="flex items-center gap-3">
              {isActive ? (
                <div className="flex items-center gap-2 text-green-400">
                  <Play className="w-6 h-6" />
                  <span className="text-lg font-black">EM PRODUÇÃO</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400">
                  <Pause className="w-6 h-6" />
                  <span className="text-lg font-black">PARADA</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-2xl font-bold text-white/90">Máquina: {nome}</p>
            <p className="text-xl font-bold text-white/80">ID: {id} | Velocidade: {velocidade} pcs/h</p>
          </div>
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

        {/* Informações do Turno removidas por solicitação */}

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