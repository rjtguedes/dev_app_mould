import React, { useState } from 'react';
import { Clock, Trash2, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import type { SingleMachineProduction } from '../hooks/useSingleMachineProduction';

interface SingleMachineCardProps {
  production: SingleMachineProduction | null;
  onAddReject: (gradeId: number) => Promise<void>;
  onAddRejeito?: () => Promise<void>;
  statusParada?: boolean;
}

export function SingleMachineCard({ production, onAddReject, onAddRejeito, statusParada = false }: SingleMachineCardProps) {
  const [confirming, setConfirming] = useState<boolean>(false);

  console.log('[SingleMachineCard] Production data:', production);

  if (!production) {
    return (
      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 min-h-[400px] flex flex-col items-center justify-center">
        <Info className="w-12 h-12 text-white/40 mb-4" />
        <h4 className="text-lg font-bold text-white mb-2">Sem dados de produção</h4>
        <p className="text-sm text-white/60">Aguardando configuração da máquina</p>
      </div>
    );
  }

  const { machine, stats, parameters, produto, grade } = production;
  console.log('[SingleMachineCard] Destructured data:', { machine, stats, parameters, produto, grade });
  
  const isActive = parameters?.producao_ativa || false;
  const isEmpty = !grade;
  const progress = grade ? Math.min(100, Math.round((stats?.produzido || 0) / (grade.quantidade || 1) * 100)) : 0;
  
  // Calcular tempo decorrido: usar minutos_disponivel se > 0, senão calcular baseado no último sinal
  let tempoDecorrido = stats?.minutos_disponivel || 0;
  if (tempoDecorrido === 0 && stats?.ultimo_sinal) {
    const agora = Math.floor(Date.now() / 1000);
    const tempoDecorridoSegundos = agora - stats.ultimo_sinal;
    tempoDecorrido = Math.floor(tempoDecorridoSegundos / 60); // Converter para minutos
  }
  
  const tempoEstimadoTotal = grade?.minutos_estimado || 0;
  const tempoRestante = Math.max(0, tempoEstimadoTotal - tempoDecorrido);

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
    <div className={`
      bg-white/5 backdrop-blur-sm rounded-xl border 
      ${isActive ? 'border-blue-500/30' : 'border-white/10 opacity-60'}
      transition-all duration-200 min-h-[400px] flex flex-col
    `}>
      {/* Cabeçalho */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">{machine.nome}</h3>
            <p className="text-sm text-white/60">Estação única</p>
          </div>
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-400' : 'bg-gray-400'}`}></div>
        </div>
      </div>

      {isEmpty ? (
        /* Estado vazio */
        <div className="flex-1 flex flex-col p-4">
          {/* Mensagem informativa */}
          <div className="flex flex-col items-center justify-center text-center mb-6">
            <Info className="w-12 h-12 text-white/40 mb-4" />
            <h4 className="text-lg font-bold text-white mb-2">Sem produção ativa</h4>
            <p className="text-sm text-white/60">Configure uma produção para esta máquina</p>
          </div>

          {/* Stats da máquina - SEMPRE MOSTRAR */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white/80 mb-2">DADOS DA MÁQUINA</h4>
            <div className="bg-white/10 rounded-lg p-3 space-y-3">
              {/* Produzido */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80 font-semibold">Produzido:</span>
                <span className="text-lg font-bold text-green-300">{stats?.produzido || 0}</span>
              </div>
              
              {/* Rejeitos */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80 font-semibold">Rejeitos:</span>
                <span className="text-lg font-bold text-red-300">{stats?.rejeitos || 0}</span>
              </div>

              {/* Tempo */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80 font-semibold">Tempo disponível:</span>
                <span className="text-sm font-bold text-white">{stats?.minutos_disponivel || 0}min</span>
              </div>

              {/* Último sinal */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80 font-semibold">Último sinal:</span>
                {stats?.ultimo_sinal ? (
                  <span className="text-xs font-mono font-bold text-white">
                    {new Date(stats.ultimo_sinal * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-sm text-white/60">-</span>
                )}
              </div>
            </div>
          </div>

          {/* Ações - Botão apenas de adicionar à tabela rejeitos */}
          <div className="mt-auto">
            <button
              onClick={handleAddRejeito}
              className={`w-full px-3 py-2 text-sm font-bold rounded-lg border transition-all duration-200
                ${confirming 
                  ? 'bg-green-600 border-green-600 text-white shadow-lg' 
                  : 'bg-red-600 border-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl'
                } inline-flex items-center justify-center gap-1`}
              disabled={confirming}
            >
              {confirming ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {confirming ? 'OK' : 'Adicionar Rejeito'}
            </button>
          </div>
        </div>
      ) : (
        /* Estado com produção */
        <div className="flex-1 flex flex-col p-4">
          {/* Produto */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white/80 mb-2">PRODUTO</h4>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-lg font-bold text-white">{produto?.referencia || '-'}</div>
              <div className="text-sm text-white/80">{produto?.descricao}</div>
              {grade && (
                <div className="text-sm font-bold mt-1 text-blue-300">
                  Tam: {grade.tamanho}
                </div>
              )}
            </div>
          </div>

          {/* Progresso */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white/80 mb-2">PROGRESSO</h4>
            <div className="bg-white/10 rounded-lg p-3">
              {/* Quantidade */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-bold text-white">{stats?.produzido || 0}</span>
                <span className="text-white/60">/</span>
                <span className="text-lg font-semibold text-white">{grade?.quantidade || 0}</span>
              </div>
              
              {/* Barra de progresso */}
              <div className="flex items-center mb-3">
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-bold text-white">{progress}%</span>
              </div>
              
              {/* Rejeitos */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80 font-semibold">Rejeitos:</span>
                <span className="text-sm font-bold text-red-300">{stats?.rejeitos || 0}</span>
              </div>
            </div>
          </div>

          {/* Tempo */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-white/80 mb-2">TEMPO</h4>
            <div className="bg-white/10 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1 text-green-300" />
                  <span className="text-sm text-white/80">Decorrido:</span>
                </div>
                <span className="text-sm font-bold text-white">{tempoDecorrido}min</span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1 text-yellow-300" />
                  <span className="text-sm text-white/80">Restante:</span>
                </div>
                <span className="text-sm font-bold text-white">{tempoRestante}min</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/80">Último sinal:</span>
                {stats?.ultimo_sinal ? (
                  <span className="text-xs font-mono font-bold text-white">
                    {new Date(stats.ultimo_sinal * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <span className="text-sm text-white/60">-</span>
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="mt-auto space-y-2">
            {/* Botão Rejeito Grade */}
            {grade && (
              <button
                onClick={() => onAddReject(grade.id)}
                className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white 
                        rounded-lg transition-all duration-200 text-sm font-bold
                        inline-flex items-center justify-center gap-1 border border-red-600
                        shadow-lg hover:shadow-xl"
              >
                <Trash2 className="w-4 h-4" />
                Rejeitos {grade.id ? `[${grade.id}]` : '[ID não encontrado]'}
              </button>
            )}
            
            {/* Botão Rejeito Tabela */}
            <button
              onClick={handleAddRejeito}
              className={`w-full px-3 py-2 text-sm font-bold rounded-lg border transition-all duration-200
                ${confirming 
                  ? 'bg-green-600 border-green-600 text-white shadow-lg' 
                  : 'bg-red-600 border-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl'
                } inline-flex items-center justify-center gap-1`}
              disabled={confirming}
            >
              {confirming ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {confirming ? 'OK' : 'Rejeitos'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 