import React, { useState } from 'react';
import { Clock, Trash2, AlertCircle, Info, CheckCircle2, Play, Pause, TrendingUp } from 'lucide-react';
import type { MachineDataNew } from '../types/websocket-new';
import { ProductionContextDisplay } from './ProductionContextDisplay';

interface SingleMachineCardNewProps {
  machineData: MachineDataNew | null;
  onAddReject: (gradeId: number) => Promise<void>;
  onAddRejeito?: () => Promise<void>;
  statusParada?: boolean;
}

export function SingleMachineCardNew({ 
  machineData, 
  onAddReject, 
  onAddRejeito, 
  statusParada = false 
}: SingleMachineCardNewProps) {
  const [confirming, setConfirming] = useState<boolean>(false);

  console.log('[SingleMachineCardNew] Machine data:', machineData);

  if (!machineData) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 min-h-[400px] flex flex-col items-center justify-center">
        <Info className="w-12 h-12 text-white/40 mb-4" />
        <h4 className="text-lg font-bold text-white mb-2">Sem dados de máquina</h4>
        <p className="text-sm text-white/60">Aguardando dados do WebSocket</p>
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
  
  console.log('[SingleMachineCardNew] Status - parada_ativa:', parada_ativa, 'isStopped:', isStopped, 'isActive:', isActive);

  // Função para adicionar rejeito via WebSocket
  const handleAddRejeito = async () => {
    if (onAddRejeito) {
      try {
        await onAddRejeito();
        setConfirming(true);
        setTimeout(() => {
          setConfirming(false);
        }, 1800);
      } catch (error) {
        console.error('Erro ao adicionar rejeito:', error);
        alert('Erro ao adicionar rejeito. Tente novamente.');
      }
    }
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 min-h-[400px]">
      {/* Header compacto */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-bold text-white mb-1">{nome}</h4>
          <p className="text-sm text-white/70">ID: {id}</p>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <div className="flex items-center gap-1 text-green-400">
              <Play className="w-4 h-4" />
              <span className="text-xs font-medium">ATIVA</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-400">
              <Pause className="w-4 h-4" />
              <span className="text-xs font-medium">PARADA</span>
            </div>
          )}
        </div>
      </div>

      {/* Velocidade */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/70">Velocidade</span>
          <span className="text-sm font-semibold text-white">{velocidade}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-400 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${velocidade}%` }}
          />
        </div>
      </div>

      {/* Informações dos Contextos - Versão compacta */}
      <div className="space-y-3 mb-4">
        {/* Produção Mapa - Compacto */}
        {hasProductionMap && (
          <div className="bg-white/5 rounded-lg border border-green-400/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-green-400">Produção Mapa</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-white/70 mb-1">Válidos</div>
                <div className="text-sm font-bold text-green-400">{producao_mapa.sinais_validos}</div>
              </div>
              <div>
                <div className="text-xs text-white/70 mb-1">Rejeitos</div>
                <div className="text-sm font-bold text-red-400">{producao_mapa.rejeitos}</div>
              </div>
              <div>
                <div className="text-xs text-white/70 mb-1">Saldo</div>
                <div className="text-sm font-bold text-orange-400">{producao_mapa.saldo_a_produzir}</div>
              </div>
            </div>
            
            {producao_mapa.qt_produzir && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/70">Progresso</span>
                  <span className="text-xs text-white/70">
                    {Math.round((producao_mapa.sinais_validos / producao_mapa.qt_produzir) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-500 h-1 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, (producao_mapa.sinais_validos / producao_mapa.qt_produzir) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sessão Operador - Compacto */}
        {hasSession && (
          <div className="bg-white/5 rounded-lg border border-blue-400/20 p-3">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-blue-400">Sessão Operador</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-white/70 mb-1">Válidos</div>
                <div className="text-sm font-bold text-green-400">{sessao_operador.sinais_validos}</div>
              </div>
              <div>
                <div className="text-xs text-white/70 mb-1">Rejeitos</div>
                <div className="text-sm font-bold text-red-400">{sessao_operador.rejeitos}</div>
              </div>
              <div>
                <div className="text-xs text-white/70 mb-1">Total</div>
                <div className="text-sm font-bold text-blue-400">{sessao_operador.sinais}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Turno atual */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-white/70" />
          <span className="text-sm text-white/70">Turno:</span>
          <span className="text-sm font-semibold text-white">{turnos.current || 'Não definido'}</span>
        </div>
      </div>

      {/* Botão de adicionar rejeito */}
      <div className="flex justify-center">
        <button
          onClick={handleAddRejeito}
          disabled={!onAddRejeito || !isActive}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
            ${!onAddRejeito || !isActive
              ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white hover:shadow-lg hover:shadow-red-500/25'
            }
          `}
        >
          <Trash2 className="w-4 h-4" />
          Rejeito
        </button>
      </div>

      {/* Confirmação de rejeito */}
      {confirming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 max-w-xs mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <h3 className="font-semibold text-gray-800">Rejeito adicionado!</h3>
            </div>
          </div>
        </div>
      )}

      {/* Aviso se não há dados ativos */}
      {!hasSession && !hasProductionMap && (
        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400" />
            <p className="text-yellow-400 text-xs">
              Aguardando sessão ou ordem de produção
            </p>
          </div>
        </div>
      )}
    </div>
  );
}