import React, { useState } from 'react';
import { Trash2, AlertCircle, Info, CheckCircle2, Play, Pause, Target, TrendingUp, XCircle } from 'lucide-react';
import type { MachineDataNew } from '../types/websocket-new';

interface SingleMachineViewNewProps {
  machineData: MachineDataNew | null;
  contextoAtivo?: 'sessao' | 'turno' | 'taloes'; // Novo: contexto ativo para selecionar dados
  onAddReject: (gradeId: number) => Promise<void>;
  onAddRejeito?: () => Promise<void>;
  statusParada?: boolean;
  onEncerrarParcial?: () => Promise<void>;
  onEncerrarTotal?: () => Promise<void>;
}

export function SingleMachineViewNew({ 
  machineData, 
  contextoAtivo = 'sessao',
  onAddReject, 
  onAddRejeito, 
  statusParada = false,
  onEncerrarParcial,
  onEncerrarTotal
}: SingleMachineViewNewProps) {
  const [confirming, setConfirming] = useState<boolean>(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  console.log('[SingleMachineViewNew] Machine data:', machineData);
  console.log('[SingleMachineViewNew] Contexto ativo:', contextoAtivo);

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

  // ✅ USAR DADOS DIRETAMENTE DO BACKEND - SEM CÁLCULOS
  // O backend já envia tudo calculado, apenas exibimos o que vem
  
  // Estrutura do backend: pode vir com ou sem 'contexto' wrapper
  const dadosBackend = (machineData as any)?.contexto ?? machineData as any;
  
  console.log('[SingleMachineViewNew] Dados completos recebidos:', machineData);
  console.log('[SingleMachineViewNew] Dados extraídos:', dadosBackend);
  
  // Extrair dados básicos da máquina
  const id = dadosBackend?.id_maquina ?? dadosBackend?.id ?? 69;
  const nome = dadosBackend?.nome ?? 'Máquina';
  const velocidade = dadosBackend?.velocidade ?? 0;
  const status = dadosBackend?.status ?? true;
  const parada_ativa = dadosBackend?.parada_ativa ?? null;
  
  // Extrair contextos (vêm direto do backend) + fallback para contadores de sessão
  const sessao_operador_raw = dadosBackend?.sessao_operador ?? null;
  const producao_turno = dadosBackend?.producao_turno ?? null;
  const producao_mapa = dadosBackend?.producao_mapa ?? null;
  const estatisticas = (dadosBackend as any)?.estatisticas ?? null;
  const sessao_operador = React.useMemo(() => {
    if (!sessao_operador_raw) return null;
    const needsCounters = sessao_operador_raw.sinais === undefined && sessao_operador_raw.sinais_validos === undefined && sessao_operador_raw.rejeitos === undefined;
    if (!needsCounters) return sessao_operador_raw;
    const src = estatisticas || producao_turno || null;
    if (!src) return sessao_operador_raw;
    return {
      ...sessao_operador_raw,
      sinais: src.sinais ?? 0,
      sinais_validos: src.sinais_validos ?? src.sinais ?? 0,
      rejeitos: src.rejeitos ?? 0
    };
  }, [sessao_operador_raw, estatisticas, producao_turno]);
  
  console.log('[SingleMachineViewNew] Contextos extraídos:', {
    sessao_operador,
    producao_turno,
    producao_mapa,
    contexto_ativo: contextoAtivo
  });

  // ✅ Selecionar contexto para exibir (usar fallbacks quando necessário)
  let dadosExibicao: any = null;

  switch (contextoAtivo) {
    case 'sessao':
      dadosExibicao = sessao_operador || estatisticas || producao_turno;
      break;
    case 'turno':
      dadosExibicao = producao_turno;
      break;
    case 'taloes':
      dadosExibicao = producao_mapa;
      break;
  }

  // ✅ Usar valores que JÁ VÊM do backend - SEM CALCULOS
  const sinaisValidos = dadosExibicao?.sinais_validos ?? 0;
  const rejeitos = dadosExibicao?.rejeitos ?? 0;
  const sinais = dadosExibicao?.sinais ?? 0;
  
  // Para qt_produzir, usar sempre do producao_mapa (independente do contexto)
  const qtProduzir = producao_mapa?.qt_produzir ?? producao_mapa?.quantidade ?? 0;
  
  // ✅ SALDO: Se o backend não enviar, usar saldo_a_produzir que já vem calculado
  const saldo = producao_mapa?.saldo_a_produzir ?? (qtProduzir - sinaisValidos);
  
  // ✅ PROGRESSO: Se o backend não enviar, calcular (único cálculo permitido)
  const progresso = qtProduzir > 0 ? (sinaisValidos / qtProduzir) * 100 : 0;

  // Status da máquina
  const isStopped = parada_ativa !== null || status === false;
  const isActive = !isStopped;
  const hasSession = !!sessao_operador;

  console.log('[SingleMachineViewNew] Valores finais (todos do backend, sem cálculo):', {
    contexto_ativo: contextoAtivo,
    sinaisValidos,
    rejeitos,
    sinais,
    qtProduzir,
    saldo,
    status,
    parada_ativa
  });

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
          <div className="flex-1">
            <h3 className="text-3xl font-black text-white tracking-tight">{nome}</h3>
            <p className="text-white/60 text-sm mt-1">Estação #{id} | Velocidade: {velocidade} pcs/h</p>
            {/* Informações da Produção Ativa - MELHORADAS */}
            {(producao_mapa as any) && (
              <div className="mt-4 space-y-2">
                {/* Linha 1: Produto, TAMANHO e Cor */}
                <div className="flex items-center gap-3 flex-wrap">
                  {(() => {
                    const mapa: any = producao_mapa as any;
                    const refDisplay = mapa.referencia || mapa.codmapa || mapa.produto_referencia || null;
                    return refDisplay ? (
                      <span className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/30 to-amber-500/30 px-4 py-2 rounded-lg border-2 border-orange-400/50 shadow-lg">
                        <span className="text-orange-200 font-bold text-sm">📦 Produto:</span>
                        <span className="text-orange-50 font-bold text-base">{refDisplay}</span>
                      </span>
                    ) : null;
                  })()}
                  
                  {/* TAMANHO - GIGANTE E DESTAQUE */}
                  {(() => {
                    const mapa: any = producao_mapa as any;
                    const taloes = mapa.taloes || [];
                    const tamanhos = [...new Set(taloes.map((t: any) => t.talao_tamanho).filter(Boolean))];
                    return tamanhos.length > 0 ? (
                      <span className="inline-flex items-center gap-2 bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-3 rounded-xl border-4 border-white/30 shadow-2xl">
                        <span className="text-white text-sm font-bold uppercase">Tamanho</span>
                        <span className="text-white text-3xl font-black tracking-wider">{tamanhos.join(', ')}</span>
                      </span>
                    ) : null;
                  })()}
                  
                  {(() => {
                    const mapa: any = producao_mapa as any;
                    const corDesc = mapa.cor_descricao || null;
                    return corDesc ? (
                      <span className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500/30 to-rose-500/30 px-4 py-2 rounded-lg border-2 border-pink-400/50 shadow-lg">
                        <span className="text-pink-200 font-bold text-sm">🎨 Cor:</span>
                        <span className="text-pink-50 font-bold text-base">{corDesc}</span>
                      </span>
                    ) : null;
                  })()}
                </div>
                
                {/* Linha 2: Tempo de Ciclo, Tempo Total e Matriz */}
                <div className="flex items-center gap-3 flex-wrap">
                  {(() => {
                    const mapa: any = producao_mapa as any;
                    const tempoCiclo = mapa.tempo_produto || mapa.tempo_ciclo_segundos || null;
                    return tempoCiclo ? (
                      <span className="inline-flex items-center gap-2 bg-blue-500/20 px-4 py-2 rounded-lg border border-blue-400/40">
                        <span className="text-blue-200 font-bold text-xs">⏱️ Ciclo:</span>
                        <span className="text-blue-100 font-bold text-sm">{tempoCiclo}s</span>
                      </span>
                    ) : null;
                  })()}
                  
                  {(() => {
                    const mapa: any = producao_mapa as any;
                    const tempoEstimado = mapa.tempo_estimado || null;
                    return tempoEstimado ? (
                      <span className="inline-flex items-center gap-2 bg-emerald-500/20 px-4 py-2 rounded-lg border border-emerald-400/40">
                        <span className="text-emerald-200 font-bold text-xs">⏰ Tempo Total:</span>
                        <span className="text-emerald-100 font-bold text-sm">{Math.ceil(tempoEstimado / 60)} min</span>
                      </span>
                    ) : null;
                  })()}
                  
                  {(() => {
                    const mapa: any = producao_mapa as any;
                    const taloes = mapa.taloes || [];
                    const matrizes = [...new Set(taloes.map((t: any) => t.id_matriz).filter(Boolean))];
                    return matrizes.length > 0 ? (
                      <span className="inline-flex items-center gap-2 bg-gray-500/20 px-4 py-2 rounded-lg border border-gray-400/40">
                        <span className="text-gray-200 font-bold text-xs">🔧 Matriz:</span>
                        <span className="text-gray-100 font-bold text-sm">#{matrizes.join(', #')}</span>
                      </span>
                    ) : null;
                  })()}
                  
                  {(() => {
                    const mapa: any = producao_mapa as any;
                    const taloes = mapa.taloes || [];
                    const cavidades = taloes.find((t: any) => t.qt_cavidades_matriz_simples)?.qt_cavidades_matriz_simples;
                    return cavidades ? (
                      <span className="inline-flex items-center gap-2 bg-gray-500/20 px-4 py-2 rounded-lg border border-gray-400/40">
                        <span className="text-gray-200 font-bold text-xs">🔲 Cavidades:</span>
                        <span className="text-gray-100 font-bold text-sm">{cavidades}</span>
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
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

        {/* Cards Principais - Layout Industrial Otimizado */}
        <div className={`grid gap-4 mb-6 ${contextoAtivo === 'taloes' ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {/* Card 1: Meta de Produção - Mostrar em 'taloes', 'turno' e 'sessao' */}
          {(contextoAtivo === 'taloes' || contextoAtivo === 'turno' || contextoAtivo === 'sessao') && (
            <div className="bg-gradient-to-br from-indigo-600/40 to-blue-600/40 border-2 border-indigo-400/60 rounded-2xl p-5 backdrop-blur-sm shadow-lg shadow-indigo-900/20">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2.5 bg-indigo-500/40 rounded-xl shadow-inner">
                  <Target className="w-7 h-7 text-indigo-200" />
                </div>
                <div>
                  <p className="text-indigo-100 text-sm font-bold uppercase tracking-wider">Meta</p>
                  <p className="text-indigo-200 text-xs font-medium">{contextoAtivo === 'taloes' ? 'Talões' : contextoAtivo === 'turno' ? 'Turno' : 'Sessão'}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-5xl font-black text-white tracking-tight leading-none">{qtProduzir.toLocaleString()}</p>
                <p className="text-indigo-200 text-xs mt-1.5 uppercase tracking-wide font-semibold">Peças</p>
              </div>
            </div>
          )}

          {/* Card 2: Produzido (Sinais Válidos) - Sempre visível */}
          <div className="bg-gradient-to-br from-emerald-600/40 to-green-600/40 border-2 border-emerald-400/60 rounded-2xl p-5 backdrop-blur-sm shadow-lg shadow-emerald-900/20">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2.5 bg-emerald-500/40 rounded-xl shadow-inner">
                <TrendingUp className="w-7 h-7 text-emerald-200" />
              </div>
              <div>
                <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider">Produzido</p>
                <p className="text-emerald-200 text-xs font-medium">
                  {contextoAtivo === 'sessao' ? 'Sessão' : contextoAtivo === 'turno' ? 'Turno' : 'Talões'}
                </p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-5xl font-black text-white tracking-tight leading-none">{sinaisValidos.toLocaleString()}</p>
              {/* Barra de progresso apenas se tiver meta */}
              {(contextoAtivo === 'taloes' || contextoAtivo === 'turno') && (
                <div className="mt-2.5 bg-emerald-500/20 rounded-lg p-1.5">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-1.5 flex-1 bg-emerald-900/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.min(progresso, 100)}%` }}
                      />
                    </div>
                    <span className="text-emerald-200 text-xs font-bold min-w-[45px] text-right">
                      {progresso.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
              {contextoAtivo === 'sessao' && (
                <p className="text-emerald-200 text-xs mt-1.5 font-semibold">Peças Válidas</p>
              )}
            </div>
          </div>

          {/* Card 3: Saldo - Mostrar apenas em contexto 'taloes' */}
          {contextoAtivo === 'taloes' && (
            <div className="bg-gradient-to-br from-amber-600/40 to-orange-600/40 border-2 border-amber-400/60 rounded-2xl p-5 backdrop-blur-sm shadow-lg shadow-amber-900/20">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2.5 bg-amber-500/40 rounded-xl shadow-inner">
                  <Target className="w-7 h-7 text-amber-200" />
                </div>
                <div>
                  <p className="text-amber-100 text-sm font-bold uppercase tracking-wider">Saldo</p>
                  <p className="text-amber-200 text-xs font-medium">Restante</p>
                </div>
              </div>
              <div className="text-center">
                <p className={`text-5xl font-black tracking-tight leading-none ${saldo > 0 ? 'text-white' : 'text-emerald-300'}`}>
                  {saldo > 0 ? saldo.toLocaleString() : '0'}
                </p>
                <p className="text-amber-200 text-xs mt-1.5 font-semibold">Peças</p>
              </div>
            </div>
          )}

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