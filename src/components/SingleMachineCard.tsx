import React, { useState } from 'react';
import { Clock, Trash2, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import type { SingleMachineProduction } from '../hooks/useSingleMachineProduction';
import { useWebSocketStorage } from '../lib/websocketStorage';

interface SingleMachineCardProps {
  production: SingleMachineProduction | null;
  onAddReject: (gradeId: number) => Promise<void>;
  onAddRejeito?: () => Promise<void>;
  statusParada?: boolean;
}

export function SingleMachineCard({ production, onAddReject, onAddRejeito, statusParada = false }: SingleMachineCardProps) {
  const [confirming, setConfirming] = useState<boolean>(false);
  const storage = useWebSocketStorage();

  console.log('[SingleMachineCard] Production data:', production);
  
  // ✅ Obter dados mais recentes do armazenamento local
  const localStationData = React.useMemo(() => {
    if (!production?.machine?.id_maquina) return null;
    
    const localData = storage.getStationData(production.machine.id_maquina);
    if (localData) {
      console.log(`📊 [SingleMachineCard] Usando dados do WebSocket para máquina ${production.machine.id_maquina}:`, {
        sinais: localData.sinais,
        rejeitos: localData.rejeitos,
        last_update: new Date(localData.last_update).toLocaleTimeString()
      });
      return localData;
    }
    
    return null;
  }, [production?.machine?.id_maquina, storage]);

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
  
  // ✅ Usar dados do WebSocket se disponíveis
  const produzido = (production as any).websocket_data?.sessao_operador?.sinais ?? localStationData?.sinais ?? stats?.produzido ?? 0;
  const rejeitos = (production as any).websocket_data?.sessao_operador?.rejeitos ?? localStationData?.rejeitos ?? stats?.rejeitos ?? 0;
  
  console.log('[SingleMachineCard] Valores finais - Produzido:', produzido, 'Rejeitos:', rejeitos);
  
  const isActive = parameters?.producao_ativa || false;
  const isEmpty = !grade;
  const progress = grade ? Math.min(100, Math.round((produzido) / (grade.quantidade || 1) * 100)) : 0;
  
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
      {/* Cabeçalho - Layout Industrial */}
      <div className="p-6 border-b-2 border-white/20 bg-gradient-to-r from-white/5 to-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-white mb-1">{machine.nome}</h3>
            <div className="flex items-center gap-4">
              <p className="text-base font-bold text-white/80">ESTAÇÃO ÚNICA</p>
              <p className="text-sm text-white/60">ID: {machine.id_maquina}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full border-2 ${isActive ? 'bg-green-400 border-green-300' : 'bg-gray-400 border-gray-500'}`}></div>
            <span className={`text-lg font-black ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
              {isActive ? 'ATIVA' : 'INATIVA'}
            </span>
          </div>
        </div>
      </div>

      {isEmpty ? (
        /* Estado vazio - Layout Industrial Simplificado */
        <div className="flex-1 flex flex-col p-6">
          {/* Mensagem informativa */}
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
              <Info className="w-12 h-12 text-white/60" />
            </div>
            <div>
              <h4 className="text-2xl font-black text-white mb-3">SEM PRODUÇÃO ATIVA</h4>
              <p className="text-lg text-white/70">
                Configure uma produção para esta máquina
              </p>
            </div>
          </div>

          {/* Status da Máquina */}
          <div className="mt-auto mb-6">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-sm text-white/70 mb-1">Status</div>
                  <div className={`text-xl font-black ${isActive ? 'text-green-400' : 'text-gray-400'}`}>
                    {isActive ? 'ATIVA' : 'INATIVA'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-white/70 mb-1">Último Sinal</div>
                  <div className="text-lg font-mono text-white">
                    {stats?.ultimo_sinal ? 
                      new Date(stats.ultimo_sinal * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                      : '-'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ação - Botão de Rejeito */}
          <div>
            <button
              onClick={handleAddRejeito}
              className={`w-full px-6 py-4 text-lg font-bold rounded-xl border-2 transition-all duration-200
                ${confirming 
                  ? 'bg-green-600 border-green-500 text-white shadow-lg' 
                  : 'bg-red-600 border-red-500 text-white hover:bg-red-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                } inline-flex items-center justify-center gap-3`}
              disabled={confirming}
            >
              {confirming ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <Trash2 className="w-6 h-6" />
              )}
              {confirming ? 'CONFIRMADO' : 'ADICIONAR REJEITO'}
            </button>
          </div>
        </div>
      ) : (
        /* Estado com produção */
        <div className="flex-1 flex flex-col p-6">
          {/* Produto */}
          <div className="mb-6">
            <h4 className="text-lg font-bold text-white/90 mb-3">PRODUTO</h4>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-white mb-1">{produto?.referencia || '-'}</div>
              <div className="text-base text-white/80">{produto?.descricao}</div>
              {grade && (
                <div className="text-lg font-bold mt-2 text-blue-300">
                  Tam: {grade.tamanho}
                </div>
              )}
            </div>
          </div>

          {/* Métricas Principais - Layout Industrial */}
          <div className="mb-6">
            <h4 className="text-lg font-bold text-white/90 mb-4">PRODUÇÃO</h4>
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Produzido */}
              <div className="bg-green-600/20 border-2 border-green-500 rounded-xl p-4 text-center">
                <div className="text-white/80 text-lg font-bold mb-1">PRODUZIDO</div>
                <div className="text-6xl font-black text-green-300 leading-none">
                  {produzido}
                  {((production as any).websocket_data || localStationData) && <span className="ml-2 text-2xl text-green-400" title="Dados do WebSocket">⚡</span>}
                </div>
              </div>

              {/* A Produzir */}
              <div className="bg-blue-600/20 border-2 border-blue-500 rounded-xl p-4 text-center">
                <div className="text-white/80 text-lg font-bold mb-1">A PRODUZIR</div>
                <div className="text-6xl font-black text-blue-300 leading-none">
                  {grade ? Math.max(0, grade.quantidade - produzido) : 0}
                </div>
              </div>

              {/* Rejeitos */}
              <div className="bg-red-600/20 border-2 border-red-500 rounded-xl p-4 text-center">
                <div className="text-white/80 text-lg font-bold mb-1">REJEITOS</div>
                <div className="text-6xl font-black text-red-300 leading-none">
                  {rejeitos}
                  {((production as any).websocket_data || localStationData) && <span className="ml-2 text-2xl text-green-400" title="Dados do WebSocket">⚡</span>}
                </div>
              </div>
            </div>

            {/* Barra de Progresso Melhorada */}
            <div className="bg-white/10 rounded-lg p-4">
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

          {/* Informações de Tempo Compactas */}
          <div className="mb-4">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center mb-1">
                    <Clock className="w-5 h-5 mr-2 text-green-300" />
                    <span className="text-base font-bold text-white/90">Decorrido</span>
                  </div>
                  <div className="text-2xl font-black text-white">{tempoDecorrido}min</div>
                </div>
                
                <div>
                  <div className="flex items-center justify-center mb-1">
                    <AlertCircle className="w-5 h-5 mr-2 text-yellow-300" />
                    <span className="text-base font-bold text-white/90">Restante</span>
                  </div>
                  <div className="text-2xl font-black text-white">{tempoRestante}min</div>
                </div>
              </div>
              
              {stats?.ultimo_sinal && (
                <div className="mt-3 pt-3 border-t border-white/20 text-center">
                  <div className="text-sm text-white/70 mb-1">Último sinal:</div>
                  <div className="text-lg font-mono font-bold text-white">
                    {new Date(stats.ultimo_sinal * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ações - Layout Industrial */}
          <div className="mt-auto">
            <div className="grid grid-cols-2 gap-3">
              {/* Botão Rejeito Grade */}
              {grade && (
                <button
                  onClick={() => onAddReject(grade.id)}
                  className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white 
                          rounded-xl transition-all duration-200 text-base font-bold
                          inline-flex items-center justify-center gap-2 border-2 border-red-500
                          shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Trash2 className="w-5 h-5" />
                  Grade
                </button>
              )}
              
              {/* Botão Rejeito Tabela */}
              <button
                onClick={handleAddRejeito}
                className={`px-4 py-3 text-base font-bold rounded-xl border-2 transition-all duration-200
                  ${confirming 
                    ? 'bg-green-600 border-green-500 text-white shadow-lg' 
                    : 'bg-red-600 border-red-500 text-white hover:bg-red-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                  } inline-flex items-center justify-center gap-2`}
                disabled={confirming}
              >
                {confirming ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
                {confirming ? 'OK' : 'Rejeitos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 