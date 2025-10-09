import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  AlertTriangle,
  Package,
  RefreshCw,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  PlayCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { MapaProducaoCompleto, TalaoComMapa } from '../types/mapa_producao';
import { webSocketManager, WebSocketCommands } from '../hooks/useWebSocketManager';

interface ProductionCommandsPageProps {
  machineId: number;
  sessionId: number | null;
  operadorId: number;
  onBack: () => void;
}

interface EstacaoFisica {
  maquina_id: number;
  numero_estacao: number;
  nome: string;
  lado: 'esquerda' | 'direita';
  talaoAlocado: {
  id: number;
    talao_referencia: string;
    talao_tamanho: string;
    mapa_codmapa: string;
    mapa_cor: string | null;
    mapa_prioridade: string;
  quantidade: number;
  quantidade_produzida: number;
    tempo_ciclo_segundos: number | null;
  } | null;
}

interface TalaoComInfo extends TalaoComMapa {
  estacao_mapa_numero: number;
  lado_recomendado: 'esquerda' | 'direita';
  estacao_nome: string;
}

interface MapaAgrupado {
  codmapa: string;
  prioridade: string;
  cor: string | null;
  taloesEsquerda: TalaoComInfo[];
  taloesDireita: TalaoComInfo[];
  totalQuantidade: number;
}

