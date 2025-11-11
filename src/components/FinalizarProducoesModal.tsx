// 🏁 Modal para Finalizar Produções Concluídas (Saldo = 0)

import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { apiService } from '../services/apiService';
import { LoadingSpinner } from './LoadingSpinner';

interface ProducaoConcluida {
  id_maquina: number;
  nome_maquina: string;
  numero_estacao?: number;
  id_talao: number;
  talao_referencia: string;
  talao_tamanho: string;
  produto: string | null;
  cor: string | null;
  total_produzido: number;
  total_a_produzir: number;
  saldo: number;
  rejeitos: number;
  concluida: boolean; // ✅ NOVO: indica se saldo = 0
}

interface FinalizarProducoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  producoesConcluidas: ProducaoConcluida[];
  onFinalizarSuccess?: () => void;
}

export function FinalizarProducoesModal({
  isOpen,
  onClose,
  producoesConcluidas,
  onFinalizarSuccess
}: FinalizarProducoesModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducoes, setSelectedProducoes] = useState<number[]>([]);
  const [filtro, setFiltro] = useState<'concluidas' | 'todas'>('concluidas'); // ✅ NOVO: filtro de visualização

  // ✅ Debug: Verificar dados recebidos (ANTES do return condicional)
  React.useEffect(() => {
    if (isOpen) {
      console.log('🏁 Modal de Finalização aberto');
      console.log('📊 Total de produções recebidas:', producoesConcluidas.length);
      console.log('📋 Produções:', producoesConcluidas);
    }
  }, [isOpen, producoesConcluidas]);

  // ✅ Filtrar produções baseado na aba ativa
  const producoesExibidas = filtro === 'concluidas' 
    ? producoesConcluidas.filter(p => p.concluida)
    : producoesConcluidas;

  // ✅ Return condicional DEPOIS de todos os hooks
  if (!isOpen) return null;

  const handleSelectAll = () => {
    if (selectedProducoes.length === producoesExibidas.length) {
      setSelectedProducoes([]);
    } else {
      setSelectedProducoes(producoesExibidas.map(p => p.id_talao));
    }
  };

  const handleToggleProducao = (idTalao: number) => {
    setSelectedProducoes(prev => 
      prev.includes(idTalao)
        ? prev.filter(id => id !== idTalao)
        : [...prev, idTalao]
    );
  };

  const handleFinalizar = async () => {
    if (selectedProducoes.length === 0) {
      setError('Selecione pelo menos uma produção para finalizar');
      return;
    }

    // ✅ CORREÇÃO: Backend permite retomar produções finalizadas parcialmente
    // Não precisa de confirmação extra, apenas finalizar
    const producoesSelecionadas = producoesConcluidas.filter(p => 
      selectedProducoes.includes(p.id_talao)
    );

    try {
      setLoading(true);
      setError(null);

      let sucessos = 0;
      let falhas = 0;

      for (const producao of producoesSelecionadas) {
        try {
          const response = await apiService.finalizarEstacao({
            id_maquina: producao.id_maquina,
            id_talao: producao.id_talao,
            estacao_numero: producao.numero_estacao || 1,
            motivo: 'Produção concluída - saldo zerado'
          });

          if (response.success) {
            sucessos++;
            console.log(`✅ Produção ${producao.talao_referencia} finalizada com sucesso`);
          } else {
            falhas++;
            console.error(`❌ Erro ao finalizar ${producao.talao_referencia}:`, response.error);
          }
        } catch (err) {
          falhas++;
          console.error(`❌ Exceção ao finalizar ${producao.talao_referencia}:`, err);
        }
      }

      if (sucessos > 0) {
        alert(`✅ ${sucessos} produção(ões) finalizada(s) com sucesso${falhas > 0 ? `\n⚠️ ${falhas} falhou(falharam)` : ''}`);
        onFinalizarSuccess?.();
        onClose();
      } else {
        setError('Nenhuma produção foi finalizada. Verifique os logs.');
      }
    } catch (err) {
      console.error('❌ Erro ao finalizar produções:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 z-50 flex flex-col">
      <div className="w-full h-full flex flex-col overflow-hidden">
        {/* Header Principal */}
        <div className="flex items-center justify-between px-8 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 shadow-lg flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-600/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">🏁 Finalizar Produções</h2>
              <p className="text-slate-300 text-sm">Gerencie e finalize produções ativas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-lg transition-all flex items-center justify-center border border-white/10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* ✅ Abas de Filtro */}
        <div className="flex border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
          <button
            onClick={() => setFiltro('concluidas')}
            className={`flex-1 px-6 py-3 font-bold text-sm uppercase tracking-wide transition-all ${
              filtro === 'concluidas'
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            ✅ Concluídas ({producoesConcluidas.filter(p => p.concluida).length})
          </button>
          <button
            onClick={() => setFiltro('todas')}
            className={`flex-1 px-6 py-3 font-bold text-sm uppercase tracking-wide transition-all ${
              filtro === 'todas'
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            📋 Todas ({producoesConcluidas.length})
          </button>
        </div>

        {/* Content - Área Central com Scroll */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
          <div className="p-6">
            {error && (
              <div className="mb-4 rounded-lg border border-red-400/50 bg-red-500/20 backdrop-blur-sm p-4 flex items-start gap-3 shadow-lg">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-200">Erro</p>
                  <p className="text-sm text-red-300 mt-1">{error}</p>
                </div>
              </div>
            )}

            {producoesExibidas.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto mb-6 bg-slate-800/50 rounded-full flex items-center justify-center border-2 border-slate-700">
                  <Package className="w-12 h-12 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {filtro === 'concluidas' ? 'Nenhuma Produção Concluída' : 'Nenhuma Produção Ativa'}
                </h3>
                <p className="text-slate-400">
                  {filtro === 'concluidas' 
                    ? 'Não há talões com saldo = 0 para finalizar'
                    : 'Não há produções ativas no momento'
                  }
                </p>
              </div>
          ) : (
            <>
              {/* Mensagem Informativa */}
              {filtro === 'todas' && producoesExibidas.some(p => !p.concluida) && (
                <div className="mb-4 rounded-lg border border-blue-400/50 bg-blue-500/20 backdrop-blur-sm p-4 flex items-start gap-3 shadow-lg">
                  <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-blue-200 mb-1">ℹ️ Finalização Parcial</p>
                    <p className="text-sm text-blue-300">
                      Produções finalizadas parcialmente podem ser retomadas posteriormente. O saldo pendente será preservado.
                    </p>
                  </div>
                </div>
              )}

              {/* Select All */}
              <div className="mb-6 flex items-center gap-3 p-4 bg-slate-800/80 rounded-xl border border-slate-600 shadow-lg backdrop-blur-sm">
                <input
                  type="checkbox"
                  checked={selectedProducoes.length === producoesExibidas.length}
                  onChange={handleSelectAll}
                  className="w-6 h-6 rounded border-slate-500"
                />
                <span className="text-white font-bold text-sm uppercase tracking-wide">
                  Selecionar Todas ({producoesExibidas.length})
                </span>
              </div>

              {/* Lista de Produções */}
              <div className="space-y-4">
                {producoesExibidas.map(producao => (
                  <div
                    key={`${producao.id_maquina}-${producao.id_talao}`}
                    onClick={() => handleToggleProducao(producao.id_talao)}
                    className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all shadow-lg backdrop-blur-sm hover:scale-[1.02] ${
                      selectedProducoes.includes(producao.id_talao)
                        ? producao.concluida
                          ? 'bg-emerald-600/20 border-emerald-500 shadow-emerald-900/30'
                          : 'bg-blue-600/20 border-blue-500 shadow-blue-900/30'
                        : 'bg-slate-800/60 border-slate-600 hover:border-slate-500 hover:shadow-slate-900/50'
                    }`}
                  >
                    {/* ✅ Badge de Estado Parcial */}
                    {!producao.concluida && (
                      <div className="absolute top-3 right-3">
                        <span className="px-3 py-1.5 bg-blue-600/80 border border-blue-400/50 rounded-lg text-white text-xs font-bold uppercase tracking-wide shadow-lg">
                          📋 PARCIAL
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-4">
                      {/* Checkbox */}
                      <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                        selectedProducoes.includes(producao.id_talao)
                          ? producao.concluida
                            ? 'border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-900/50'
                            : 'border-blue-500 bg-blue-500 shadow-lg shadow-blue-900/50'
                          : 'border-slate-500 bg-slate-700/50'
                      }`}>
                        {selectedProducoes.includes(producao.id_talao) && (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        )}
                      </div>

                      {/* Informações */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-white font-bold text-xl">{producao.talao_referencia}</span>
                          <div className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-lg">
                            <span className="text-white font-black text-2xl">{producao.talao_tamanho}</span>
                          </div>
                          {producao.produto && (
                            <span className="text-slate-300 text-sm font-medium">• {producao.produto}</span>
                          )}
                          {producao.cor && (
                            <span className="text-blue-300 text-sm font-medium">• {producao.cor}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          {producao.numero_estacao && (
                            <span className="text-slate-400">
                              Estação: <span className="text-white font-semibold">{producao.numero_estacao}</span>
                            </span>
                          )}
                          <span className="text-slate-400">
                            Máquina: <span className="text-white font-semibold">{producao.nome_maquina}</span>
                          </span>
                        </div>
                      </div>

                      {/* Estatísticas */}
                      <div className="flex gap-4">
                        <div className="text-center px-3">
                          <p className="text-slate-400 text-xs mb-1 uppercase tracking-wide">Produzido</p>
                          <p className="text-emerald-400 font-black text-2xl">{producao.total_produzido}</p>
                        </div>
                        <div className="text-center px-3">
                          <p className="text-slate-400 text-xs mb-1 uppercase tracking-wide">Total</p>
                          <p className="text-blue-400 font-black text-2xl">{producao.total_a_produzir}</p>
                        </div>
                        <div className="text-center px-3">
                          <p className="text-slate-400 text-xs mb-1 uppercase tracking-wide">Saldo</p>
                          <p className={`font-black text-2xl ${producao.concluida ? 'text-emerald-400' : 'text-blue-400'}`}>
                            {producao.saldo}
                          </p>
                        </div>
                        {producao.rejeitos > 0 && (
                          <div className="text-center px-3">
                            <p className="text-slate-400 text-xs mb-1 uppercase tracking-wide">Rejeitos</p>
                            <p className="text-red-400 font-black text-2xl">{producao.rejeitos}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer - FIXO */}
        <div className="px-8 py-4 bg-slate-800 border-t-2 border-slate-700 shadow-2xl flex items-center justify-between flex-shrink-0">
          <div className="text-white text-sm">
            {selectedProducoes.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="font-bold">
                  {selectedProducoes.length} de {producoesConcluidas.length} selecionada(s)
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition-all border border-slate-600 shadow-lg hover:shadow-xl"
            >
              Cancelar
            </button>
            {selectedProducoes.length > 0 && (
              <button
                onClick={handleFinalizar}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg font-black shadow-lg hover:shadow-2xl disabled:opacity-50 transition-all flex items-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <LoadingSpinner className="w-5 h-5" />
                    <span>Finalizando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" />
                    <span>🏁 Finalizar Selecionadas</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
      </div>

    </div>
  );
}

