import React, { useState } from 'react';
import { Clock, Trash2, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import type { SingleMachineProduction } from '../hooks/useSingleMachineProduction';

interface SingleMachineViewProps {
  production: SingleMachineProduction | null;
  onAddReject: (gradeId: number) => Promise<void>;
  onAddRejeito?: () => Promise<void>;
  statusParada?: boolean;
}

export function SingleMachineView({ production, onAddReject, onAddRejeito, statusParada = false }: SingleMachineViewProps) {
  const [confirming, setConfirming] = useState<boolean>(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  console.log('[SingleMachineView] Production data:', production);

  if (!production) {
    return (
      <div className="overflow-x-auto bg-black/20 rounded-xl border border-white/30 shadow-xl backdrop-blur-sm">
        <div className="p-8 text-center">
          <Info className="w-12 h-12 text-white/70 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white">Sem dados de produção</p>
          <p className="text-sm text-white/80">Aguardando configuração da máquina</p>
        </div>
      </div>
    );
  }

  const { machine, stats, parameters, produto, grade } = production;
  console.log('[SingleMachineView] Destructured data:', { machine, stats, parameters, produto, grade });
  
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

  console.log('[SingleMachineView] Calculated values:', {
    isActive,
    isEmpty,
    progress,
    tempoDecorrido,
    tempoEstimadoTotal,
    tempoRestante,
    'stats.produzido': stats?.produzido,
    'stats.rejeitos': stats?.rejeitos,
    'grade.quantidade': grade?.quantidade
  });

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
        {/* Cabeçalho - Layout Industrial */}
        <div className="mb-6 p-4 bg-gradient-to-r from-white/5 to-white/10 rounded-xl border border-white/20">
          <h3 className="text-3xl font-black text-white mb-2 drop-shadow-sm">ESTAÇÃO DE PRODUÇÃO</h3>
          <div className="flex items-center justify-between">
            <p className="text-xl font-bold text-white/90">Máquina: {machine.nome}</p>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 ${isActive ? 'bg-green-400 border-green-300' : 'bg-gray-400 border-gray-500'}`}></div>
              <span className={`text-lg font-black ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
                {isActive ? 'ATIVA' : 'INATIVA'}
              </span>
            </div>
          </div>
        </div>

        {/* Card principal da produção */}
        <div className={`
          rounded-xl border p-6
          ${isActive ? 'border-blue-400/40 bg-black/10' : 'border-white/30 bg-black/15'}
          transition-all duration-200 min-h-[300px] backdrop-blur-sm
        `}>
          
          {isEmpty ? (
            /* Estado vazio - Layout melhorado */
            <div className="space-y-6">
              
              {/* Mensagem centralizada compacta */}
              <div className="text-center py-4">
                <Info className="w-12 h-12 text-white/60 mx-auto mb-3" />
                <h4 className="text-xl font-bold text-white mb-1 drop-shadow-sm">Sem produção ativa</h4>
                <p className="text-white/90 font-medium">Configure uma produção para esta máquina</p>
              </div>

              {/* Métricas Principais - Layout Industrial */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Card Produção */}
                <div className="bg-green-600/20 border-2 border-green-500 rounded-xl p-4 text-center">
                  <div className="text-white/80 text-lg font-bold mb-1">PRODUZIDO</div>
                  <div className="text-6xl font-black text-green-300 leading-none">{stats?.produzido || 0}</div>
                  <div className="text-sm text-white/70 mt-1">unidades</div>
                </div>

                {/* Card Rejeitos */}
                <div className="bg-red-600/20 border-2 border-red-500 rounded-xl p-4 text-center">
                  <div className="text-white/80 text-lg font-bold mb-1">REJEITOS</div>
                  <div className="text-6xl font-black text-red-300 leading-none">{stats?.rejeitos || 0}</div>
                  <div className="text-sm text-white/70 mt-1">unidades</div>
                </div>

                {/* Card Tempo Ativo */}
                <div className="bg-blue-600/20 border-2 border-blue-500 rounded-xl p-4 text-center">
                  <div className="text-white/80 text-lg font-bold mb-1">TEMPO ATIVO</div>
                  <div className="text-6xl font-black text-blue-300 leading-none">{stats?.minutos_disponivel || 0}</div>
                  <div className="text-sm text-white/70 mt-1">minutos</div>
                </div>

                {/* Card Tempo Parada */}
                <div className="bg-orange-600/20 border-2 border-orange-500 rounded-xl p-4 text-center">
                  <div className="text-white/80 text-lg font-bold mb-1">TEMPO PARADA</div>
                  <div className="text-6xl font-black text-orange-300 leading-none">
                    {stats?.minutos_parada || 0}
                  </div>
                  <div className="text-sm text-white/70 mt-1">minutos</div>
                </div>
              </div>

              {/* Informações adicionais e ações em linha */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                
                {/* Botão de ação - Layout Industrial */}
                <div className="bg-black/30 rounded-xl p-4 border-2 border-white/20 backdrop-blur-sm">
                  <button
                    onClick={handleAddRejeito}
                    className={`w-full px-8 py-6 text-xl font-black rounded-xl border-2 transition-all duration-200
                      ${confirming 
                        ? 'bg-green-600 border-green-500 text-white shadow-lg' 
                        : 'bg-red-600 border-red-500 text-white hover:bg-red-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                      } inline-flex items-center justify-center gap-3 drop-shadow-sm`}
                    disabled={confirming}
                  >
                    {confirming ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Trash2 className="w-6 h-6" />
                    )}
                    {confirming ? 'CONFIRMADO!' : 'ADICIONAR REJEITO'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Estado com produção */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Coluna esquerda - Informações do produto */}
              <div>
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-white mb-2 drop-shadow-sm">Produto</h4>
                  <div className="bg-black/30 rounded-lg p-4 border border-white/20 backdrop-blur-sm">
                    <div className="text-xl font-bold text-white drop-shadow-sm">{produto?.referencia || '-'}</div>
                    <div className="text-white/95 font-semibold">{produto?.descricao}</div>
                    {grade && (
                      <div className="text-sm font-bold mt-2 text-blue-200 drop-shadow-sm">
                        Tamanho: {grade.tamanho}
                      </div>
                    )}
                  </div>
                </div>

                {/* Métricas Principais - Layout Industrial */}
                <div className="mb-6">
                  <h4 className="text-xl font-bold text-white mb-4 drop-shadow-sm">PRODUÇÃO</h4>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {/* Produzido */}
                    <div className="bg-green-600/20 border-2 border-green-500 rounded-xl p-4 text-center">
                      <div className="text-white/80 text-lg font-bold mb-1">PRODUZIDO</div>
                      <div className="text-6xl font-black text-green-300 leading-none">{stats?.produzido || 0}</div>
                    </div>

                    {/* A Produzir */}
                    <div className="bg-blue-600/20 border-2 border-blue-500 rounded-xl p-4 text-center">
                      <div className="text-white/80 text-lg font-bold mb-1">A PRODUZIR</div>
                      <div className="text-6xl font-black text-blue-300 leading-none">
                        {grade ? Math.max(0, grade.quantidade - (stats?.produzido || 0)) : 0}
                      </div>
                    </div>

                    {/* Rejeitos */}
                    <div className="bg-red-600/20 border-2 border-red-500 rounded-xl p-4 text-center">
                      <div className="text-white/80 text-lg font-bold mb-1">REJEITOS</div>
                      <div className="text-6xl font-black text-red-300 leading-none">{stats?.rejeitos || 0}</div>
                    </div>
                  </div>

                  {/* Barra de Progresso Melhorada */}
                  <div className="bg-black/30 rounded-xl p-4 border-2 border-white/20 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg font-bold text-white/90">Progresso Total</span>
                      <span className="text-2xl font-black text-white">{progress}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-4">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full transition-all duration-500" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-2 text-sm text-white/70">
                      <span>0</span>
                      <span className="font-bold">{grade?.quantidade || 0} peças</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna direita - Tempo e ações */}
              <div>
                <div className="mb-6">
                  <h4 className="text-lg font-bold text-white mb-2 drop-shadow-sm">Tempo</h4>
                  <div className="bg-black/30 rounded-lg p-4 space-y-4 border border-white/20 backdrop-blur-sm">
                    {/* Tempo decorrido */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-green-300" />
                        <span className="text-white font-bold">Decorrido:</span>
                      </div>
                      <span className="text-lg font-bold text-white drop-shadow-sm">{tempoDecorrido}min</span>
                    </div>
                    
                    {/* Tempo restante */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2 text-yellow-300" />
                        <span className="text-white font-bold">Restante:</span>
                      </div>
                      <span className="text-lg font-bold text-white drop-shadow-sm">{tempoRestante}min</span>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div>
                  <h4 className="text-lg font-bold text-white mb-2 drop-shadow-sm">Ações</h4>
                  <div className="space-y-3">
                    {/* Botão Rejeito Grade */}
                    {grade && (
                      <button
                        onClick={() => onAddReject(grade.id)}
                        className="w-full px-6 py-4 bg-red-600 hover:bg-red-700 text-white 
                                rounded-lg transition-all duration-200 text-lg font-bold
                                inline-flex items-center justify-center gap-3 border border-red-500
                                shadow-lg hover:shadow-xl drop-shadow-sm"
                      >
                        <Trash2 className="w-6 h-6" />
                        Rejeitos (Grade) {grade.id ? `[${grade.id}]` : '[ID não encontrado]'}
                      </button>
                    )}
                    
                    {/* Botão Rejeito Tabela */}
                    <button
                      onClick={handleAddRejeito}
                      className={`w-full px-6 py-4 text-lg font-bold rounded-lg border transition-all duration-200
                        ${confirming 
                          ? 'bg-green-600 border-green-500 text-white shadow-lg' 
                          : 'bg-red-600 border-red-500 text-white hover:bg-red-700 shadow-lg hover:shadow-xl'
                        } inline-flex items-center justify-center gap-3 drop-shadow-sm`}
                      disabled={confirming}
                    >
                      {confirming ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Trash2 className="w-6 h-6" />
                      )}
                      {confirming ? 'Confirmado!' : 'Rejeitos (Tabela)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 