export function ProductionCommandsPage({ 
  machineId, 
  sessionId, 
  operadorId, 
  onBack 
}: ProductionCommandsPageProps) {
  const [mapas, setMapas] = useState<MapaProducaoCompleto[]>([]);
  const [estacoesEsquerda, setEstacoesEsquerda] = useState<EstacaoFisica[]>([]);
  const [estacoesDireita, setEstacoesDireita] = useState<EstacaoFisica[]>([]);
  const [taloesPendentes, setTaloesPendentes] = useState<TalaoComInfo[]>([]);
  const [mapasAgrupados, setMapasAgrupados] = useState<MapaAgrupado[]>([]);
  const [mapaExpandido, setMapaExpandido] = useState<string | null>(null);
  // Map de talões selecionados: numero_estacao -> talao
  const [taloesSelecionados, setTaloesSelecionados] = useState<Map<number, TalaoComInfo>>(new Map());
  const [showDrawer, setShowDrawer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [websocketProgress, setWebsocketProgress] = useState<{current: number, total: number} | null>(null);

  // Buscar máquinas filhas (estações físicas)
  const fetchEstacoesFisicas = async () => {
    try {
      const { data, error } = await supabase
        .from('Maquinas')
        .select('id_maquina, nome, numero_estacao')
        .eq('maquina_pai', machineId)
        .eq('desativada', false)
        .order('numero_estacao', { ascending: true });

      if (error) throw error;

      const esquerda: EstacaoFisica[] = [];
      const direita: EstacaoFisica[] = [];

      (data || []).forEach(maq => {
        const estacao: EstacaoFisica = {
          maquina_id: maq.id_maquina,
          numero_estacao: maq.numero_estacao || 1,
          nome: maq.nome || `Estação ${maq.numero_estacao}`,
          lado: maq.numero_estacao <= 8 ? 'esquerda' : 'direita',
          talaoAlocado: null
        };

        if (estacao.lado === 'esquerda') {
          esquerda.push(estacao);
        } else {
          direita.push(estacao);
        }
      });

      // Suporte a máquinas simples (sem estações filhas): criar estação virtual
      if (esquerda.length === 0 && direita.length === 0) {
        esquerda.push({
          maquina_id: machineId,
          numero_estacao: 1,
          nome: 'Estação Única',
          lado: 'esquerda',
          talaoAlocado: null
        });
      }

      setEstacoesEsquerda(esquerda);
      setEstacoesDireita(direita);
    } catch (err) {
      console.error('Erro ao buscar estações físicas:', err);
    }
  };

  // Buscar mapas de produção ativos
  const fetchMapasProducao = async () => {
    if (!machineId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: alocacoes, error: alocacoesError } = await supabase
        .from('mapas_alocados_maquina')
        .select('*')
        .eq('maquina_id', machineId)
        .eq('concluido', false)
        .order('posicao_ordem', { ascending: true });

      if (alocacoesError) throw alocacoesError;

      if (!alocacoes || alocacoes.length === 0) {
        setMapas([]);
        setTaloesPendentes([]);
        setMapasAgrupados([]);
        return;
      }

      const mapasPromises = alocacoes.map(async (alocacao) => {
        const { data: mapa, error: mapaError } = await supabase
          .from('mapa_producao')
          .select('*')
          .eq('id', alocacao.mapa_producao_id)
          .single();

        if (mapaError) throw mapaError;

        const { data: estacoes, error: estacoesError } = await supabase
          .from('estacoes_mapa')
          .select('*')
          .eq('mapa_producao_id', mapa.id)
          .eq('ativa', true)
          .order('posicao_ordem', { ascending: true });

        if (estacoesError) throw estacoesError;

        const estacoesComTaloes = await Promise.all(
          (estacoes || []).map(async (estacao) => {
            const { data: taloes, error: taloesError } = await supabase
              .from('taloes_estacao')
              .select('*')
              .eq('estacao_mapa_id', estacao.id)
              .order('posicao_ordem', { ascending: true});

            if (taloesError) throw taloesError;

            return {
              ...estacao,
              taloes: taloes || []
            };
          })
        );

        return {
          ...mapa,
          estacoes: estacoesComTaloes,
          alocacao
        };
      });

      const mapasData = await Promise.all(mapasPromises);
      setMapas(mapasData);

      const pendentes: TalaoComInfo[] = [];
      mapasData.forEach(mapa => {
        mapa.estacoes.forEach(estacao => {
          estacao.taloes.forEach(talao => {
            const estacaoFisica = [...estacoesEsquerda, ...estacoesDireita].find(
              e => e.numero_estacao === estacao.numero_estacao
            );
            
            pendentes.push({
              ...talao,
              mapa_codmapa: mapa.codmapa,
              mapa_cor: mapa.cor_descricao,
              mapa_prioridade: mapa.prioridade,
              estacao_numero: estacao.numero_estacao,
              estacao_mapa_numero: estacao.numero_estacao,
              lado_recomendado: estacao.numero_estacao <= 8 ? 'esquerda' : 'direita',
              estacao_nome: estacaoFisica?.nome || `Estação ${estacao.numero_estacao}`
            });
          });
        });
      });
      setTaloesPendentes(pendentes);

      const grupos = new Map<string, MapaAgrupado>();
      
      pendentes.forEach(talao => {
        if (!grupos.has(talao.mapa_codmapa)) {
          grupos.set(talao.mapa_codmapa, {
            codmapa: talao.mapa_codmapa,
            prioridade: talao.mapa_prioridade,
            cor: talao.mapa_cor,
            taloesEsquerda: [],
            taloesDireita: [],
            totalQuantidade: 0
          });
        }
        const grupo = grupos.get(talao.mapa_codmapa)!;
        
        if (talao.lado_recomendado === 'esquerda') {
          grupo.taloesEsquerda.push(talao);
        } else {
          grupo.taloesDireita.push(talao);
        }
        grupo.totalQuantidade += talao.quantidade;
      });

      setMapasAgrupados(Array.from(grupos.values()));
      setMapaExpandido(null);

    } catch (err) {
      console.error('Erro ao buscar mapas de produção:', err);
      setError('Erro ao carregar mapas de produção');
    } finally {
      setLoading(false);
    }
  };

  // Buscar alocações atuais
  const fetchAlocacoes = async () => {
    if (!machineId) return;
    
    try {
      const maquinasIds = [...estacoesEsquerda, ...estacoesDireita].map(e => e.maquina_id);
      if (maquinasIds.length === 0) return;

      const { data, error } = await supabase
        .from('producao_talao_mapa')
        .select(`
          id,
          id_maquina,
          qt_produzir,
          sinais_validos,
          tempo_produto,
          taloes_estacao!producao_talao_mapa_id_talao_estacao_fkey (
            id,
            talao_referencia,
            talao_tamanho,
            tempo_ciclo_segundos,
            estacoes_mapa (
            numero_estacao,
              mapa_producao (
                codmapa,
                cor_descricao,
                prioridade
              )
            )
          )
        `)
        .in('id_maquina', maquinasIds)
        .is('fim', null);

      if (error) throw error;

      const atualizarEstacao = (estacao: EstacaoFisica) => {
        const alocacao = data?.find(a => a.id_maquina === estacao.maquina_id);
        
        if (alocacao && alocacao.taloes_estacao) {
          const talao = alocacao.taloes_estacao;
          const estacaoMapa = (talao as any).estacoes_mapa;
          const mapa = estacaoMapa?.mapa_producao;
          
          return {
            ...estacao,
            talaoAlocado: {
              id: alocacao.id,
              talao_referencia: talao.talao_referencia,
              talao_tamanho: talao.talao_tamanho,
              mapa_codmapa: mapa?.codmapa || '',
              mapa_cor: mapa?.cor_descricao || null,
              mapa_prioridade: mapa?.prioridade || 'media',
              quantidade: alocacao.qt_produzir || 0,
              quantidade_produzida: alocacao.sinais_validos || 0,
              tempo_ciclo_segundos: talao.tempo_ciclo_segundos
            }
          };
        }
        
        return estacao;
      };

      setEstacoesEsquerda(prev => prev.map(atualizarEstacao));
      setEstacoesDireita(prev => prev.map(atualizarEstacao));

      const taloesAlocadosIds = data?.map(a => a.id_talao_estacao) || [];
      const pendentesAtualizados = taloesPendentes.filter(t => !taloesAlocadosIds.includes(t.id));
      
      const grupos = new Map<string, MapaAgrupado>();
      pendentesAtualizados.forEach(talao => {
        const estacaoFisica = [...estacoesEsquerda, ...estacoesDireita].find(
          e => e.numero_estacao === talao.estacao_mapa_numero
        );
        const talaoAtualizado = {
          ...talao,
          estacao_nome: estacaoFisica?.nome || talao.estacao_nome
        };
        
        if (!grupos.has(talao.mapa_codmapa)) {
          grupos.set(talao.mapa_codmapa, {
            codmapa: talao.mapa_codmapa,
            prioridade: talao.mapa_prioridade,
            cor: talao.mapa_cor,
            taloesEsquerda: [],
            taloesDireita: [],
            totalQuantidade: 0
          });
        }
        const grupo = grupos.get(talao.mapa_codmapa)!;
        
        if (talao.lado_recomendado === 'esquerda') {
          grupo.taloesEsquerda.push(talaoAtualizado);
        } else {
          grupo.taloesDireita.push(talaoAtualizado);
        }
        grupo.totalQuantidade += talao.quantidade;
      });

      setMapasAgrupados(Array.from(grupos.values()));

    } catch (err) {
      console.error('Erro ao buscar alocações:', err);
    }
  };

  useEffect(() => {
    fetchEstacoesFisicas();
  }, [machineId]);

  useEffect(() => {
    // Sempre buscar mapas (inclui suporte a estação virtual para máquinas simples)
    fetchMapasProducao();
  }, [machineId, estacoesEsquerda.length, estacoesDireita.length]);

  useEffect(() => {
    if (mapas.length > 0) {
      fetchAlocacoes();
    }
  }, [mapas]);

  // Iniciar produção de múltiplos talões
  const handleIniciarProducao = async () => {
    if (taloesSelecionados.size === 0) return;
    
    setActionLoading('iniciar');
    setError(null);

    try {
      const now = Math.floor(Date.now() / 1000);
      const registros = [];
      const comandosWebSocket = [];

      // Preparar todos os registros e comandos WebSocket
      for (const [numeroEstacao, talao] of taloesSelecionados.entries()) {
        const mapaAtual = mapas.find(m => m.codmapa === talao.mapa_codmapa);
        if (!mapaAtual) continue;

        const estacao = [...estacoesEsquerda, ...estacoesDireita].find(
          e => e.numero_estacao === numeroEstacao
        );
        if (!estacao) continue;

        // Preparar registro para o banco
        registros.push({
          id_talao_estacao: talao.id,
          id_maquina: estacao.maquina_id,
          id_mapa: mapaAtual.id,
          qt_produzir: talao.quantidade,
          tempo_produto: talao.tempo_ciclo_segundos,
          inicio: now,
          sinais: 0,
          rejeitos: 0,
          sinais_validos: 0,
          saldo_a_produzir: talao.quantidade
        });

        // Buscar ID do produto do talão
        console.log('🔍 Dados do talão para comando WebSocket:', {
          talao_id: talao.id,
          talao_referencia: talao.talao_referencia,
          talao_tamanho: talao.talao_tamanho,
          id_produto: talao.id_produto,
          id_cor: talao.id_cor,
          id_matriz: talao.id_matriz,
          quantidade: talao.quantidade
        });

        // Se não temos id_produto, buscar na tabela de produtos usando a referência
        let produtoId = talao.id_produto;
        
        if (!produtoId || produtoId === 0) {
          try {
            console.log('🔍 Buscando ID do produto para:', talao.talao_referencia);
            const { data: produtoData, error: produtoError } = await supabase
              .from('produtos')
              .select('id')
              .eq('referencia', talao.talao_referencia)
              .single();
            
            if (produtoError) {
              console.warn('⚠️ Erro ao buscar produto:', produtoError);
            } else if (produtoData) {
              produtoId = produtoData.id;
              console.log('✅ ID do produto encontrado:', produtoId);
            }
          } catch (err) {
            console.error('❌ Erro ao buscar ID do produto:', err);
          }
        }

        // Se ainda não temos produtoId, usar o ID do talão como fallback
        if (!produtoId || produtoId === 0) {
          produtoId = talao.id;
          console.warn('⚠️ Usando ID do talão como fallback para produto:', produtoId);
        }

        // Validar se temos um produtoId válido
        if (produtoId && produtoId > 0) {
          // Preparar comando WebSocket
          const comandoWebSocket = WebSocketCommands.iniciarProducaoMapa(
            estacao.maquina_id, // id_maquina (máquina filha da estação)
            mapaAtual.id,       // id_mapa
            produtoId,          // id_produto (agora com valor válido)
            {
              itemMapaId: talao.id, // id_item_mapa
              corId: talao.id_cor || undefined, // id_cor (opcional)
              matrizId: talao.id_matriz || undefined, // id_matriz (opcional)
              qtProduzir: talao.quantidade // qt_produzir
            }
          );
          
          comandosWebSocket.push(comandoWebSocket);
          console.log('✅ Comando WebSocket preparado para talão:', talao.talao_referencia, 'com produtoId:', produtoId);
        } else {
          console.error('❌ Não foi possível determinar produtoId válido para talão:', talao.talao_referencia);
          throw new Error(`ProdutoId inválido para talão ${talao.talao_referencia}`);
        }
      }

      // 1. Inserir registros no banco
      const { error: insertError } = await supabase
        .from('producao_talao_mapa')
        .insert(registros);

      if (insertError) throw insertError;

      // 2. Enviar comandos WebSocket um por vez
      console.log(`📤 Enviando ${comandosWebSocket.length} comandos WebSocket para iniciar produção...`);
      setWebsocketProgress({ current: 0, total: comandosWebSocket.length });
      
      for (let i = 0; i < comandosWebSocket.length; i++) {
        const comando = comandosWebSocket[i];
        console.log(`📤 Enviando comando ${i + 1}/${comandosWebSocket.length}:`, comando);
        
        setWebsocketProgress({ current: i + 1, total: comandosWebSocket.length });
        
        const sucesso = webSocketManager.sendCommand(comando);
        if (!sucesso) {
          console.warn(`⚠️ Falha ao enviar comando ${i + 1} para máquina ${comando.id_maquina}`);
        }
        
        // Pequeno delay entre comandos para não sobrecarregar
        if (i < comandosWebSocket.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setWebsocketProgress(null);
      console.log('✅ Todos os comandos WebSocket foram enviados');

      // 3. Atualizar interface
      await fetchAlocacoes();
      setTaloesSelecionados(new Map());
      
    } catch (err) {
      console.error('Erro ao iniciar produção:', err);
      setError(err instanceof Error ? err.message : 'Erro ao iniciar produção');
    } finally {
      setActionLoading(null);
      setWebsocketProgress(null);
    }
  };

  // Remover alocação
  const handleRemoverAlocacao = async (producaoId: number) => {
    setActionLoading(`remover-${producaoId}`);
    setError(null);

    try {
      const now = Math.floor(Date.now() / 1000);
      
      const { error } = await supabase
        .from('producao_talao_mapa')
        .update({ fim: now })
        .eq('id', producaoId);

      if (error) throw error;

      await fetchAlocacoes();
      await fetchMapasProducao();
      
    } catch (err) {
      console.error('Erro ao remover alocação:', err);
      setError('Erro ao remover alocação');
    } finally {
      setActionLoading(null);
    }
  };

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente': return 'bg-red-600 text-white';
      case 'alta': return 'bg-orange-500 text-white';
      case 'media': return 'bg-yellow-500 text-black';
      case 'baixa': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // Verificar se estação está ocupada
  const isEstacaoOcupada = (numeroEstacao: number) => {
    const todasEstacoes = [...estacoesEsquerda, ...estacoesDireita];
    const estacao = todasEstacoes.find(e => e.numero_estacao === numeroEstacao);
    return estacao?.talaoAlocado !== null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-7 h-7 text-white" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">🏭 Alocar Produção</h1>
              <p className="text-lg text-blue-200">Alocação de talões nas estações</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowDrawer(true)}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg
                        transition-all font-bold text-lg flex items-center gap-2 shadow-lg"
            >
              <Layers className="w-6 h-6" />
              Ver Estações
            </button>
            <button
              onClick={() => { 
                fetchEstacoesFisicas();
                fetchMapasProducao(); 
                fetchAlocacoes(); 
              }}
              disabled={loading}
              className="p-3 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Atualizar"
            >
              <RefreshCw className={`w-7 h-7 text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-[1920px] mx-auto">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500/20 border-2 border-red-400/50 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-7 h-7 text-red-400" />
              <span className="text-red-200 text-xl font-semibold">{error}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
          </div>
        ) : (
          <>
            {/* Mapas de Produção */}
            <div className="bg-white/95 rounded-2xl shadow-2xl overflow-hidden mb-8">
              <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white">📋 Mapas de Produção</h2>
                    <p className="text-slate-200 text-lg mt-1">
                      {taloesSelecionados.size > 0
                        ? `${taloesSelecionados.size} ${taloesSelecionados.size === 1 ? 'estação configurada' : 'estações configuradas'} - Clique em Iniciar para alocar`
                        : 'Selecione UM produto por estação usando os botões de seleção'}
                    </p>
                      </div>
                  {mapasAgrupados.length > 0 && (
                    <div className="bg-white/20 rounded-full px-6 py-3">
                      <span className="text-white font-bold text-2xl">{mapasAgrupados.length}</span>
                      <span className="text-slate-200 text-lg ml-2">mapas</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {mapasAgrupados.length === 0 ? (
                  <div className="text-center py-12">
                    <Check className="w-20 h-20 mx-auto mb-4 text-green-600" />
                    <p className="text-gray-600 text-2xl font-bold">Todos os talões foram alocados!</p>
                    <p className="text-gray-500 text-lg mt-2">Excelente trabalho! 🎉</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {mapasAgrupados.map((grupo) => {
                      const isExpanded = mapaExpandido === grupo.codmapa;
                      const totalTaloes = grupo.taloesEsquerda.length + grupo.taloesDireita.length;
                      
                      // Contar produtos únicos e tamanhos
                      const produtosUnicos = new Map<string, Set<string>>();
                      [...grupo.taloesEsquerda, ...grupo.taloesDireita].forEach(talao => {
                        if (!produtosUnicos.has(talao.talao_referencia)) {
                          produtosUnicos.set(talao.talao_referencia, new Set());
                        }
                        produtosUnicos.get(talao.talao_referencia)!.add(talao.talao_tamanho);
                      });
                      const qtdProdutos = produtosUnicos.size;
                      const qtdTamanhos = totalTaloes;
                      
                      return (
                        <div key={grupo.codmapa} className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden">
                          {/* Header do Mapa */}
                          <button
                            onClick={() => setMapaExpandido(isExpanded ? null : grupo.codmapa)}
                            className="w-full bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 
                                     transition-colors p-6"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="bg-slate-700 rounded-lg p-3">
                                  {isExpanded ? (
                                    <ChevronUp className="w-8 h-8 text-white" />
                                  ) : (
                                    <ChevronDown className="w-8 h-8 text-white" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-3xl font-bold text-gray-900">{grupo.codmapa}</h3>
                                    {grupo.cor && (
                                      <span className="bg-slate-200 text-slate-900 px-4 py-2 rounded-full text-xl font-bold">
                                        🎨 {grupo.cor}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-600 text-xl font-medium">
                                    {qtdProdutos} {qtdProdutos === 1 ? 'produto' : 'produtos'} • {qtdTamanhos} {qtdTamanhos === 1 ? 'tamanho' : 'tamanhos'} • {grupo.totalQuantidade} peças no total
                                  </p>
                    </div>
                    </div>
                              <div className="text-right">
                                <span className="text-gray-500 text-xl font-medium">
                                  {isExpanded ? 'Clique para fechar' : 'Clique para ver detalhes'}
                                </span>
                    </div>
                  </div>

                            {/* Lista de Produtos */}
                            {!isExpanded && (
                              <div className="mt-4 pt-4 border-t border-slate-200">
                                <div className="text-left">
                                  <h4 className="text-gray-700 font-bold text-lg mb-2 flex items-center gap-2">
                                    📦 Produtos:
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {Array.from(produtosUnicos.entries()).map(([ref, tamanhos]) => (
                                      <div key={ref} className="bg-white border-2 border-slate-300 rounded-lg px-3 py-2">
                                        <div className="font-bold text-gray-900 text-lg">{ref}</div>
                                        <div className="text-gray-600 text-sm">
                                          Tam: {Array.from(tamanhos).sort((a, b) => parseInt(a) - parseInt(b)).join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                              </div>
                            )}
                          </button>

                          {/* Conteúdo Expandido */}
                          {isExpanded && (
                            <div className="p-6 bg-gray-50">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Tabela Esquerda */}
                                <div>
                                  <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-t-lg p-4 text-center">
                                    <h4 className="text-2xl font-bold text-white">⬅️ Estações Esquerda (1-8)</h4>
                                  </div>
                                  {grupo.taloesEsquerda.length === 0 ? (
                                    <div className="bg-white border-2 border-blue-200 rounded-b-lg text-center py-8">
                                      <Package className="w-12 h-12 mx-auto mb-3 text-blue-300" />
                                      <p className="text-blue-600 text-lg font-medium">Nenhum produto para esquerda</p>
                                    </div>
                                  ) : (
                                    <div className="bg-white border-2 border-blue-300 rounded-b-lg overflow-hidden">
                                      <table className="w-full">
                                        <thead>
                                          <tr className="bg-blue-800 text-white">
                                            <th className="px-4 py-4 text-left text-xl font-bold">Est</th>
                                            <th className="px-4 py-4 text-left text-xl font-bold">Produto</th>
                                            <th className="px-4 py-4 text-center text-xl font-bold">Tam</th>
                                            <th className="px-4 py-4 text-center text-xl font-bold">Qtd</th>
                                            <th className="px-4 py-4 text-center text-xl font-bold">Ação</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {grupo.taloesEsquerda.map((talao, idx) => {
                                            const selecionado = taloesSelecionados.get(talao.estacao_mapa_numero)?.id === talao.id;
                                            const estacaoOcupada = isEstacaoOcupada(talao.estacao_mapa_numero);
                                            
                                            return (
                                              <tr
                                                key={talao.id}
                                                className={`
                                                  transition-all border-b border-blue-100
                                                  ${selecionado
                                                    ? 'bg-green-100 border-l-8 border-l-green-500'
                                                    : idx % 2 === 0 
                                                    ? 'bg-blue-50' 
                                                    : 'bg-white'
                                                  }
                                                `}
                                              >
                                                <td className="px-4 py-5">
                                                  <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                                                      <span className="text-white font-bold text-lg">
                                                        {talao.estacao_mapa_numero <= 8 ? talao.estacao_mapa_numero : talao.estacao_mapa_numero - 8}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </td>
                                                <td className="px-4 py-5">
                                                  <div className="text-gray-900 font-bold text-2xl">{talao.talao_referencia}</div>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500 border-4 border-orange-600">
                                                    <span className="text-white font-bold text-2xl">{talao.talao_tamanho}</span>
                                                  </div>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                  <span className="text-blue-700 font-bold text-2xl">{talao.quantidade}</span>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                  <label className="inline-flex items-center cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      checked={selecionado}
                                                      disabled={estacaoOcupada}
                                                      onChange={(e) => {
                                                        if (estacaoOcupada) return;
                                                        
                                                        const novoMapa = new Map(taloesSelecionados);
                                                        
                                                        if (e.target.checked) {
                                                          // Selecionar este item (substituir o anterior da mesma estação)
                                                          novoMapa.set(talao.estacao_mapa_numero, talao);
                                                        } else {
                                                          // Desmarcar este item
                                                          novoMapa.delete(talao.estacao_mapa_numero);
                                                        }
                                                        setTaloesSelecionados(novoMapa);
                                                      }}
                                                      className="w-6 h-6 text-green-600 rounded focus:ring-2 focus:ring-green-500 disabled:opacity-30"
                                                    />
                                                  </label>
                                                  {estacaoOcupada && (
                                                    <div className="text-xs text-red-600 mt-1 font-semibold">Ocupada</div>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                    </div>
                  )}
                                </div>

                                {/* Tabela Direita */}
                                <div>
                                  <div className="bg-gradient-to-r from-green-500 to-green-700 rounded-t-lg p-4 text-center">
                                    <h4 className="text-2xl font-bold text-white">➡️ Estações Direita (9-16)</h4>
                                  </div>
                                  {grupo.taloesDireita.length === 0 ? (
                                    <div className="bg-white border-2 border-green-200 rounded-b-lg text-center py-8">
                                      <Package className="w-12 h-12 mx-auto mb-3 text-green-300" />
                                      <p className="text-green-600 text-lg font-medium">Nenhum produto para direita</p>
                                    </div>
                                  ) : (
                                    <div className="bg-white border-2 border-green-300 rounded-b-lg overflow-hidden">
                                      <table className="w-full">
                                        <thead>
                                          <tr className="bg-green-800 text-white">
                                            <th className="px-4 py-4 text-left text-xl font-bold">Est</th>
                                            <th className="px-4 py-4 text-left text-xl font-bold">Produto</th>
                                            <th className="px-4 py-4 text-center text-xl font-bold">Tam</th>
                                            <th className="px-4 py-4 text-center text-xl font-bold">Qtd</th>
                                            <th className="px-4 py-4 text-center text-xl font-bold">Ação</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {grupo.taloesDireita.map((talao, idx) => {
                                            const selecionado = taloesSelecionados.get(talao.estacao_mapa_numero)?.id === talao.id;
                                            const estacaoOcupada = isEstacaoOcupada(talao.estacao_mapa_numero);
                                            
                                            return (
                                              <tr
                                                key={talao.id}
                                                className={`
                                                  transition-all border-b border-green-100
                                                  ${selecionado
                                                    ? 'bg-green-100 border-l-8 border-l-green-500'
                                                    : idx % 2 === 0 
                                                    ? 'bg-green-50' 
                                                    : 'bg-white'
                                                  }
                                                `}
                                              >
                                                <td className="px-4 py-5">
                                                  <div className="flex items-center gap-2">
                                                    <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
                                                      <span className="text-white font-bold text-lg">
                                                        {talao.estacao_mapa_numero <= 8 ? talao.estacao_mapa_numero : talao.estacao_mapa_numero - 8}
                                                      </span>
                                                    </div>
                                                  </div>
                                                </td>
                                                <td className="px-4 py-5">
                                                  <div className="text-gray-900 font-bold text-2xl">{talao.talao_referencia}</div>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-500 border-4 border-orange-600">
                                                    <span className="text-white font-bold text-2xl">{talao.talao_tamanho}</span>
                      </div>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                  <span className="text-green-700 font-bold text-2xl">{talao.quantidade}</span>
                                                </td>
                                                <td className="px-4 py-5 text-center">
                                                  <label className="inline-flex items-center cursor-pointer">
                                                    <input
                                                      type="checkbox"
                                                      checked={selecionado}
                                                      disabled={estacaoOcupada}
                                                      onChange={(e) => {
                                                        if (estacaoOcupada) return;
                                                        
                                                        const novoMapa = new Map(taloesSelecionados);
                                                        
                                                        if (e.target.checked) {
                                                          // Selecionar este item (substituir o anterior da mesma estação)
                                                          novoMapa.set(talao.estacao_mapa_numero, talao);
                                                        } else {
                                                          // Desmarcar este item
                                                          novoMapa.delete(talao.estacao_mapa_numero);
                                                        }
                                                        setTaloesSelecionados(novoMapa);
                                                      }}
                                                      className="w-6 h-6 text-green-600 rounded focus:ring-2 focus:ring-green-500 disabled:opacity-30"
                                                    />
                                                  </label>
                                                  {estacaoOcupada && (
                                                    <div className="text-xs text-red-600 mt-1 font-semibold">Ocupada</div>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                    </div>
                  )}
                                </div>
                              </div>

                              {/* Botão Iniciar Produção */}
                              {taloesSelecionados.size > 0 && (
                                <div className="mt-6 bg-green-100 border-4 border-green-500 rounded-xl p-6">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex-1">
                                      <h4 className="text-2xl font-bold text-green-900 mb-3">
                                        ✓ {taloesSelecionados.size} {taloesSelecionados.size === 1 ? 'Produto Selecionado' : 'Produtos Selecionados'}
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {Array.from(taloesSelecionados.values()).map(talao => (
                                          <div key={talao.id} className="bg-white border-2 border-green-400 rounded-lg px-3 py-2">
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <span className="text-green-900 font-bold text-lg">
                                                  Est {talao.estacao_mapa_numero}:
                                                </span>
                                                <span className="text-gray-900 font-semibold text-lg ml-2">
                                                  {talao.talao_referencia} ({talao.talao_tamanho})
                                                </span>
                                              </div>
                                              <button
                                                onClick={() => {
                                                  const novoMapa = new Map(taloesSelecionados);
                                                  novoMapa.delete(talao.estacao_mapa_numero);
                                                  setTaloesSelecionados(novoMapa);
                                                }}
                                                className="text-red-600 hover:text-red-800"
                                              >
                                                <X className="w-5 h-5" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                    <button
                                      onClick={handleIniciarProducao}
                                      disabled={actionLoading === 'iniciar'}
                                      className="ml-6 px-8 py-6 bg-green-600 hover:bg-green-700 text-white rounded-xl
                                                transition-all font-bold text-2xl flex flex-col items-center gap-2
                                                disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:scale-105"
                                    >
                                      <PlayCircle className="w-12 h-12" />
                                      <span>
                                        {actionLoading === 'iniciar' 
                                          ? websocketProgress 
                                            ? `Enviando... ${websocketProgress.current}/${websocketProgress.total}`
                                            : 'Iniciando...'
                                          : 'INICIAR'
                                        }
                                      </span>
                                      <span className="text-sm font-normal">{taloesSelecionados.size} produtos</span>
                                      {websocketProgress && (
                                        <div className="w-full bg-white/20 rounded-full h-2 mt-2">
                                          <div 
                                            className="bg-white rounded-full h-2 transition-all duration-300"
                                            style={{ width: `${(websocketProgress.current / websocketProgress.total) * 100}%` }}
                                          />
                                        </div>
                                      )}
                                    </button>
                      </div>
                    </div>
                  )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
            </div>
          </>
        )}
      </div>

      {/* Drawer de Estações */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-700 to-slate-900 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-bold text-white">🏭 Estações da Máquina</h3>
                <p className="text-slate-200 text-lg mt-1">Status atual de todas as estações</p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-8 h-8 text-white" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Esquerda */}
                <div>
                  <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-t-lg p-4 text-center">
                    <h4 className="text-2xl font-bold text-white">⬅️ Estações Esquerda (1-8)</h4>
                  </div>
                  <div className="space-y-3 p-4 bg-blue-50 rounded-b-lg">
                    {estacoesEsquerda.map(estacao => (
                      <div
                        key={estacao.maquina_id}
                        className={`p-4 rounded-lg border-2 ${
                          estacao.talaoAlocado
                            ? 'bg-blue-100 border-blue-500'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full ${
                              estacao.talaoAlocado ? 'bg-blue-600' : 'bg-gray-400'
                            } flex items-center justify-center`}>
                              <span className="text-white font-bold text-xl">{estacao.numero_estacao}</span>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-lg">{estacao.nome}</div>
                              {estacao.talaoAlocado ? (
                                <div className="text-sm text-gray-700">
                                  {estacao.talaoAlocado.talao_referencia} • Tam: {estacao.talaoAlocado.talao_tamanho}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">Disponível</div>
                              )}
                            </div>
                          </div>
                          {estacao.talaoAlocado && (
                            <button
                              onClick={() => handleRemoverAlocacao(estacao.talaoAlocado!.id)}
                              disabled={actionLoading === `remover-${estacao.talaoAlocado!.id}`}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg
                                        transition-all font-bold flex items-center gap-2
                                        disabled:opacity-50"
                            >
                              <X className="w-5 h-5" />
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direita */}
                <div>
                  <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-t-lg p-4 text-center">
                    <h4 className="text-2xl font-bold text-white">➡️ Estações Direita (9-16)</h4>
                  </div>
                  <div className="space-y-3 p-4 bg-green-50 rounded-b-lg">
                    {estacoesDireita.map(estacao => (
                      <div
                        key={estacao.maquina_id}
                        className={`p-4 rounded-lg border-2 ${
                          estacao.talaoAlocado
                            ? 'bg-green-100 border-green-500'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full ${
                              estacao.talaoAlocado ? 'bg-green-600' : 'bg-gray-400'
                            } flex items-center justify-center`}>
                              <span className="text-white font-bold text-xl">{estacao.numero_estacao}</span>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-lg">{estacao.nome}</div>
                              {estacao.talaoAlocado ? (
                                <div className="text-sm text-gray-700">
                                  {estacao.talaoAlocado.talao_referencia} • Tam: {estacao.talaoAlocado.talao_tamanho}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">Disponível</div>
                              )}
                            </div>
                          </div>
                          {estacao.talaoAlocado && (
                            <button
                              onClick={() => handleRemoverAlocacao(estacao.talaoAlocado!.id)}
                              disabled={actionLoading === `remover-${estacao.talaoAlocado!.id}`}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg
                                        transition-all font-bold flex items-center gap-2
                                        disabled:opacity-50"
                            >
                              <X className="w-5 h-5" />
                              Remover
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
