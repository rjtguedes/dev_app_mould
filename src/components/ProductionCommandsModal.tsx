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

// ✅ Memoizar modal para evitar re-renders quando props não mudam
export const ProductionCommandsModal = React.memo(function ProductionCommandsModal({
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

  // ✅ OTIMIZAÇÃO: Usar ref para rastrear se modal já foi inicializado
  const wasOpenRef = React.useRef(false);
  const lastMachineIdRef = React.useRef<number | null>(null);

  // Carregar mapas ao abrir modal - ✅ OTIMIZADO para não resetar estado
  useEffect(() => {
    if (isOpen) {
      // Só carregar mapas se:
      // 1. Modal está abrindo pela primeira vez (não estava aberto antes)
      // 2. OU machineId mudou de fato
      const shouldLoad = !wasOpenRef.current || lastMachineIdRef.current !== machineId;
      
      if (shouldLoad) {
      console.log('🎯 Modal de produção aberto para máquina:', machineId);
      loadMapas();
      // Carregar produção atual armazenada localmente
      try {
        const str = localStorage.getItem(CURRENT_PROD_KEY);
        setStoredProduction(str ? JSON.parse(str) : null);
      } catch {
        setStoredProduction(null);
      }
        lastMachineIdRef.current = machineId;
      } else {
        console.log('⏭️ Modal já está aberto, mantendo estado atual (evitando re-render)');
      }
      
      wasOpenRef.current = true;
    } else {
      wasOpenRef.current = false;
    }
    // ✅ IMPORTANTE: NÃO resetar quando modal já está aberto e machineId não muda
    // Isso evita que o modal se feche sozinho durante updates do SSE
  }, [isOpen, machineId]);
  
  // ✅ NOVO: Resetar estados apenas quando modal FECHA (não quando abre)
  useEffect(() => {
    if (!isOpen) {
      // Reset ao fechar
      setStep('mapas');
      setSelectedMapa(null);
      setSelectedTaloes([]);
      setCurrentStationIndex(0);
      setError(null);
    }
  }, [isOpen]);

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
      
      // ✅ SOLUÇÃO MAIS DIRETA: O próprio talão JÁ TEM o id_maquina correto!
      const idMaquinaEstacao = talao.id_maquina || machineId;
      
      console.log(`✅ Usando id_maquina do talão: ${idMaquinaEstacao} (raiz: ${machineId})`);
      console.log('📤 Payload finalizar:', { id_maquina: idMaquinaEstacao, id_talao: talao.id, estacao_numero: estacaoNumero });
      
      // ✅ Usar o novo endpoint finalizar-estacao
      const response = await apiService.finalizarEstacao({
        id_maquina: idMaquinaEstacao,
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
      
      // ✅ SOLUÇÃO MAIS DIRETA: O próprio talão JÁ TEM o id_maquina correto!
      const idMaquinaEstacao = talao.id_maquina || machineId;
      
      console.log(`✅ Usando id_maquina do talão: ${idMaquinaEstacao} (raiz: ${machineId})`);
      console.log('📤 Payload retomar:', { id_maquina: idMaquinaEstacao, id_talao: talao.id, estacao_numero: estacaoNumero });
      
      const response = await apiService.retomarTalao({
        id_maquina: idMaquinaEstacao,
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
          id_maquina: machineId
          // ❌ motivo removido - backend não aceita
        });

        if (response.success) {
          console.log('✅ Sessão finalizada com sucesso');
        } else {
          // ✅ NOVO: Detectar desalinhamento de sessão
          const errorMsg = response.error || '';
          const isSessionMismatch = errorMsg.includes('Não há sessão ativa') || 
                                     errorMsg.includes('sessão ativa para finalizar') ||
                                     errorMsg.includes('400:');
          
          if (isSessionMismatch) {
            console.warn('⚠️ ProductionCommandsModal: Desalinhamento de sessão detectado - apenas limpando localStorage');
            // Limpar localStorage e prosseguir
            localStorage.removeItem('id_sessao');
            localStorage.removeItem('sessao_ativa');
            localStorage.removeItem('industrack_active_session');
          } else {
            throw new Error(response.error || 'Erro ao finalizar sessão');
          }
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
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 z-50">
      <div className="w-full h-full flex flex-col">
        {/* Header Principal */}
        <div className="flex items-center justify-between px-8 py-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 shadow-lg flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {step === 'mapas' && 'Escolher Trabalho'}
                {step === 'detalhes' && 'Selecionar Produtos'}
                {step === 'confirmacao' && 'Confirmar Início'}
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                {step === 'mapas' && 'Selecione o trabalho que deseja produzir'}
                {step === 'detalhes' && selectedMapa?.nome}
                {step === 'confirmacao' && 'Verifique os detalhes e confirme'}
              </p>
            </div>
          </div>
          {/* Tag Em Produção */}
          {storedProduction && storedProduction.id_maquina === machineId && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-400/50 rounded-lg backdrop-blur-sm">
              <span className="text-green-400 text-sm font-bold uppercase">Em Produção</span>
              <span className="text-green-300 text-sm">Mapa #{storedProduction.id_mapa}</span>
            </div>
          )}
          <button
            onClick={handleClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 flex items-center justify-center border border-white/20"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content - Área com Scroll + Navegação Lateral */}
        <div className="flex-1 overflow-hidden flex">
          {/* Coluna Esquerda - Navegação Anterior (BARRA GRANDE) */}
          {step === 'detalhes' && selectedMapa && selectedMapa.estacoes.length > 1 && (
            <button
              onClick={() => setCurrentStationIndex(i => Math.max(0, i - 1))}
              disabled={currentStationIndex === 0}
              className="w-32 bg-gradient-to-r from-blue-600/40 via-blue-600/20 to-transparent hover:from-blue-600/60 disabled:from-slate-700/20 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center group border-r border-slate-700"
              aria-label="Estação anterior"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="text-white text-7xl font-black group-hover:scale-125 group-disabled:opacity-30 transition-all duration-300">←</div>
                <span className="text-white text-sm font-bold uppercase tracking-widest -rotate-90 transform origin-center whitespace-nowrap group-disabled:opacity-30">Anterior</span>
              </div>
            </button>
          )}
          
          {/* Área Central com Conteúdo */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800">
            <div className="p-6">
          {error && (
              <div className="mb-4 rounded-lg border border-red-400/50 bg-red-500/20 backdrop-blur-sm p-4 flex items-start gap-3 shadow-lg">
              <div className="mt-0.5">
                  <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                  <p className="font-bold text-base text-red-200">Erro</p>
                  <p className="text-sm text-red-300 mt-1">{error}</p>
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
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Nenhum trabalho disponível</h3>
                  <p className="text-slate-400 text-sm">Não há trabalhos alocados para esta máquina.</p>
                </div>
              ) : (
                <div className="space-y-3">
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
                      className="group p-5 bg-slate-700/50 backdrop-blur-sm border border-slate-600 rounded-lg hover:border-blue-500 hover:bg-slate-700/70 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        {/* Ícone do Trabalho */}
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                          <Package className="w-6 h-6 text-white" />
                        </div>
                        
                        {/* Informações Principais */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Título e Código */}
                              <h2 className="text-lg font-bold text-white mb-2">
                                {alocacao.codmapa || `Trabalho #${alocacao.id_mapa}`}
                              </h2>
                              
                              {/* Informações em linha */}
                              <div className="flex flex-wrap gap-2 text-sm text-slate-300">
                                <span>Posição {alocacao.posicao_ordem}</span>
                                <span>•</span>
                                <span>{alocacao.prioridade_alocacao}</span>
                              {alocacao.cor_descricao && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-blue-300">{alocacao.cor_descricao}</span>
                                  </>
                                )}
                                {alocacao.ciclos_calculados && (
                                  <>
                                    <span>•</span>
                                    <span>{alocacao.ciclos_calculados.toLocaleString()} ciclos</span>
                                  </>
                                )}
                                {alocacao.duracao_calculada_segundos && (
                                  <>
                                    <span>•</span>
                                    <span>{Math.ceil(alocacao.duracao_calculada_segundos / 60)} min</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Status */}
                            <div className="flex items-center gap-2">
                              <div className="px-3 py-1 bg-green-500/30 border border-green-400/50 text-green-300 rounded font-semibold text-xs">
                                Disponível
                              </div>
                              <span className="text-xl text-slate-500 group-hover:text-blue-400 transition-colors">→</span>
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
                    <div className="bg-orange-500/20 backdrop-blur-sm rounded-lg p-4 border border-orange-400/50 shadow-lg">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-orange-300 mb-1">Produção Ativa Detectada</h3>
                          <p className="text-orange-200 text-sm mb-3">
                            {temProducaoAtiva 
                              ? 'Há talões em produção neste mapa. Finalize-os antes de iniciar nova produção.'
                              : 'Há talões finalizados. Para iniciar nova produção, você precisa finalizar completamente a produção atual.'
                            }
                          </p>
                          <button
                            onClick={handleFinalizarProducaoAtiva}
                            disabled={loading}
                            className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 text-sm"
                          >
                            <span>Finalizar Produção Ativa</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}


              {/* Header da Estação - SOLTO (sem card envolvente) */}
              {selectedMapa.estacoes.length > 0 && (
                <div className="mb-6">
                    {/* Indicador da Estação Atual */}
                  <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-3xl shadow-xl border-2 border-blue-400/30 relative">
                        {selectedMapa.estacoes[currentStationIndex].numero_estacao}
                      {(() => {
                        const estacaoAtualNumero = selectedMapa.estacoes[currentStationIndex].numero_estacao;
                        const taloesSelecionadosNestaEstacao = selectedTaloes.filter(
                          t => t.estacao_numero === estacaoAtualNumero
                        ).length;
                        
                        if (taloesSelecionadosNestaEstacao > 0) {
                          return (
                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                              <span className="text-white text-sm font-black">{taloesSelecionadosNestaEstacao}</span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      </div>
                      <div>
                      <h3 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">
                          Estação {selectedMapa.estacoes[currentStationIndex].numero_estacao}
                        </h3>
                      <p className="text-slate-300 text-sm font-medium">
                          {selectedMapa.estacoes[currentStationIndex].taloes.length} produto(s) disponível(eis)
                        {(() => {
                          const estacaoAtualNumero = selectedMapa.estacoes[currentStationIndex].numero_estacao;
                          const taloesSelecionadosNestaEstacao = selectedTaloes.filter(
                            t => t.estacao_numero === estacaoAtualNumero
                          ).length;
                          
                          if (taloesSelecionadosNestaEstacao > 0) {
                            return (
                              <span className="ml-2 text-green-400 font-bold">
                                • {taloesSelecionadosNestaEstacao} selecionado(s)
                              </span>
                            );
                          }
                          return null;
                        })()}
                        </p>
                      </div>
                    </div>
                    
                  {/* Cards Flutuantes de Produtos - ROW HORIZONTAL */}
                  <div className="space-y-4">
                    {selectedMapa.estacoes[currentStationIndex].taloes.map(talao => {
                      const isSelected = selectedTaloes.some(t => t.id_talao === talao.id);
                      const isIniciada = talao.iniciada === true;
                      const isConcluidaTotal = talao.concluida_total === true;
                      const isConcluidaParcial = talao.concluida_parcial === true && !isConcluidaTotal;
                      const isFinalizada = isConcluidaTotal || isConcluidaParcial;
                      const isAlocadoOutraMaquina = isIniciada && talao.id_maquina && talao.id_maquina !== machineId;
                      const isDisabled = isConcluidaTotal || isAlocadoOutraMaquina;
                      
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
                          className={`relative rounded-2xl overflow-hidden backdrop-blur-sm transition-all duration-200 transform hover:-translate-y-1 ${
                            isConcluidaTotal
                              ? 'bg-slate-700/60 border border-slate-500 opacity-60 cursor-not-allowed shadow-lg'
                              : isConcluidaParcial
                              ? 'bg-yellow-600/30 border border-yellow-500/60 cursor-default shadow-lg shadow-yellow-500/20'
                              : isAlocadoOutraMaquina
                              ? 'bg-yellow-600/30 border border-yellow-500/60 opacity-75 cursor-not-allowed shadow-lg shadow-yellow-500/20'
                              : isSelected
                              ? 'bg-gradient-to-r from-green-500/30 to-emerald-600/30 border-2 border-green-500 shadow-2xl shadow-green-500/50 cursor-pointer ring-2 ring-green-400/30'
                              : isIniciada
                              ? 'bg-blue-600/30 border border-blue-500/60 hover:border-blue-400 cursor-pointer shadow-xl shadow-blue-500/30'
                              : 'bg-slate-700/60 border border-slate-500 hover:border-blue-500 cursor-pointer shadow-xl hover:shadow-2xl hover:shadow-blue-500/20'
                          }`}
                        >
                          {/* Card Flutuante - ROW HORIZONTAL */}
                          <div className="p-6">
                            <div className="flex items-center gap-6">
                              {/* Checkbox Grande */}
                              <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center flex-shrink-0 shadow-md ${
                                isSelected
                                  ? 'border-green-400 bg-green-500'
                                  : isIniciada
                                  ? 'border-blue-400 bg-blue-500'
                                  : 'border-slate-400 bg-slate-700/50'
                              }`}>
                                {isSelected && <CheckCircle2 className="w-6 h-6 text-white" />}
                              </div>
                              
                              {/* Referência e Tamanho */}
                              <div className="flex items-center gap-3">
                                <span className="text-white font-bold text-xl">{talao.talao_referencia}</span>
                                <div className="px-5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-md">
                                  <span className="text-white font-black text-3xl">{talao.talao_tamanho}</span>
                                </div>
                              </div>

                              {/* Informações em Linha */}
                              <div className="flex items-center gap-6 flex-1">
                                {/* Cor */}
                                {(talao as any).descricao_cor && (
                                  <div>
                                    <p className="text-slate-400 text-xs mb-1">Cor</p>
                                    <p className="text-white font-semibold text-sm">{(talao as any).descricao_cor}</p>
                                  </div>
                                )}
                                
                                {/* Quantidade */}
                                <div>
                                  <p className="text-slate-400 text-xs mb-1">Quantidade</p>
                                  <p className="text-white font-bold text-lg">
                                    {talao.quantidade.toLocaleString()} pçs
                                    {talao.quantidade_produzida !== undefined && talao.quantidade_produzida > 0 && (
                                      <span className="text-green-400 text-sm ml-1">
                                        ({talao.quantidade_produzida})
                                      </span>
                                    )}
                                  </p>
                                </div>
                                
                                {/* Ciclo */}
                                <div>
                                  <p className="text-slate-400 text-xs mb-1">Tempo Ciclo</p>
                                  <p className="text-white font-semibold text-base flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {talao.tempo_ciclo_segundos}s
                                  </p>
                                </div>
                                
                                {/* Tempo Total */}
                                <div>
                                  <p className="text-slate-400 text-xs mb-1">Tempo Total</p>
                                  <p className="text-white font-semibold text-base">
                                    {Math.ceil((talao.tempo_ciclo_segundos * talao.quantidade) / 60)} min
                                  </p>
                                </div>
                                
                                {/* Matriz (se houver) */}
                                {(talao as any).id_matriz && (
                                  <div>
                                    <p className="text-slate-400 text-xs mb-1">Matriz</p>
                                    <p className="text-white font-medium text-sm">
                                      #{(talao as any).id_matriz}
                                      {(talao as any).matriz_multi_tamanhos && (
                                        <span className="text-cyan-400 text-xs ml-1">(Multi)</span>
                                      )}
                                    </p>
                                  </div>
                                )}
                                
                                {/* Rejeitos (se houver) */}
                                {talao.rejeitos !== undefined && talao.rejeitos > 0 && (
                                  <div>
                                    <p className="text-red-400 text-xs mb-1">Rejeitos</p>
                                    <p className="text-red-300 font-bold text-base">{talao.rejeitos}</p>
                                  </div>
                                )}
                              </div>

                              {/* Badge de Status */}
                              <div className="flex-shrink-0">
                                <div className={`px-4 py-2 rounded-lg font-bold text-sm uppercase shadow-lg ${
                                  isConcluidaTotal
                                    ? 'bg-slate-600 text-white'
                                    : isConcluidaParcial
                                    ? 'bg-yellow-500 text-white'
                                    : isAlocadoOutraMaquina
                                    ? 'bg-yellow-500 text-white'
                                    : isSelected
                                    ? 'bg-green-500 text-white'
                                    : isIniciada
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-600 text-slate-300'
                                }`}>
                                  {isConcluidaTotal && 'Finalizado'}
                                  {isConcluidaParcial && 'Parcial'}
                                  {isAlocadoOutraMaquina && `Máq. ${talao.id_maquina}`}
                                  {!isFinalizada && !isAlocadoOutraMaquina && isSelected && 'Selecionado'}
                                  {!isFinalizada && !isAlocadoOutraMaquina && isIniciada && !isSelected && 'Em Produção'}
                                  {!isFinalizada && !isAlocadoOutraMaquina && !isIniciada && !isSelected && 'Disponível'}
                                </div>
                              </div>

                              {/* Botões de Ação (se aplicável) */}
                              {((talao.concluida_parcial && !talao.concluida_total) || 
                                (!isFinalizada && !isAlocadoOutraMaquina && isIniciada && talao.id_maquina === machineId)) && (
                                <div className="flex gap-2 flex-shrink-0">
                                  {talao.concluida_parcial && !talao.concluida_total && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRetomarTalao(talao, selectedMapa.estacoes[currentStationIndex].numero_estacao);
                                      }}
                                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-semibold transition-all shadow-md"
                                    >
                                      ▶ Retomar
                                    </button>
                                  )}
                                  {!isFinalizada && !isAlocadoOutraMaquina && isIniciada && talao.id_maquina === machineId && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleFinishTalao(talao, selectedMapa.estacoes[currentStationIndex].numero_estacao);
                                      }}
                                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-semibold transition-all shadow-md"
                                    >
                                      🏁 Finalizar
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
            </div>
          </div>
          
          {/* Coluna Direita - Navegação Próxima (BARRA GRANDE) */}
          {step === 'detalhes' && selectedMapa && selectedMapa.estacoes.length > 1 && (
            <button
              onClick={() => setCurrentStationIndex(i => Math.min(selectedMapa.estacoes.length - 1, i + 1))}
              disabled={currentStationIndex === selectedMapa.estacoes.length - 1}
              className="w-32 bg-gradient-to-l from-blue-600/40 via-blue-600/20 to-transparent hover:from-blue-600/60 disabled:from-slate-700/20 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center group border-l border-slate-700"
              aria-label="Próxima estação"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="text-white text-7xl font-black group-hover:scale-125 group-disabled:opacity-30 transition-all duration-300">→</div>
                <span className="text-white text-sm font-bold uppercase tracking-widest rotate-90 transform origin-center whitespace-nowrap group-disabled:opacity-30">Próxima</span>
              </div>
            </button>
          )}
        </div>

        {/* Footer - FIXO na Parte Inferior (Sempre Visível) */}
        <div className="bg-slate-800 border-t-2 border-slate-700 shadow-2xl flex-shrink-0">
          {/* Tabela de Resumo - Acima dos Botões */}
          {step === 'detalhes' && selectedTaloes.length > 0 && (() => {
            // Agrupar talões por estação
            const taloesPorEstacao = selectedTaloes.reduce((acc, talao) => {
              const estacao = talao.estacao_numero;
              if (!acc[estacao]) {
                acc[estacao] = [];
              }
              acc[estacao].push(talao);
              return acc;
            }, {} as Record<number, typeof selectedTaloes>);
            
            const estacoesOrdenadas = Object.keys(taloesPorEstacao)
              .map(Number)
              .sort((a, b) => a - b);
                        
                        return (
              <div className="border-b border-slate-700">
                {/* Título da Seção */}
                <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-600">
                  <h4 className="text-white font-bold text-sm uppercase tracking-wide">
                    📋 Talões Alocados
                  </h4>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-700/50 border-b border-slate-600">
                        <th className="px-4 py-2 text-left text-slate-400 font-semibold uppercase tracking-wide text-[10px] w-24">
                          Info
                        </th>
                        {estacoesOrdenadas.map(estacao => (
                          <th 
                            key={estacao} 
                            className="px-4 py-2 text-center text-white font-semibold border-l border-slate-600 min-w-[140px]"
                          >
                            <span className="text-sm">Estação {estacao}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {/* Linha: Referência + Tamanho */}
                      <tr className="hover:bg-slate-700/30">
                        <td className="px-4 py-2 text-slate-400 font-semibold text-xs uppercase">
                          Produto
                        </td>
                        {estacoesOrdenadas.map(estacao => (
                          <td key={estacao} className="px-4 py-2 text-center border-l border-slate-700/50">
                            <div className="space-y-1.5">
                              {taloesPorEstacao[estacao].map((talao) => (
                                <div key={talao.id_talao} className="flex items-center justify-center gap-2">
                                  <span className="text-slate-200 font-semibold text-sm">{talao.talao_referencia}</span>
                                  <span className="px-2 py-1 bg-blue-600 text-white font-bold rounded text-base">
                                    {talao.talao_tamanho}
                                    </span>
                                </div>
                              ))}
                                </div>
                          </td>
                        ))}
                      </tr>
                      
                      {/* Linha: Quantidade */}
                      <tr className="hover:bg-slate-700/30">
                        <td className="px-4 py-2 text-slate-400 font-semibold text-xs uppercase">
                          Quantidade
                        </td>
                        {estacoesOrdenadas.map(estacao => (
                          <td key={estacao} className="px-4 py-2 text-center border-l border-slate-700/50">
                            <div className="space-y-1.5">
                              {taloesPorEstacao[estacao].map((talao) => (
                                <span 
                                  key={talao.id_talao}
                                  className="text-white font-bold text-sm block"
                                >
                                  {talao.quantidade.toLocaleString()} pçs
                                    </span>
                              ))}
                                  </div>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                            </div>
                          </div>
                        );
          })()}

            {/* Botões de Ação */}
          <div className="px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex gap-3">
              {step === 'detalhes' && (
                <button
                  onClick={() => setStep('mapas')}
                    className="px-6 py-2.5 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-all duration-200 font-semibold border border-slate-600 active:scale-95"
                >
                  ← Voltar
                </button>
              )}
              
              <button
                onClick={handleClose}
                  className="px-6 py-2.5 text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded-lg transition-all duration-200 font-semibold border border-slate-600 active:scale-95"
              >
                  Cancelar
              </button>
              </div>

              {step === 'detalhes' && selectedTaloes.length > 0 && (
                <button
                  onClick={handleStartProduction}
                  disabled={loading}
                  className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold shadow-lg hover:shadow-xl disabled:opacity-50 transition-all duration-200 active:scale-95 flex items-center gap-2 disabled:cursor-not-allowed"
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
  );
}); // ✅ Fechar React.memo
