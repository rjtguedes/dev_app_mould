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
        
        // Log detalhado dos talões com status
        response.data.estacoes?.forEach(estacao => {
          console.log(`📍 Estação ${estacao.numero_estacao}:`);
          estacao.taloes?.forEach(talao => {
            console.log(`  🎫 Talão ${talao.id} (${talao.talao_referencia} - ${talao.talao_tamanho}):`, {
              iniciada: talao.iniciada,
              id_maquina: talao.id_maquina,
              concluida_total: talao.concluida_total,
              concluida_parcial: talao.concluida_parcial,
              quantidade_produzida: talao.quantidade_produzida,
              rejeitos: talao.rejeitos
            });
          });
        });
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
      setError(null);
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
        console.log('📊 Dados da finalização:', response.data);
        
        // Mostrar informações da finalização
        if (response.data) {
          const { produzido_sinais_validos, rejeitos } = response.data;
          alert(
            `✅ Talão Finalizado!\n\n` +
            `📦 Produzidas: ${produzido_sinais_validos || 0}\n` +
            `❌ Rejeitos: ${rejeitos || 0}\n\n` +
            `Atualizando dados...`
          );
        }
        
        // Remover talão da seleção
        setSelectedTaloes(prev => prev.filter(t => t.id_talao !== talao.id));
        
        // ⚡ RECARREGAR DETALHES DO MAPA para refletir mudanças
        if (selectedMapa?.id) {
          console.log('🔄 Recarregando detalhes do mapa após finalização...');
          await loadMapaDetalhes(selectedMapa.id);
        }
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

  const handleRetomarTalao = async (talao: any, estacaoNumero: number) => {
    if (!confirm(`🔄 Deseja retomar a produção do talão ${talao.talao_referencia} - ${talao.talao_tamanho}?\n\nSaldo pendente: ${talao.saldo_pendente || (talao.quantidade - (talao.quantidade_produzida || 0))} peças`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Retomando talão:', { talao, estacaoNumero });
      
      const response = await apiService.retomarTalao({
        id_maquina: machineId,
        id_talao: talao.id,
        estacao_numero: estacaoNumero
      });

      if (response.success) {
        console.log('✅ Talão retomado com sucesso');
        console.log('📊 Dados da retomada:', response.data);
        
        if (response.data) {
          alert(
            `✅ Produção Retomada!\n\n` +
            `📦 Já produzidas: ${response.data.quantidade_ja_produzida || 0}\n` +
            `📦 Saldo pendente: ${response.data.saldo_pendente || 0}\n\n` +
            `Você pode continuar a produção.`
          );
        }
        
        // Recarregar detalhes do mapa
        if (selectedMapa?.id) {
          console.log('🔄 Recarregando detalhes do mapa após retomada...');
          await loadMapaDetalhes(selectedMapa.id);
        }
      } else {
        throw new Error(response.error || 'Erro ao retomar talão');
      }
    } catch (error) {
      console.error('❌ Erro ao retomar talão:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao retomar talão';
      
      // Verificar tipos de erro
      if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        setError('⚠️ Endpoint de retomada ainda não foi implementado no backend. Verifique PRODUCAO_PARCIAL_RETOMADA.md');
      } else if (errorMessage.includes('saldo_pendente does not exist') || errorMessage.includes('42703')) {
        setError('⚠️ Erro no banco de dados: A coluna "saldo_pendente" não existe na tabela taloes_estacao. O backend precisa ser corrigido para calcular o saldo dinamicamente ou adicionar a coluna ao banco.');
      } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
        setError(`❌ Erro interno do servidor: ${errorMessage}\n\nVerifique os logs do backend para mais detalhes.`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizarProducaoAtiva = async () => {
    if (!confirm('⚠️ Tem certeza que deseja finalizar a produção ativa? Todos os talões em andamento serão finalizados.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🏁 Finalizando produção ativa do mapa para máquina:', machineId);
      
      if (selectedMapa && selectedMapa.estacoes.length > 0) {
        let totalFinalizados = 0;
        
        // Percorrer TODAS as estações, não apenas a atual
        for (const estacao of selectedMapa.estacoes) {
          const taloesParaFinalizar = estacao.taloes.filter(
            t => t.iniciada && t.id_maquina === machineId && !t.concluida_total && !t.concluida_parcial
          );
          
          if (taloesParaFinalizar.length > 0) {
            console.log(`⚠️ Estação ${estacao.numero_estacao}: Finalizando ${taloesParaFinalizar.length} talão(ões)...`);
            
            for (const talao of taloesParaFinalizar) {
              await apiService.finalizarEstacao({
                id_maquina: machineId,
                id_talao: talao.id,
                estacao_numero: estacao.numero_estacao,
                motivo: 'Finalização forçada pelo operador'
              });
              totalFinalizados++;
            }
          }
        }
        
        if (totalFinalizados > 0) {
          console.log(`✅ ${totalFinalizados} talão(ões) finalizados com sucesso`);
          alert(`✅ Produção finalizada! ${totalFinalizados} talão(ões) foram encerrados. Você já pode iniciar nova produção.`);
        } else {
          // Se não há talões para finalizar mas há talões já finalizados,
          // significa que a produção foi concluída mas ainda está "ativa" no sistema
          console.log('ℹ️ Todos os talões já estão finalizados. Limpando estado de produção...');
          alert('ℹ️ Produção já estava concluída. Recarregando dados...');
        }
        
        handleClose();
        // Dar tempo para o backend processar antes de recarregar
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (error) {
      console.error('❌ Erro ao finalizar produção ativa:', error);
      setError(error instanceof Error ? error.message : 'Erro ao finalizar produção ativa');
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
      <div className="bg-white rounded-2xl max-w-7xl w-full max-h-[96vh] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-white/10">
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
        <div className="p-5 overflow-y-auto max-h-[calc(96vh-180px)]">
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
                              <h2 className="text-xl font-bold text-gray-900 mb-2">
                                {alocacao.codmapa || `Trabalho #${alocacao.id_mapa}`}
                              </h2>
                              
                              {/* Cor - destaque maior */}
                              {alocacao.cor_descricao && (
                                <div className="mb-3">
                                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-100 to-rose-100 px-4 py-2 rounded-lg border-2 border-pink-300">
                                    <span className="text-pink-600 text-lg">🎨</span>
                                    <span className="font-bold text-pink-900 text-base">{alocacao.cor_descricao}</span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Informações em linha */}
                              <div className="flex flex-wrap gap-2 mb-2">
                                <span className="inline-flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-bold text-blue-900 border border-blue-200">
                                  📍 Posição {alocacao.posicao_ordem}
                                </span>
                                <span className="inline-flex items-center gap-1 bg-green-50 px-3 py-1.5 rounded-lg text-sm font-bold text-green-900 border border-green-200">
                                  ⏱️ {alocacao.prioridade_alocacao}
                                </span>
                                {alocacao.ciclos_calculados && (
                                  <span className="inline-flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-lg text-sm font-bold text-emerald-900 border border-emerald-200">
                                    🔄 {alocacao.ciclos_calculados.toLocaleString()} ciclos
                                  </span>
                                )}
                                {alocacao.duracao_calculada_segundos && (
                                  <span className="inline-flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-lg text-sm font-bold text-amber-900 border border-amber-200">
                                    ⏱️ {Math.ceil(alocacao.duracao_calculada_segundos / 60)} min
                                  </span>
                                )}
                              </div>
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
              {/* Alerta de Produção Ativa */}
              {(() => {
                const temProducaoAtiva = selectedMapa.estacoes.some(estacao =>
                  estacao.taloes.some(t => t.iniciada && t.id_maquina === machineId && !t.concluida_total && !t.concluida_parcial)
                );
                const temTalaoFinalizado = selectedMapa.estacoes.some(estacao =>
                  estacao.taloes.some(t => (t.concluida_total || t.concluida_parcial) && t.id_maquina === machineId)
                );
                
                if (temProducaoAtiva || temTalaoFinalizado) {
                  return (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border-2 border-orange-300 shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-orange-900 mb-1">⚠️ Produção Ativa Detectada</h3>
                          <p className="text-orange-800 text-sm mb-3">
                            {temProducaoAtiva 
                              ? 'Há talões em produção neste mapa. Finalize-os antes de iniciar nova produção.'
                              : 'Há talões finalizados. Para iniciar nova produção, você precisa finalizar completamente a produção atual.'
                            }
                          </p>
                          <button
                            onClick={handleFinalizarProducaoAtiva}
                            disabled={loading}
                            className="px-5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                          >
                            <span>🏁</span>
                            <span>Finalizar Produção Ativa Agora</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

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

                  {/* Produtos da Estação atual - FORMATO LISTA */}
                  <div className="p-3">
                    <div className="space-y-2">
                      {selectedMapa.estacoes[currentStationIndex].taloes.map(talao => {
                        const isSelected = selectedTaloes.some(t => t.id_talao === talao.id);
                        const isIniciada = talao.iniciada === true;
                        const isConcluidaTotal = talao.concluida_total === true;
                        const isConcluidaParcial = talao.concluida_parcial === true && !isConcluidaTotal;
                        const isFinalizada = isConcluidaTotal || isConcluidaParcial;
                        const isAlocadoOutraMaquina = isIniciada && talao.id_maquina && talao.id_maquina !== machineId;
                        const isDisabled = isConcluidaTotal || isAlocadoOutraMaquina; // Parcial NÃO é disabled, pode retomar!
                        
                        // Log de debug para cada talão
                        if (process.env.NODE_ENV === 'development') {
                          console.log(`🔍 Talão ${talao.id}:`, {
                            isIniciada,
                            isFinalizada,
                            isAlocadoOutraMaquina,
                            isDisabled,
                            id_maquina: talao.id_maquina,
                            machineId
                          });
                        }
                        
                        return (
                          <div
                            key={talao.id}
                            onClick={() => {
                              if (!isDisabled) {
                                toggleTalao({
                              id_talao: talao.id,
                              estacao_numero: selectedMapa.estacoes[currentStationIndex].numero_estacao,
                              quantidade: talao.quantidade,
                              tempo_ciclo_segundos: talao.tempo_ciclo_segundos,
                              talao_referencia: talao.talao_referencia,
                              talao_tamanho: talao.talao_tamanho
                                });
                              }
                            }}
                            className={`relative p-4 rounded-xl transition-all duration-200 flex items-center gap-4 ${
                              isConcluidaTotal
                                ? 'bg-gradient-to-r from-gray-100 to-slate-100 border-2 border-gray-300 opacity-60 cursor-not-allowed'
                                : isConcluidaParcial
                                ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-400 shadow-md cursor-default'
                                : isAlocadoOutraMaquina
                                ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 opacity-75 cursor-not-allowed'
                                : isSelected
                                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 shadow-lg cursor-pointer hover:shadow-xl'
                                : isIniciada
                                ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-300 shadow-md cursor-pointer hover:border-blue-400 hover:shadow-lg'
                                : 'bg-white border-2 border-gray-200 cursor-pointer hover:border-indigo-400 hover:shadow-lg'
                            } ${!isDisabled && !isConcluidaParcial && 'transform hover:scale-[1.01] active:scale-[0.99]'}`}
                          >
                            {/* Indicador de Status à Esquerda */}
                            <div className="flex-shrink-0">
                              {isConcluidaTotal ? (
                                <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-slate-500 rounded-xl flex items-center justify-center shadow-inner">
                                  <CheckCircle2 className="w-6 h-6 text-white" />
                                </div>
                              ) : isConcluidaParcial ? (
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-inner">
                                  <AlertCircle className="w-6 h-6 text-white" />
                                </div>
                              ) : isAlocadoOutraMaquina ? (
                                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-inner">
                                  <AlertCircle className="w-6 h-6 text-white" />
                                </div>
                              ) : isSelected ? (
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
                                  <CheckCircle2 className="w-6 h-6 text-white" />
                                </div>
                              ) : isIniciada ? (
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-inner">
                                  <Play className="w-6 h-6 text-white" />
                                </div>
                              ) : (
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-inner">
                                  <Package className="w-6 h-6 text-white" />
                              </div>
                            )}
                            </div>

                            {/* Informações do Talão */}
                            <div className="flex-1 min-w-0">
                              {/* Linha 1: Produto e TAMANHO GIGANTE */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className="bg-gradient-to-r from-orange-100 to-amber-100 px-4 py-2 rounded-lg border-l-4 border-orange-500">
                                  <p className="font-bold text-orange-900 text-lg">
                                    {talao.talao_referencia}
                                  </p>
                                </div>
                                
                                {/* TAMANHO - GIGANTE E DESTAQUE */}
                                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-3 rounded-xl shadow-lg border-4 border-white">
                                  <div className="flex items-center gap-2">
                                    <span className="text-white text-sm font-bold">TAMANHO</span>
                                    <span className="text-white text-3xl font-black tracking-wider">{talao.talao_tamanho}</span>
                                  </div>
                                </div>
                                
                                {/* Cor - se disponível */}
                                {(talao as any).descricao_cor && (
                                  <div className="bg-gradient-to-r from-pink-100 to-rose-100 px-3 py-2 rounded-lg border border-pink-300">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-pink-600">🎨</span>
                                      <span className="font-bold text-pink-900 text-sm">{(talao as any).descricao_cor}</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Linha 2: Quantidade, Tempo de Ciclo e Tempo Total */}
                              <div className="flex items-center gap-4 text-sm mb-2">
                                <div className="flex items-center gap-1.5 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                                  <span className="text-purple-600 font-bold">📦</span>
                                  <span className="font-bold text-purple-900">{talao.quantidade.toLocaleString()} pçs</span>
                                  {talao.quantidade_produzida !== undefined && talao.quantidade_produzida > 0 && (
                                    <span className="text-green-700 font-semibold ml-1">
                                      ({talao.quantidade_produzida.toLocaleString()} OK)
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                                  <Clock className="w-4 h-4 text-blue-600" />
                                  <span className="font-bold text-blue-900">{talao.tempo_ciclo_segundos}s</span>
                                  <span className="text-blue-700 text-xs">/ciclo</span>
                                </div>
                                
                                {/* Tempo Total Previsto */}
                                {talao.tempo_ciclo_segundos && talao.quantidade && (
                                  <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                                    <span className="text-emerald-600 font-bold">⏱️</span>
                                    <span className="font-bold text-emerald-900">
                                      {Math.ceil((talao.tempo_ciclo_segundos * talao.quantidade) / 60)}min
                                    </span>
                                    <span className="text-emerald-700 text-xs">previsto</span>
                                  </div>
                                )}
                                
                                {talao.rejeitos !== undefined && talao.rejeitos > 0 && (
                                  <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                                    <span className="text-red-600 font-bold">❌</span>
                                    <span className="font-bold text-red-900">{talao.rejeitos}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Linha 3: Informações da Matriz */}
                              {((talao as any).id_matriz || (talao as any).qt_cavidades_matriz_simples) && (
                                <div className="flex items-center gap-3 text-xs">
                                  {(talao as any).id_matriz && (
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                      <span className="font-semibold">🔧 Matriz:</span>
                                      <span className="font-bold text-gray-900">#{(talao as any).id_matriz}</span>
                                      {(talao as any).matriz_multi_tamanhos && (
                                        <span className="text-blue-600 font-semibold">(Multi)</span>
                                      )}
                                    </div>
                                  )}
                                  {(talao as any).qt_cavidades_matriz_simples && (
                                    <div className="flex items-center gap-1.5 text-gray-600">
                                      <span className="font-semibold">🔲 Cavidades:</span>
                                      <span className="font-bold text-gray-900">{(talao as any).qt_cavidades_matriz_simples}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Status Badge à Direita */}
                            <div className="flex-shrink-0 flex flex-col items-end gap-2">
                              {/* Talão concluído parcialmente - PODE RETOMAR */}
                              {talao.concluida_parcial && !talao.concluida_total && (
                                <>
                                  <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-amber-700 text-white rounded-full font-bold text-xs shadow-md uppercase">
                                    ⚠️ Parcial - Saldo: {talao.saldo_pendente || (talao.quantidade - (talao.quantidade_produzida || 0))}
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRetomarTalao(talao, selectedMapa.estacoes[currentStationIndex].numero_estacao);
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs rounded-lg font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
                                    title="Retomar produção deste talão"
                                  >
                                    ▶️ Retomar
                                  </button>
                                </>
                              )}
                              
                              {/* Talão concluído totalmente */}
                              {talao.concluida_total && (
                                <div className="px-3 py-1.5 bg-gradient-to-r from-gray-600 to-slate-700 text-white rounded-full font-bold text-xs shadow-md uppercase">
                                  ✓ Finalizado
                                </div>
                              )}
                              
                              {/* Talão alocado em outra máquina */}
                              {!isFinalizada && isAlocadoOutraMaquina && (
                                <div className="px-3 py-1.5 bg-gradient-to-r from-yellow-600 to-amber-700 text-white rounded-full font-bold text-xs shadow-md uppercase">
                                  🔒 Máquina {talao.id_maquina}
                                </div>
                              )}
                              
                              {/* Talão em produção - COM BOTÃO FINALIZAR */}
                              {!isFinalizada && !isAlocadoOutraMaquina && isIniciada && talao.id_maquina === machineId && (
                                <>
                                  <div className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-700 text-white rounded-full font-bold text-xs shadow-md uppercase">
                                    ▶ Em Produção
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFinishTalao(talao, selectedMapa.estacoes[currentStationIndex].numero_estacao);
                                    }}
                                    className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs rounded-lg font-bold transition-all shadow-md hover:shadow-lg active:scale-95"
                                    title="Finalizar este talão"
                                  >
                                    🏁 Finalizar
                                  </button>
                                </>
                              )}
                              
                              {/* Talão selecionado (mas ainda NÃO iniciado) */}
                              {!isFinalizada && !isAlocadoOutraMaquina && !isIniciada && isSelected && (
                                <div className="px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-full font-bold text-xs shadow-md uppercase">
                                  ✓ Selecionado
                                </div>
                              )}
                              
                              {/* Talão disponível */}
                              {!isFinalizada && !isAlocadoOutraMaquina && !isIniciada && !isSelected && !talao.concluida_parcial && (
                                <div className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-full font-bold text-xs shadow-md uppercase">
                                  ✓ Disponível
                              </div>
                              )}
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
