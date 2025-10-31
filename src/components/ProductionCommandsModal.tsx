// 📊 Modal de Comandos de Produção - Mapas e Alocação

import React, { useState, useEffect } from 'react';
import { X, Play, MapPin, Package, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import type { AlocacaoMapa, MapaDetalhes, TalaoSelecionado } from '../types/production';
import type { FinalizarSessaoRequest, FinalizarTalaoRequest } from '../services/apiService';

interface ProductionCommandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  machineId: number;
  onStartProduction?: (mapaId: number, taloes: TalaoSelecionado[]) => Promise<void>;
  onFinishSession?: () => Promise<void>;
}

export function ProductionCommandsModal({
  isOpen,
  onClose,
  machineId,
  onStartProduction,
  onFinishSession
}: ProductionCommandsModalProps) {
  const [mapas, setMapas] = useState<AlocacaoMapa[]>([]);
  const [selectedMapa, setSelectedMapa] = useState<MapaDetalhes | null>(null);
  const [selectedTaloes, setSelectedTaloes] = useState<TalaoSelecionado[]>([]);
  const [currentStationIndex, setCurrentStationIndex] = useState<number>(0);
  const [storedProduction, setStoredProduction] = useState<{ id_maquina: number; id_mapa: number; taloes: TalaoSelecionado[]; timestamp: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'mapas' | 'detalhes' | 'confirmacao'>('mapas');

  const CURRENT_PROD_KEY = 'industrack_current_production';

  // Carregar mapas ao abrir modal
  useEffect(() => {
    if (isOpen) {
      console.log('🎯 Modal de produção aberto para máquina:', machineId);
      loadMapas();
      // Carregar produção atual armazenada localmente
      try {
        const str = localStorage.getItem(CURRENT_PROD_KEY);
        setStoredProduction(str ? JSON.parse(str) : null);
      } catch {
        setStoredProduction(null);
      }
    } else {
      // Reset ao fechar
      setStep('mapas');
      setSelectedMapa(null);
      setSelectedTaloes([]);
      setCurrentStationIndex(0);
      setError(null);
    }
  }, [isOpen, machineId]);

  const loadMapas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar alocações de mapas para a máquina específica
      const response = await apiService.listarMapas({ 
        id_maquina: machineId,
        ativo: true 
      });
      
      if (response.success && response.data) {
        console.log('✅ Alocações carregadas:', response.data.length);
        console.log('🔍 Estrutura dos dados recebidos:', response.data[0]);
        
        // Log detalhado para identificar campos de referência do produto
        if (response.data.length > 0) {
          const primeiraAlocacao = response.data[0];
          console.log('🏷️ REFERÊNCIAS DO PRODUTO DISPONÍVEIS:');
          console.log('- codmapa:', primeiraAlocacao.codmapa);
          console.log('- cor_descricao:', primeiraAlocacao.cor_descricao);
          console.log('- Todos os campos:', Object.keys(primeiraAlocacao));
          
          // Procurar por campos que podem conter referência
          const camposReferencia = Object.keys(primeiraAlocacao).filter(key => 
            key.toLowerCase().includes('ref') || 
            key.toLowerCase().includes('codigo') || 
            key.toLowerCase().includes('produto') ||
            key.toLowerCase().includes('talao')
          );
          console.log('🔍 Campos que podem ser referência:', camposReferencia);
        }
        
        // Filtrar apenas alocações para esta máquina e que têm mapa válido
        // ✅ Remover filtro de alocacao_concluida para mostrar mapas já iniciados
        const alocacoesFiltradas = response.data.filter(alocacao => 
          alocacao.maquina_id === machineId && 
          alocacao.id_mapa
        );
        
        console.log(`🎯 Alocações para máquina ${machineId}:`, alocacoesFiltradas.length);
        console.log(`📊 Detalhes das alocações:`, alocacoesFiltradas.map(a => ({
          id_alocacao: a.id_alocacao,
          id_mapa: a.id_mapa,
          codmapa: a.codmapa,
          alocacao_concluida: a.alocacao_concluida
        })));
        
        setMapas(alocacoesFiltradas);
        
        if (alocacoesFiltradas.length === 0) {
          setError(`Nenhuma alocação de mapa encontrada para a máquina ${machineId}`);
        }
      } else {
        throw new Error(response.error || 'Erro ao carregar mapas');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar mapas:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar mapas');
    } finally {
      setLoading(false);
    }
  };

  const loadMapaDetalhes = async (mapaId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiService.obterDetalhesMapa(mapaId);
      
      if (response.success && response.data) {
        setSelectedMapa(response.data);
        setStep('detalhes');
        console.log('✅ Detalhes do mapa carregados:', response.data);
      } else {
        throw new Error(response.error || 'Erro ao carregar detalhes do mapa');
      }
    } catch (err) {
      console.error('❌ Erro ao carregar detalhes:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes do mapa');
    } finally {
      setLoading(false);
    }
  };

  const toggleTalao = (talao: TalaoSelecionado) => {
    setSelectedTaloes(prev => {
      const exists = prev.find(t => t.id_talao === talao.id_talao);
      if (exists) {
        return prev.filter(t => t.id_talao !== talao.id_talao);
      } else {
        return [...prev, talao];
      }
    });
  };

  const handleStartProduction = async () => {
    if (!selectedMapa || selectedTaloes.length === 0) return;

    try {
      setLoading(true);
      
      if (onStartProduction) {
        await onStartProduction(selectedMapa.id, selectedTaloes);
      }

      // ✅ Persistir produção atual localmente
      try {
        const data = {
          id_maquina: machineId,
          id_mapa: selectedMapa.id,
          taloes: selectedTaloes,
          timestamp: Date.now()
        };
        localStorage.setItem(CURRENT_PROD_KEY, JSON.stringify(data));
        setStoredProduction(data);
        console.log('💾 Produção atual armazenada no localStorage');
      } catch (e) {
        console.warn('⚠️ Falha ao salvar produção atual localmente:', e);
      }
      
      console.log('✅ Produção iniciada com sucesso - fechando modal');
      onClose();
    } catch (err) {
      console.error('❌ Erro ao iniciar produção:', err);
      setError(err instanceof Error ? err.message : 'Erro ao iniciar produção');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishTalao = async (talao: any, estacaoNumero: number, quantidadeProduzida?: number) => {
    try {
      setLoading(true);
      console.log('🏁 Finalizando talão:', { talao, estacaoNumero, quantidadeProduzida });
      
      // ✅ Usar o novo endpoint finalizar-estacao
      const response = await apiService.finalizarEstacao({
        id_maquina: machineId,
        id_talao: talao.id,
        estacao_numero: estacaoNumero,
        motivo: 'Produção concluída'
      });

      if (response.success) {
        console.log('✅ Talão finalizado com sucesso');
        // Atualizar lista de talões removendo o finalizado
        setSelectedTaloes(prev => prev.filter(t => t.id_talao !== talao.id));
        // TODO: Pode mostrar feedback visual
      } else {
        throw new Error(response.error || 'Erro ao finalizar talão');
      }
    } catch (error) {
      console.error('❌ Erro ao finalizar talão:', error);
      setError(error instanceof Error ? error.message : 'Erro ao finalizar talão');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishSession = async () => {
    try {
      setLoading(true);
      console.log('🏁 Finalizando sessão para máquina:', machineId);
      
      if (onFinishSession) {
        await onFinishSession();
      } else {
        const response = await apiService.finalizarSessao({
          id_maquina: machineId,
          motivo: 'Sessão finalizada pelo operador'
        });

        if (response.success) {
          console.log('✅ Sessão finalizada com sucesso');
        } else {
          throw new Error(response.error || 'Erro ao finalizar sessão');
        }
      }
      
      handleClose();
    } catch (error) {
      console.error('❌ Erro ao finalizar sessão:', error);
      setError(error instanceof Error ? error.message : 'Erro ao finalizar sessão');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    console.log('🚪 Fechando modal de produção');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 z-50">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 text-white rounded-t-2xl border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center shadow-inner">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight drop-shadow">
                {step === 'mapas' && 'Escolher Trabalho'}
                {step === 'detalhes' && 'Selecionar Produtos'}
                {step === 'confirmacao' && 'Confirmar Início'}
              </h1>
              <p className="text-blue-100 text-xs opacity-95">
                {step === 'mapas' && 'Toque no trabalho que deseja produzir'}
                {step === 'detalhes' && 'Toque nos produtos para selecionar'}
                {step === 'confirmacao' && 'Verifique e confirme o início'}
              </p>
            </div>
          </div>
          {/* Tag Em Produção */}
          {storedProduction && storedProduction.id_maquina === machineId && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-400/40 rounded-lg">
              <span className="text-green-200 text-xs font-bold uppercase">Em Produção</span>
              <span className="text-green-100 text-xs">Mapa #{storedProduction.id_mapa}</span>
            </div>
          )}
          <button
            onClick={handleClose}
            className="w-10 h-10 bg-white/15 hover:bg-white/25 rounded-lg transition-all duration-200 flex items-center justify-center border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(95vh-140px)]">
          {error && (
            <div className="mb-4 rounded-xl border border-red-400/40 bg-red-600/10 text-red-900 p-4 flex items-start gap-3">
              <div className="mt-0.5">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold">Erro</p>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          )}

          {/* Etapa 1: Escolha do Trabalho */}
          {step === 'mapas' && !loading && (
            <div className="space-y-3">
              {mapas.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-18 h-18 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <MapPin className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 mb-1 tracking-tight">Nenhum trabalho disponível</h3>
                  <p className="text-slate-600 text-sm">Não há trabalhos alocados para esta máquina.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {mapas.map((alocacao, index) => (
                    <div
                      key={alocacao.id_alocacao || index}
                      onClick={() => {
                        console.log('🔍 Trabalho selecionado:', alocacao);
                        if (alocacao.id_mapa) {
                          loadMapaDetalhes(alocacao.id_mapa);
                        } else {
                          console.warn('⚠️ Alocação sem ID do mapa');
                          setError('Trabalho sem ID válido.');
                        }
                      }}
                      className="group p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-xl cursor-pointer transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-4">
                        {/* Ícone do Trabalho */}
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                          <Package className="w-7 h-7 text-white" />
                        </div>
                        
                        {/* Informações Principais */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Título e Código */}
                              <h2 className="text-lg font-bold text-gray-900 mb-1">
                                {alocacao.codmapa || `Trabalho #${alocacao.id_mapa}`}
                              </h2>
                              
                              {/* Informações em linha */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                {alocacao.cor_descricao && (
                                  <span className="inline-flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-lg text-xs font-medium text-purple-900 border border-purple-200">
                                    🎨 {alocacao.cor_descricao}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg text-xs font-medium text-blue-900 border border-blue-200">
                                  📍 Pos. {alocacao.posicao_ordem}
                                </span>
                                <span className="inline-flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg text-xs font-medium text-green-900 border border-green-200">
                                  ⏱️ {alocacao.prioridade_alocacao}
                                </span>
                              </div>
                              
                              {/* Ciclos */}
                              {alocacao.ciclos_calculados && (
                                <div className="text-sm font-semibold text-emerald-700">
                                  🔄 {alocacao.ciclos_calculados.toLocaleString()} ciclos
                                </div>
                              )}
                            </div>
                            
                            {/* Status */}
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-1 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-full font-bold text-xs shadow">
                                ✅ PRONTO
                              </div>
                              <span className="text-xl text-gray-400 group-hover:text-blue-500 transition-colors">→</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Etapa 2: Seleção de Produtos */}
          {step === 'detalhes' && selectedMapa && !loading && (
            <div className="space-y-4">
              {/* Info do Trabalho */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedMapa.nome}</h2>
                    <p className="text-blue-700 text-sm">Selecione os produtos (um por vez). Use as setas para navegar entre as estações.</p>
                  </div>
                </div>
              </div>

              {/* Navegação por Estações */}
              {selectedMapa.estacoes.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Header da Estação com Navegação */}
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                    <button
                      className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm disabled:opacity-50"
                      onClick={() => setCurrentStationIndex(i => Math.max(0, i - 1))}
                      disabled={currentStationIndex === 0}
                      aria-label="Estação anterior"
                    >
                      ←
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                        {selectedMapa.estacoes[currentStationIndex].numero_estacao}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Estação {selectedMapa.estacoes[currentStationIndex].numero_estacao}
                      </h3>
                    </div>
                    <button
                      className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 text-sm disabled:opacity-50"
                      onClick={() => setCurrentStationIndex(i => Math.min(selectedMapa.estacoes.length - 1, i + 1))}
                      disabled={currentStationIndex === selectedMapa.estacoes.length - 1}
                      aria-label="Próxima estação"
                    >
                      →
                    </button>
                  </div>

                  {/* Produtos da Estação atual */}
                  <div className="p-3">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                      {selectedMapa.estacoes[currentStationIndex].taloes.map(talao => {
                        const isSelected = selectedTaloes.some(t => t.id_talao === talao.id);
                        return (
                          <div
                            key={talao.id}
                            onClick={() => toggleTalao({
                              id_talao: talao.id,
                              estacao_numero: selectedMapa.estacoes[currentStationIndex].numero_estacao,
                              quantidade: talao.quantidade,
                              tempo_ciclo_segundos: talao.tempo_ciclo_segundos,
                              talao_referencia: talao.talao_referencia,
                              talao_tamanho: talao.talao_tamanho
                            })}
                            className={`relative p-3 rounded-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] ${
                              isSelected
                                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 shadow-md'
                                : 'bg-gray-50 border border-gray-200 hover:border-blue-300 hover:shadow-sm'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-white" />
                              </div>
                            )}
                            <div className="mb-2">
                              <div className="bg-gradient-to-r from-orange-100 to-amber-100 px-3 py-1 rounded-lg border-l-2 border-orange-400">
                                <p className="font-bold text-orange-900 text-sm">
                                  {talao.talao_referencia}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-600">📐</span>
                                  <span className="font-medium text-gray-900">{talao.talao_tamanho}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-purple-600">📦</span>
                                  <span className="font-bold text-gray-900">{talao.quantidade.toLocaleString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Clock className="w-3 h-3" />
                                  <span>{talao.tempo_ciclo_segundos}s/ciclo</span>
                                </div>
                                {isSelected && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFinishTalao(talao, selectedMapa.estacoes[currentStationIndex].numero_estacao);
                                    }}
                                    className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-lg font-semibold transition-colors"
                                    title="Finalizar este talão"
                                  >
                                    🏁 Finalizar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
          <div className="flex items-center justify-between">
            {/* Status da Seleção */}
            <div className="flex items-center gap-3">
              {step === 'detalhes' && selectedTaloes.length > 0 && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-xl border border-green-200">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-green-900 text-sm">{selectedTaloes.length} produto(s)</p>
                    <p className="text-green-700 text-xs">
                      {selectedTaloes.reduce((sum, t) => sum + t.quantidade, 0).toLocaleString()} peças
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-3">
              {step === 'detalhes' && (
                <button
                  onClick={() => setStep('mapas')}
                  className="px-6 py-3 text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-xl transition-all duration-200 font-semibold border border-gray-300 hover:border-gray-400 active:scale-95"
                >
                  ← Voltar
                </button>
              )}
              
              {/* Botão Finalizar Sessão */}
              <button
                onClick={handleFinishSession}
                disabled={loading}
                className="px-6 py-3 text-red-700 hover:text-red-900 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-200 font-semibold border border-red-300 hover:border-red-400 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <LoadingSpinner className="w-4 h-4" />
                    <span>Finalizando...</span>
                  </>
                ) : (
                  <>
                    <span>🏁</span>
                    <span>Finalizar Sessão</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleClose}
                className="px-6 py-3 text-gray-700 hover:text-gray-900 bg-white hover:bg-gray-50 rounded-xl transition-all duration-200 font-semibold border border-gray-300 hover:border-gray-400 active:scale-95"
              >
                Cancelar
              </button>

              {step === 'detalhes' && selectedTaloes.length > 0 && (
                <button
                  onClick={handleStartProduction}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center gap-2 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner className="w-5 h-5" />
                      <span>Iniciando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      <span>Iniciar Produção</span>
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
