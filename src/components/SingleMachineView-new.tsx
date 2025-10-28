import React, { useState } from 'react';
import { Trash2, AlertCircle, Info, CheckCircle2, Play, Pause, Target, TrendingUp, XCircle } from 'lucide-react';
import type { MachineDataNew } from '../types/websocket-new';

interface SingleMachineViewNewProps {
  machineData: MachineDataNew | null;
  onAddReject: (gradeId: number) => Promise<void>;
  onAddRejeito?: () => Promise<void>;
  statusParada?: boolean;
  onEncerrarParcial?: () => Promise<void>;
  onEncerrarTotal?: () => Promise<void>;
}

export function SingleMachineViewNew({ 
  machineData, 
  onAddReject, 
  onAddRejeito, 
  statusParada = false,
  onEncerrarParcial,
  onEncerrarTotal
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
          <p className="text-sm text-white/80">Aguardando dados do SSE</p>
        </div>
      </div>
    );
  }

  // Extrair dados do contexto (para máquinas simples, os dados vêm dentro de 'contexto')
  const contexto = machineData.contexto || machineData;
  
  const { 
    id, 
    nome, 
    velocidade, 
    status, 
    sessao_operador, 
    producao_mapa,
    parada_ativa 
  } = contexto;

  // ✅ NOVA LÓGICA: máquina está parada se parada_ativa não for null OU se status for false
  const isStopped = (parada_ativa !== null && parada_ativa !== undefined) || status === false;
  const isActive = !isStopped; // true = EM PRODUÇÃO, false = PARADA
  const hasSession = !!sessao_operador;
  
  console.log('[SingleMachineViewNew] Status - parada_ativa:', parada_ativa, 'status:', status, 'isStopped:', isStopped, 'isActive:', isActive);
  console.log('[SingleMachineViewNew] Sessão operador:', sessao_operador);

  // Calcular valores
  const sinaisValidos = sessao_operador?.sinais_validos || 0;
  const rejeitos = sessao_operador?.rejeitos || 0;
  const qtProduzir = producao_mapa?.qt_produzir || 0;
  const saldo = qtProduzir - sinaisValidos;
  const progresso = qtProduzir > 0 ? (sinaisValidos / qtProduzir) * 100 : 0;

  // Função para adicionar rejeito via API
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
      <div className="p-8">
        {/* Cabeçalho Industrial - Minimalista */}
        <div className="mb-8 flex items-center justify-between border-b border-white/20 pb-4">
          <div>
            <h3 className="text-3xl font-black text-white tracking-tight">{nome}</h3>
            <p className="text-white/60 text-sm mt-1">Estação #{id} | Velocidade: {velocidade} pcs/h</p>
          </div>
          <div className="flex items-center gap-3">
            {isActive ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border-2 border-green-500 rounded-lg">
                <Play className="w-5 h-5 text-green-400" />
                <span className="text-lg font-black text-green-400 tracking-wide">PRODUZINDO</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border-2 border-red-500 rounded-lg">
                <Pause className="w-5 h-5 text-red-400" />
                <span className="text-lg font-black text-red-400 tracking-wide">PARADA</span>
              </div>
            )}
          </div>
        </div>

        {/* Cards Principais - Layout Industrial */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Card 1: Meta de Produção */}
          <div className="bg-gradient-to-br from-blue-600/30 to-blue-800/30 border-2 border-blue-400/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/30 rounded-xl">
                <Target className="w-8 h-8 text-blue-300" />
              </div>
              <div>
                <p className="text-blue-200 text-sm font-medium uppercase tracking-wider">Meta</p>
                <p className="text-blue-100 text-xs opacity-70">Quantidade a Produzir</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-6xl font-black text-white tracking-tight">{qtProduzir.toLocaleString()}</p>
              <p className="text-blue-200 text-sm mt-2 uppercase tracking-wide">Peças</p>
            </div>
          </div>

          {/* Card 2: Produzido (Sinais Válidos) */}
          <div className="bg-gradient-to-br from-green-600/30 to-green-800/30 border-2 border-green-400/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-500/30 rounded-xl">
                <TrendingUp className="w-8 h-8 text-green-300" />
              </div>
              <div>
                <p className="text-green-200 text-sm font-medium uppercase tracking-wider">Produzido</p>
                <p className="text-green-100 text-xs opacity-70">Peças Válidas</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-6xl font-black text-white tracking-tight">{sinaisValidos.toLocaleString()}</p>
              <div className="mt-3 bg-green-500/20 rounded-lg p-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-2 flex-1 bg-green-900/50 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-500"
                      style={{ width: `${Math.min(progresso, 100)}%` }}
                    />
                  </div>
                  <span className="text-green-300 text-sm font-bold min-w-[50px] text-right">
                    {progresso.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Saldo */}
          <div className="bg-gradient-to-br from-orange-600/30 to-orange-800/30 border-2 border-orange-400/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-500/30 rounded-xl">
                <Target className="w-8 h-8 text-orange-300" />
              </div>
              <div>
                <p className="text-orange-200 text-sm font-medium uppercase tracking-wider">Saldo</p>
                <p className="text-orange-100 text-xs opacity-70">Restante</p>
              </div>
            </div>
            <div className="text-center">
              <p className={`text-6xl font-black tracking-tight ${saldo > 0 ? 'text-white' : 'text-green-400'}`}>
                {saldo > 0 ? saldo.toLocaleString() : '0'}
              </p>
              <p className="text-orange-200 text-sm mt-2 uppercase tracking-wide">Peças</p>
            </div>
          </div>
        </div>

        {/* Card Secundário: Rejeitos */}
        <div className="bg-gradient-to-br from-red-600/20 to-red-800/20 border border-red-400/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/30 rounded-xl">
                <XCircle className="w-8 h-8 text-red-300" />
              </div>
              <div>
                <p className="text-red-200 text-sm font-medium uppercase tracking-wider">Rejeitos</p>
                <p className="text-3xl font-black text-white mt-1">{rejeitos.toLocaleString()} peças</p>
              </div>
            </div>
            
            {/* Botão de Adicionar Rejeito - SEMPRE ATIVO */}
            <button
              onClick={handleAddRejeito}
              disabled={!onAddRejeito}
              className={`
                flex items-center gap-3 px-8 py-4 rounded-xl font-black text-lg uppercase tracking-wide
                transition-all duration-200 transform hover:scale-105
                ${!onAddRejeito
                  ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white shadow-xl hover:shadow-red-500/50'
                }
              `}
            >
              <Trash2 className="w-6 h-6" />
              Adicionar Rejeito
            </button>
          </div>
        </div>

        {/* Confirmação de rejeito */}
        {confirming && confirmMessage && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 border-2 border-green-500 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
              <div className="flex items-center gap-4 mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <h3 className="text-2xl font-black text-white">Sucesso!</h3>
              </div>
              <p className="text-gray-300 text-lg mb-6">{confirmMessage}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setConfirming(false);
                    setConfirmMessage(null);
                  }}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aviso se não há dados ativos */}
        {!hasSession && (
          <div className="mt-4 p-6 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              <p className="text-yellow-300 font-medium">
                Nenhuma sessão ativa. Aguardando início da produção.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}