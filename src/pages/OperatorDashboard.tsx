// 📊 Operator Dashboard com SSE + API REST

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useSSEManager } from '../hooks/useSSEManager';
import { useSounds } from '../hooks/useSounds';
import { SingleMachineViewNew } from '../components/SingleMachineView-new';
import { ChildMachineGrid } from '../components/ChildMachineGrid';
import { Eva16StationsView } from '../components/Eva16StationsView';
import { RotativasStationsView } from '../components/RotativasStationsView';
import { DashboardHeader } from '../components/DashboardHeader';
import { Sidebar } from '../components/Sidebar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { ErrorModal } from '../components/ErrorModal';
import { ProductionCommandsModal } from '../components/ProductionCommandsModal';
import { JustifyStopModal } from '../components/JustifyStopModal';
import { LayoutConfigModal } from '../components/LayoutConfigModal';
import { FinalizarProducoesModal } from '../components/FinalizarProducoesModal'; // ✅ NOVO
import { AlertaSaldoZeroModal } from '../components/AlertaSaldoZeroModal'; // ✅ NOVO
import { apiService } from '../services/apiService';
import { layoutStorage } from '../lib/layoutStorage';
import type { Machine } from '../types/machine';
import type { User } from '@supabase/supabase-js';
import type { TalaoSelecionado } from '../types/production';
import type { ChildMachineProduction } from '../types/production';
import type { StopReason } from '../types/stops';
import type { LayoutType } from '../types/layout';

interface OperatorDashboardProps {
  machine: Machine;
  user: User | null;
  sessionId: number | null;
  onShowSettings: () => void;
  secondaryOperator?: { id: number; nome: string } | null;
  operator?: { id_operador: number; nome: string } | null; // ✅ NOVO: Dados do operador da API REST
}

export function OperatorDashboard({
  machine,
  user,
  sessionId,
  onShowSettings,
  secondaryOperator,
  operator
}: OperatorDashboardProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showProductionCommands, setShowProductionCommands] = useState(false);
  const [storedProduction, setStoredProduction] = useState<{ id_maquina: number; id_mapa: number; taloes: Array<{ id_talao: number; estacao_numero: number; quantidade: number }>; timestamp: number } | null>(null);
  const [localStopJustified, setLocalStopJustified] = useState<boolean>(false);
  const [localStopJustifiedReason, setLocalStopJustifiedReason] = useState<string | null>(null);
  
  // Estado para controlar qual contexto está sendo exibido nas estações
  const [contextoAtivo, setContextoAtivo] = useState<'sessao' | 'turno' | 'taloes'>('sessao');
  
  // ✅ NOVO: Estado para layout de tela
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('default');
  const [showLayoutConfig, setShowLayoutConfig] = useState(false);

  // Estados para fluxo de paradas
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [isManualStop, setIsManualStop] = useState(false);
  const [stopReasons, setStopReasons] = useState<StopReason[]>([]);
  const [loadingStopReasons, setLoadingStopReasons] = useState(false);
  const [validationExecuted, setValidationExecuted] = useState(false); // Prevenir loops
  const lastProcessedStopRef = React.useRef<{ id: number | null; tipo: 'ativa' | 'ultima' | null }>({ id: null, tipo: null }); // Rastrear última parada processada

  // ✅ NOVO: Estados para finalização de produções
  const [showFinalizarProducoes, setShowFinalizarProducoes] = useState(false);
  const [showAlertaSaldoZero, setShowAlertaSaldoZero] = useState(false);
  const [alertaSaldoZeroJaMostrado, setAlertaSaldoZeroJaMostrado] = useState(false);

  // ✅ NOVO: Estados para feedback de justificação de paradas (melhorar UX)
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successToastMessage, setSuccessToastMessage] = useState<string>('');

  // ✅ NOVO: Estados para pré-justificação de paradas
  const [showPreJustifyModal, setShowPreJustifyModal] = useState(false);
  const [preSelectedReasonId, setPreSelectedReasonId] = useState<number | null>(null);

  // 🔊 Sons
  const { playAlert, playStop, playResume, playError, playSuccess } = useSounds();

  // Gerenciador SSE
  const { 
    machineData,
    childMachinesData,
    isConnected,
    isLoading,
    error,
    iniciarSessao,
    finalizarSessao,
    iniciarProducao,
    pausarProducao,
    retomarProducao,
    finalizarProducao,
    adicionarRejeitos,
    forcarParada,
    retomarParada,
    consultarContexto
  } = useSSEManager({
    machineId: machine.id_maquina,
    enabled: true
  });

  // ✅ NOVO: Carregar layout salvo do localStorage
  useEffect(() => {
    const savedLayout = layoutStorage.getLayout(machine.id_maquina);
    if (savedLayout) {
      setCurrentLayout(savedLayout.type);
    } else {
      // Detectar automaticamente layout baseado no nome da máquina
      const defaultLayout = layoutStorage.getDefaultLayoutType(machine.nome);
      setCurrentLayout(defaultLayout);
    }
  }, [machine.id_maquina, machine.nome]);

  // ✅ NOVO: Carregar motivo pré-selecionado do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`pre_justify_reason_${machine.id_maquina}`);
      if (saved) {
        const reasonId = parseInt(saved, 10);
        if (!isNaN(reasonId)) {
          setPreSelectedReasonId(reasonId);
          console.log('✅ Motivo pré-selecionado carregado:', reasonId);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar motivo pré-selecionado:', error);
    }
  }, [machine.id_maquina]);

  // ✅ NOVO: Função para salvar motivo pré-selecionado
  const savePreSelectedReason = useCallback((reasonId: number) => {
    try {
      localStorage.setItem(`pre_justify_reason_${machine.id_maquina}`, String(reasonId));
      setPreSelectedReasonId(reasonId);
      console.log('✅ Motivo pré-selecionado salvo:', reasonId);
    } catch (error) {
      console.error('❌ Erro ao salvar motivo pré-selecionado:', error);
    }
  }, [machine.id_maquina]);

  // ✅ NOVO: Função para limpar motivo pré-selecionado
  const clearPreSelectedReason = useCallback(() => {
    try {
      localStorage.removeItem(`pre_justify_reason_${machine.id_maquina}`);
      setPreSelectedReasonId(null);
      console.log('✅ Motivo pré-selecionado removido');
    } catch (error) {
      console.error('❌ Erro ao remover motivo pré-selecionado:', error);
    }
  }, [machine.id_maquina]);
  
  // ✅ NOVO: Handler para mudança de layout
  const handleLayoutChange = (newLayout: LayoutType) => {
    setCurrentLayout(newLayout);
    layoutStorage.saveLayout({
      type: newLayout,
      machineId: machine.id_maquina,
      machineName: machine.nome,
      timestamp: Date.now()
    });
    setShowLayoutConfig(false);
    console.log(`✅ Layout alterado para: ${newLayout}`);
  };
  
  // Carregar produção atual do localStorage
  useEffect(() => {
    try {
      const str = localStorage.getItem('industrack_current_production');
      const data = str ? JSON.parse(str) : null;
      if (data && data.id_maquina === machine.id_maquina) {
        setStoredProduction(data);
      } else {
        setStoredProduction(null);
      }
    } catch {
      setStoredProduction(null);
    }
  }, [machine.id_maquina, showProductionCommands]);

  // ✅ NOVO: Validar dados locais com dados do SSE (Backend sempre tem razão)
  useEffect(() => {
    // Só validar se houver dados SSE disponíveis E se ainda não validou (prevenir loops)
    if (!machineData || !machineData.contexto || validationExecuted) return;
    
    const ctx = machineData.contexto;
    const producaoBackend = ctx.producao_mapa;
    const sessaoBackend = ctx.sessao_operador;
    
    // ✅ NOVO: Usar chaves corretas do localStorage
    const savedSessionId = localStorage.getItem('id_sessao');
    const savedSessionActive = localStorage.getItem('sessao_ativa');
    
    console.log('🔍 Validando dados locais vs backend:', {
      tem_sessao_backend: !!sessaoBackend,
      tem_producao_backend: !!producaoBackend,
      tem_sessao_local: !!(savedSessionId && savedSessionActive === 'true'),
      tem_producao_local: !!storedProduction
    });
    
    // ✅ VALIDAÇÃO 1: Sessão local vs Backend
    if (savedSessionId && savedSessionActive === 'true') {
      try {
        const savedSessionIdNum = parseInt(savedSessionId);
        
        // ⚠️ CUIDADO: Só limpar se backend realmente NÃO tem sessão (não apenas undefined)
        // Backend pode demorar para enviar sessao_operador na primeira mensagem
        if (!sessaoBackend && sessaoBackend !== undefined) {
          console.warn('⚠️ Backend confirmou que não há sessão ativa - limpando dados locais');
          localStorage.removeItem('id_sessao');
          localStorage.removeItem('sessao_ativa');
          localStorage.removeItem('industrack_current_production');
          localStorage.removeItem('industrack_current_machine');
          // Limpar chaves antigas também
          localStorage.removeItem('industrack_active_session');
          setValidationExecuted(true);
          // Forçar reload para voltar ao login (só executa uma vez)
          setTimeout(() => window.location.reload(), 1000);
          return;
        }
        
        // Se backend tem sessão diferente da local, atualizar localStorage (sem reload)
        if (sessaoBackend && sessaoBackend.id_sessao && savedSessionIdNum !== sessaoBackend.id_sessao) {
          console.log('ℹ️ Sessão local diferente do backend - sincronizando localStorage');
          localStorage.setItem('id_sessao', String(sessaoBackend.id_sessao));
          localStorage.setItem('sessao_ativa', 'true');
        }
      } catch (e) {
        console.error('❌ Erro ao validar sessão:', e);
      }
    }
    
    // ✅ VALIDAÇÃO 2: Produção local vs Backend (só limpa, sem reload)
    if (storedProduction && producaoBackend === null) {
      console.log('ℹ️ Produção local existe mas backend não tem - limpando localStorage');
      localStorage.removeItem('industrack_current_production');
      setStoredProduction(null);
    }
    
    // Se mapas são diferentes, sincronizar com backend
    if (storedProduction && producaoBackend && storedProduction.id_mapa !== producaoBackend.id_mapa) {
      console.log('ℹ️ Mapa local diferente do backend - sincronizando');
      localStorage.removeItem('industrack_current_production');
      setStoredProduction(null);
    }
    
    // Marcar validação como executada após primeira verificação bem-sucedida
    if (sessaoBackend) {
      setValidationExecuted(true);
    }
  }, [machineData, storedProduction, machine.id_maquina, validationExecuted]);

  // ✅ OTIMIZADO: Consultar contexto automaticamente, MAS pausar quando modal estiver aberto
  useEffect(() => {
    // ⚠️ NÃO consultar automaticamente se modal de produção estiver aberto
    // Isso evita resetar seleções do usuário
    if (showProductionCommands) {
      console.log('⏸️ Modal aberto - pausando consultas automáticas de contexto');
      return; // Não iniciar timers
    }
    
    console.log('⏰ Iniciando consulta automática de contexto (30s)...');
    
    // Consulta inicial após 5 segundos
    const initialTimer = setTimeout(() => {
      if (!showProductionCommands) { // Verificar novamente antes de executar
        console.log('🔄 Consulta inicial de contexto (5s após carregar)');
        consultarContexto().catch(err => console.warn('⚠️ Erro na consulta inicial:', err));
      }
    }, 5000);

    // Consulta periódica a cada 30 segundos
    const interval = setInterval(() => {
      if (!showProductionCommands) { // Verificar se modal não está aberto
        console.log('🔄 Consulta automática de contexto (30s)');
        consultarContexto().catch(err => console.warn('⚠️ Erro na consulta automática:', err));
      } else {
        console.log('⏸️ Pulando consulta - modal está aberto');
      }
    }, 30000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      console.log('⏰ Consulta automática de contexto encerrada');
    };
  }, [consultarContexto, showProductionCommands]); // ✅ Adicionar showProductionCommands como dependência

  // Detectar tipo de máquina
  const isEvaMode = machine.nome?.toLowerCase().includes('eva') || false;
  const isMultipostos = machine.multipostos === true;
  const producaoMapaAtiva = machineData?.contexto?.producao_mapa || null;
  const hasProducaoMapaAtiva = Boolean(
    producaoMapaAtiva &&
    (
      producaoMapaAtiva.id_mapa ||
      producaoMapaAtiva.id_talao_estacao ||
      (producaoMapaAtiva.saldo_a_produzir ??
        producaoMapaAtiva.qt_produzir ??
        (producaoMapaAtiva as any).quantidade_programada ??
        0) > 0
    )
  );

  // ✅ Referência anterior para comparação
  const prevChildProductionsRef = React.useRef<ChildMachineProduction[]>([]);
  
  // Converter dados SSE para formato ChildMachineProduction baseado no contexto ativo
  const childProductions: ChildMachineProduction[] = useMemo(() => {
    if (childMachinesData.size === 0) return [];

    // ✅ Log reduzido: Apenas quando tamanho mudar
    if (prevChildProductionsRef.current.length !== childMachinesData.size) {
      console.log(`🔄 [ChildProductions] Processando ${childMachinesData.size} estações para contexto: ${contextoAtivo}`);
    }

    const newProductions = Array.from(childMachinesData.entries()).map(([machineId, childData]) => {
      const producaoMapaFilha = childData.producao_mapa || null;
      const taloesFilha = producaoMapaFilha?.taloes || [];
      const currentTalao =
        taloesFilha.find(
          (t: any) =>
            (t.id_talao ?? t.id) === producaoMapaFilha?.id_talao_estacao
        ) || taloesFilha[0];

      const produtoInfo = producaoMapaFilha
        ? {
            referencia:
              currentTalao?.talao_referencia ||
              producaoMapaFilha.talao_referencia ||
              producaoMapaFilha.produto_referencia ||
              null,
            descricao:
              currentTalao?.descricao_cor ||
              producaoMapaFilha.descricao_cor ||
              null,
            cor:
              currentTalao?.cor_descricao ||
              producaoMapaFilha.descricao_cor ||
              null
          }
        : null;

      const quantidadeTotal =
        currentTalao?.quantidade_solicitada ??
        currentTalao?.quantidade ??
        producaoMapaFilha?.qt_produzir ??
        producaoMapaFilha?.quantidade_programada ??
        0;

      const minutosDecorridos = producaoMapaFilha?.tempo_decorrido_segundos
        ? Math.floor(producaoMapaFilha.tempo_decorrido_segundos / 60)
        : 0;

      // Selecionar dados baseado no contexto ativo
      // ✅ CORREÇÃO: Contexto 'sessao' deve exibir dados de sessao_operador
      // ✅ CORREÇÃO: Contexto 'taloes' (produção) deve exibir dados de producao_mapa
      let displayData = { sinais: 0, rejeitos: 0, sinais_validos: 0 };
      
      // ✅ Log reduzido: Removido log repetitivo de cada estação
      
      switch (contextoAtivo) {
        case 'sessao':
          // ✅ Contexto sessão: exibir dados de sessao_operador
          displayData = {
            sinais: childData.sessao_operador?.sinais || 0,
            sinais_validos: childData.sessao_operador?.sinais_validos || 0,
            rejeitos: childData.sessao_operador?.rejeitos || 0
          };
          break;
        case 'turno':
          displayData = {
            sinais: childData.producao_turno?.sinais || 0,
            sinais_validos: childData.producao_turno?.sinais_validos || childData.producao_turno?.sinais || 0,
            rejeitos: childData.producao_turno?.rejeitos || 0
          };
          break;
        case 'taloes':
          // ✅ Contexto taloes (produção): exibir dados de producao_mapa
          displayData = {
            sinais: childData.producao_mapa?.sinais || 0,
            sinais_validos: childData.producao_mapa?.sinais_validos || childData.producao_mapa?.sinais || 0,
            rejeitos: childData.producao_mapa?.rejeitos || 0
          };
          break;
      }

      // ✅ Log reduzido: Removido log repetitivo de cada estação
      const sinaisMapa =
        producaoMapaFilha?.sinais_validos ??
        producaoMapaFilha?.sinais ??
        displayData.sinais;
      const rejeitosMapa =
        producaoMapaFilha?.rejeitos ?? displayData.rejeitos ?? 0;

      const gradeInfo = currentTalao
        ? {
            id:
              currentTalao.id_talao ??
              currentTalao.id ??
              `${machineId}-${currentTalao.talao_tamanho || 'grade'}`,
            tamanho:
              currentTalao.talao_tamanho ||
              producaoMapaFilha?.talao_tamanho ||
              null,
            quantidade: quantidadeTotal,
            quantidade_produzida: sinaisMapa,
            minutos_estimado: producaoMapaFilha?.tempo_estimado
              ? Math.ceil(producaoMapaFilha.tempo_estimado / 60)
              : undefined,
            saldo: producaoMapaFilha?.saldo_a_produzir ?? 0
          }
        : null;

      return {
        machine: {
          id_maquina: machineId,
          nome: childData.nome,
          numero_estacao: childData.numero_estacao || 1,
          maquina_pai: machine.id_maquina,
          maquina_filha: true
        },
        stats: {
          produzido: sinaisMapa,
          rejeitos: rejeitosMapa,
          ultimo_sinal: childData.ultimo_sinal || null,
          minutos_disponivel: minutosDecorridos,
          velocidade: childData.velocidade || 0
        },
        parameters: {
          producao_ativa: Boolean(producaoMapaFilha?.id_mapa) || childData.status || false,
          produto: produtoInfo
        },
        produto: produtoInfo,
        grade: gradeInfo,
          // ✅ CORRIGIDO: Passar TODOS os dados, não apenas o contexto ativo
          websocket_data: {
            sessao_operador: childData.sessao_operador || {
              sinais: 0,
              sinais_validos: 0,
              rejeitos: 0
            },
            producao_turno: childData.producao_turno || {
              sinais: 0,
              sinais_validos: 0,
              rejeitos: 0
            },
            producao_mapa: childData.producao_mapa || {
              sinais: 0,
              sinais_validos: 0,
              rejeitos: 0,
              saldo_a_produzir: 0
            }
        },
        // Adicionar contexto para debug
        contexto_exibido: contextoAtivo,
        dados_contexto: {
          sessao: childData.sessao_operador,
          turno: childData.producao_turno,
          taloes: childData.producao_mapa
        }
      };
    });
    
    // ✅ OTIMIZAÇÃO: Comparar com array anterior e retornar o mesmo se nada mudou
    // Isso evita re-renders desnecessários de TODA a árvore de componentes
    const prevProductions = prevChildProductionsRef.current;
    
    if (prevProductions.length === newProductions.length && prevProductions.length > 0) {
      let hasChanges = false;
      
      for (let i = 0; i < newProductions.length; i++) {
        const prev = prevProductions[i];
        const next = newProductions[i];
        
        // Comparar apenas campos importantes que afetam a UI
        if (
          prev.machine.id_maquina !== next.machine.id_maquina ||
          prev.stats.produzido !== next.stats.produzido ||
          prev.stats.rejeitos !== next.stats.rejeitos ||
          prev.websocket_data?.sessao_operador?.sinais !== next.websocket_data?.sessao_operador?.sinais ||
          prev.websocket_data?.sessao_operador?.rejeitos !== next.websocket_data?.sessao_operador?.rejeitos ||
          prev.websocket_data?.producao_turno?.sinais !== next.websocket_data?.producao_turno?.sinais ||
          prev.websocket_data?.producao_turno?.rejeitos !== next.websocket_data?.producao_turno?.rejeitos ||
          prev.websocket_data?.producao_mapa?.sinais !== next.websocket_data?.producao_mapa?.sinais ||
          prev.websocket_data?.producao_mapa?.rejeitos !== next.websocket_data?.producao_mapa?.rejeitos
        ) {
          hasChanges = true;
          console.log(`🔄 Mudança detectada em childProductions - Estação ${next.machine.id_maquina}`);
          break;
        }
      }
      
      if (!hasChanges) {
        console.log(`⏭️ Nenhuma mudança detectada em childProductions, retornando array anterior (evita re-render de toda a página)`);
        return prevProductions; // ✅ Retornar MESMO array (mesma referência)
      }
    }
    
    // Tem mudanças, armazenar novo array
    prevChildProductionsRef.current = newProductions;
    console.log(`✅ childProductions atualizado com mudanças reais`);
    return newProductions;
  }, [childMachinesData, machine.id_maquina, contextoAtivo]);

  // ✅ NOVO: Detectar TODAS as produções ativas (concluídas e parciais)
  const todasProducoesAtivas = useMemo(() => {
    console.log('🔍 Detectando produções ativas...');
    console.log('📊 machineData:', machineData);
    console.log('📊 childMachinesData:', childMachinesData);
    console.log('📊 isMultipostos:', isMultipostos);
    
    const producoes: Array<{
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
      concluida: boolean;
    }> = [];

    // Verificar máquina raiz (single/rotativa) - ignorar se for multipostos (dados vêm das filhas)
    if (!isMultipostos && machineData?.contexto?.producao_mapa) {
      const pm = machineData.contexto.producao_mapa;
      console.log('🎯 Produção da máquina raiz:', pm);
      console.log('   id_mapa:', pm.id_mapa);
      console.log('   qt_produzir:', pm.qt_produzir);
      console.log('   sinais_validos:', pm.sinais_validos);
      console.log('   saldo_a_produzir:', pm.saldo_a_produzir);
      
      // ✅ CORREÇÃO: Verificar se tem id_mapa e quantidade válida
      if (pm.id_mapa && pm.qt_produzir > 0) {
        console.log('✅ Máquina raiz tem produção ativa');
        
        // Para máquinas simples, usar dados do producao_mapa diretamente
        producoes.push({
          id_maquina: machine.id_maquina,
          nome_maquina: machine.nome,
          id_talao: pm.id_talao_estacao || 0,
          talao_referencia: pm.talao_referencia || pm.produto_referencia || '',
          talao_tamanho: pm.talao_tamanho || '',
          produto: pm.produto_referencia || null,
          cor: pm.descricao_cor || null,
          // ✅ DADOS VÊM DO PRODUCAO_MAPA
          total_produzido: pm.sinais_validos || 0,
          total_a_produzir: pm.qt_produzir || 0,
          saldo: pm.saldo_a_produzir || 0,
          rejeitos: pm.rejeitos || 0,
          concluida: (pm.saldo_a_produzir || 0) === 0
        });
      } else {
        console.log('⚠️ Máquina raiz não tem produção ativa válida (sem id_mapa ou qt_produzir)');
      }
    } else if (!isMultipostos) {
      console.log('⚠️ Nenhum producao_mapa na máquina raiz');
    } else {
      console.log('ℹ️ Multipostos - ignorando máquina raiz, usando dados das filhas');
    }

    // Verificar máquinas filhas (EVA/multipostos)
    if (isMultipostos && childMachinesData.size > 0) {
      console.log(`🔍 Verificando ${childMachinesData.size} máquinas filhas...`);
      childMachinesData.forEach((child: any, id: number) => {
        console.log(`   Máquina filha ${id}:`, child);
        console.log('   producao_mapa:', child.producao_mapa);
        
        // ✅ EXPANDIR estrutura completa de um exemplo
        if (child.producao_mapa?.taloes && child.producao_mapa.taloes.length > 0) {
          console.log('   📦 TALÕES ENCONTRADOS:', child.producao_mapa.taloes);
          console.log('   📦 Primeiro talão:', child.producao_mapa.taloes[0]);
        }
        
        // ✅ CORREÇÃO: Verificar se tem id_mapa (indica produção ativa) e iterar sobre talões
        if (child.producao_mapa?.id_mapa && child.producao_mapa.taloes?.length > 0) {
          console.log(`   ✅ Máquina filha ${id} tem produção ativa (mapa ${child.producao_mapa.id_mapa})`);
          
          // ✅ IMPORTANTE: Dados de produção estão NO PRODUCAO_MAPA, não no talão!
          const pm = child.producao_mapa;
          
          // Iterar sobre cada talão
          pm.taloes.forEach((talao: any, tIdx: number) => {
            console.log(`      📦 Processando talão ${tIdx}:`, talao);
            console.log(`      📊 Dados do producao_mapa: qt_produzir=${pm.qt_produzir}, sinais_validos=${pm.sinais_validos}, saldo=${pm.saldo_a_produzir}`);
            
            // Verificar se tem quantidade a produzir (do producao_mapa, não do talão)
            if (pm.qt_produzir > 0 || talao.quantidade_solicitada > 0) {
              console.log(`      ✅ Adicionando talão ${tIdx} da máquina filha ${id}`);
              producoes.push({
                id_maquina: child.id_maquina,
                nome_maquina: child.nome,
                numero_estacao: pm.estacao_numero || child.numero_estacao || child.numero_posto,
                id_talao: talao.id_talao || 0,
                talao_referencia: talao.talao_referencia || '',
                talao_tamanho: talao.talao_tamanho || '',
                produto: talao.produto_referencia || pm.produto_referencia || null,
                cor: talao.cor_descricao || pm.descricao_cor || null,
                // ✅ DADOS VÊM DO PRODUCAO_MAPA, NÃO DO TALÃO
                total_produzido: pm.sinais_validos || 0,
                total_a_produzir: pm.qt_produzir || talao.quantidade_solicitada || 0,
                saldo: pm.saldo_a_produzir || 0,
                rejeitos: pm.rejeitos || 0,
                concluida: (pm.saldo_a_produzir || 0) === 0
              });
            } else {
              console.log(`      ⚠️ Talão ${tIdx} sem quantidade válida`);
            }
          });
        } else {
          console.log(`   ⚠️ Máquina filha ${id} sem produção ativa válida`);
        }
      });
    } else {
      console.log('⚠️ Não é multipostos ou não há máquinas filhas');
    }

    console.log(`📋 Total de produções detectadas: ${producoes.length}`);
    console.log('📦 Produções:', producoes);
    
    return producoes;
  }, [machineData, childMachinesData, machine, isMultipostos]);

  // ✅ Filtrar apenas produções concluídas (saldo = 0)
  const producoesConcluidas = useMemo(() => {
    return todasProducoesAtivas.filter(p => p.concluida);
  }, [todasProducoesAtivas]);

  // ✅ NOVO: Alerta automático quando saldo chegar a 0
  useEffect(() => {
    if (producoesConcluidas.length > 0 && !alertaSaldoZeroJaMostrado && !showAlertaSaldoZero) {
      console.log('🎉 Produções com saldo 0 detectadas:', producoesConcluidas);
      playSuccess();
      setShowAlertaSaldoZero(true);
      setAlertaSaldoZeroJaMostrado(true);
    }
    
    // Resetar flag quando todas as produções forem finalizadas
    if (producoesConcluidas.length === 0 && alertaSaldoZeroJaMostrado) {
      setAlertaSaldoZeroJaMostrado(false);
    }
  }, [producoesConcluidas, alertaSaldoZeroJaMostrado, showAlertaSaldoZero, playSuccess]);

  // ✅ Debug REDUZIDO: Removidos logs repetitivos
  // Apenas logs de otimização já mostram as mudanças importantes

  // 🔊 Detectar novas paradas via SSE e tocar som
  useEffect(() => {
    const paradaAtiva = machineData?.contexto?.parada_ativa;
    
    // Se há uma parada ativa (e não tinha antes), tocar som de alerta
    if (paradaAtiva) {
      console.log('🔊 Nova parada detectada - tocando som de alerta');
      playAlert();
    }
  }, [machineData?.contexto?.parada_ativa, playAlert]);

  // ✅ NOVO: Abrir automaticamente o modal de justificar paradas quando detectar paradas não justificadas
  useEffect(() => {
    // Não abrir se o modal já estiver aberto ou se estiver carregando
    if (showJustifyModal || isLoading || loadingStopReasons) {
      return;
    }

    const ctx: any = machineData?.contexto || {};
    const paradaAtiva = ctx.parada_ativa;
    const ultimaParada = ctx.ultima_parada;
    
    // Verificar se há parada não justificada
    const paradaAtivaJustificada = paradaAtiva?.motivo_id !== null && paradaAtiva?.motivo_id !== undefined;
    const ultimaParadaJustificada = ctx.ultima_parada_justificada === true || ultimaParada?.justificada === true;
    const temParadaNaoJustificada = (paradaAtiva && !paradaAtivaJustificada) || (ultimaParada && !ultimaParadaJustificada && !paradaAtiva);
    
    // Não abrir se já está justificada localmente
    if (localStopJustified) {
      return;
    }

    // Verificar se já processamos esta parada específica
    const paradaId = paradaAtiva?.id || ultimaParada?.id;
    const paradaTipo = paradaAtiva && !paradaAtivaJustificada ? 'ativa' : (ultimaParada && !ultimaParadaJustificada ? 'ultima' : null);
    
    if (paradaId && paradaTipo && 
        lastProcessedStopRef.current.id === paradaId && 
        lastProcessedStopRef.current.tipo === paradaTipo) {
      // Já processamos esta parada, não abrir novamente
      return;
    }

    if (temParadaNaoJustificada && paradaId) {
      // ✅ NOVO: Verificar se há motivo pré-selecionado
      if (preSelectedReasonId) {
        console.log('🛑 Parada não justificada detectada - usando motivo pré-selecionado:', preSelectedReasonId);
        
        // Marcar esta parada como processada
        lastProcessedStopRef.current = { id: paradaId, tipo: paradaTipo! };
        
        // Justificar automaticamente com motivo pré-selecionado
        const justifyWithPreSelected = async () => {
          try {
            const paradaId = paradaAtiva?.id || ultimaParada?.id;
            if (!paradaId) {
              console.error('❌ Não há parada para justificar');
              return;
            }

            console.log('🔄 Justificando automaticamente com motivo pré-selecionado:', preSelectedReasonId);
            
            // Chamar API diretamente (sem abrir modal)
            const response = await apiService.justificarParada(paradaId, preSelectedReasonId);
            
            if (response.success) {
              console.log('✅ Parada justificada automaticamente com motivo pré-selecionado');
              setLocalStopJustified(true);
              setLocalStopJustifiedReason('Justificada (pré-selecionado)');
              // Limpar motivo pré-selecionado após usar
              clearPreSelectedReason();
              // Atualizar contexto
              await consultarContexto();
            } else {
              throw new Error(response.error || 'Erro ao justificar parada');
            }
          } catch (error) {
            console.error('❌ Erro ao justificar com motivo pré-selecionado:', error);
            // Se houver erro, abrir modal para o usuário escolher manualmente
            setIsManualStop(!!paradaAtiva && !paradaAtivaJustificada);
            setShowJustifyModal(true);
          }
        };
        
        justifyWithPreSelected();
        return;
      }
      
      console.log('🛑 Parada não justificada detectada - abrindo modal automaticamente');
      
      // Marcar esta parada como processada
      lastProcessedStopRef.current = { id: paradaId, tipo: paradaTipo! };
      
      // Carregar motivos de parada se necessário
      const loadStopReasonsAndOpen = async () => {
        if (stopReasons.length === 0) {
          setLoadingStopReasons(true);
          try {
            const response = await apiService.listarMotivosParada({ id_maquina: machine.id_maquina });
            if (response.success && response.data) {
              setStopReasons(response.data);
            }
          } catch (error) {
            console.error('❌ Erro ao carregar motivos de parada:', error);
          } finally {
            setLoadingStopReasons(false);
          }
        }
        
        // Verificar se é parada forçada (parada_ativa existe) ou parada normal (ultima_parada)
        const isForcedStop = !!paradaAtiva && !paradaAtivaJustificada;
        setIsManualStop(isForcedStop);
        
        // Abrir modal após um pequeno delay para garantir que os dados estão carregados
        setTimeout(() => {
          setShowJustifyModal(true);
        }, 500);
      };
      
      loadStopReasonsAndOpen();
    }
  }, [machineData?.contexto, showJustifyModal, isLoading, loadingStopReasons, stopReasons.length, localStopJustified, machine.id_maquina, preSelectedReasonId, clearPreSelectedReason, consultarContexto]);

  // Verificar modo admin
  useEffect(() => {
    const checkAdminMode = async () => {
      if (!user?.email) return;
      
      const adminEmails = [
        'joao.cardoso@industrack.com.br',
        'juan.guedessp@gmail.com',
        'industrack.automacao@gmail.com'
      ];
      
      const isAdmin = adminEmails.includes(user.email.toLowerCase());
      setIsAdminMode(isAdmin);
      console.log('Modo admin:', isAdmin);
    };

    checkAdminMode();
  }, [user]);

  // Handler para adicionar rejeitos (máquina principal)
  const handleAddRejeito = async () => {
    try {
      console.log('🔄 Iniciando adição de rejeito para máquina principal...');
      
      const result = await adicionarRejeitos({
        quantidade: 1,
        id_motivo_rejeito: 1
      });

      if (result.success) {
        console.log('✅ Rejeito adicionado com sucesso via SSE');
        // TODO: Mostrar feedback visual (toast/notification)
    } else {
        console.error('❌ Erro ao adicionar rejeito:', result.error);
        // TODO: Mostrar erro para usuário
      }
    } catch (error) {
      console.error('❌ Erro ao adicionar rejeito:', error);
      // TODO: Mostrar erro para usuário
    }
  };

  // Handler para adicionar rejeitos por estação específica
  const handleAddRejeitoEstacao = async (estacaoId: number) => {
    try {
      console.log(`🔄 Iniciando adição de rejeito para estação ${estacaoId}...`);
      
      // Verificar se a estação existe nos dados
      const estacaoData = childMachinesData.get(estacaoId);
      if (!estacaoData) {
        console.error(`❌ Estação ${estacaoId} não encontrada nos dados das máquinas filhas`);
            return;
          }
          
      console.log(`📊 Dados atuais da estação ${estacaoId}:`, {
        nome: estacaoData.nome,
        rejeitos_sessao: estacaoData.sessao_operador?.rejeitos,
        rejeitos_turno: estacaoData.producao_turno?.rejeitos,
        rejeitos_mapa: estacaoData.producao_mapa?.rejeitos,
        contexto_ativo: contextoAtivo
      });
      
      // ✅ CORRIGIDO: Usar adicionarRejeitos do useSSEManager (tem atualização instantânea)
      const result = await adicionarRejeitos({
        id_maquina: estacaoId, // ✅ Passar ID da estação específica
        quantidade: 1,
        id_motivo_rejeito: 1
      });

      if (result.success) {
        console.log(`✅ Rejeito adicionado com sucesso para estação ${estacaoId}`);
        console.log(`✅ Contador atualizado instantaneamente (sem aguardar SSE)`);
        // ✅ A atualização instantânea já foi aplicada pelo useSSEManager!
              } else {
        console.error(`❌ Erro ao adicionar rejeito para estação ${estacaoId}:`, result.error);
        // TODO: Mostrar erro para usuário
      }
    } catch (error) {
      console.error(`❌ Erro ao adicionar rejeito para estação ${estacaoId}:`, error);
      // TODO: Mostrar erro para usuário
    }
  };

  // ✅ Handler para finalizar estação/talão atual
  const handleFinalizarEstacaoAtual = async () => {
    try {
      // ✅ Usar dados do BACKEND (SSE) como fonte principal
      const producaoBackend = machineData?.contexto?.producao_mapa;
      
      if (!producaoBackend || !producaoBackend.id_talao_estacao) {
        playError();
        alert('⚠️ Nenhuma produção em andamento para finalizar.');
        return;
      }

      const idTalao = producaoBackend.id_talao_estacao;
      const idMapa = producaoBackend.id_mapa;
      const saldo = producaoBackend.saldo_a_produzir ?? 0;
      
      console.log('🏁 Finalizando produção atual (dados do backend):', {
        id_talao: idTalao,
        id_mapa: idMapa,
        saldo
      });

      // Confirmar com usuário
      const confirmar = confirm(
        `🏁 Finalizar Produção?\n\n` +
        `Mapa: #${idMapa}\n` +
        `Talão: #${idTalao}\n` +
        `Saldo: ${saldo} peças\n\n` +
        `Deseja finalizar esta produção?`
      );

      if (!confirmar) {
        console.log('❌ Finalização cancelada pelo usuário');
        return;
      }

      console.log('📤 Enviando finalização:', {
        id_maquina: machine.id_maquina,
        id_talao: idTalao,
        estacao_numero: 1 // Para máquinas simples
      });

      playStop();

      // Chamar API para finalizar
      const response = await apiService.finalizarEstacao({
        id_maquina: machine.id_maquina,
        id_talao: idTalao,
        estacao_numero: 1, // Máquinas simples = estação 1
        motivo: 'Produção concluída pelo operador'
      });

      if (response.success) {
        console.log('✅ Estação finalizada com sucesso:', response.data);
        playSuccess();

        // Mostrar resultado
        const resultado = response.data || {};
        alert(
          `✅ Produção Finalizada!\n\n` +
          `📦 Produzidas: ${resultado.produzido_sinais_validos || 0}\n` +
          `❌ Rejeitos: ${resultado.rejeitos || 0}\n\n` +
          `Atualizando dados...`
        );

        // ✅ Atualizar localStorage se houver (para manter fila de talões)
        if (storedProduction && storedProduction.taloes) {
          const taloesRestantes = storedProduction.taloes.filter(t => t.id_talao !== idTalao);
          
          if (taloesRestantes.length > 0) {
            // Ainda há talões na fila, atualizar localStorage
            const novaProducao = {
              ...storedProduction,
              taloes: taloesRestantes,
              timestamp: Date.now()
            };
            localStorage.setItem('industrack_current_production', JSON.stringify(novaProducao));
            setStoredProduction(novaProducao);
            console.log('📋 Produção local atualizada:', taloesRestantes.length, 'talões restantes na fila');
          } else {
            // Não há mais talões na fila, limpar
            localStorage.removeItem('industrack_current_production');
            setStoredProduction(null);
            console.log('✅ Todos os talões da fila foram finalizados');
          }
        }

        // ✅ Atualizar contexto do backend (fonte da verdade)
        await consultarContexto();
        
      } else {
        throw new Error(response.error || 'Erro ao finalizar produção');
      }
    } catch (error) {
      console.error('❌ Erro ao finalizar estação:', error);
      playError();
      alert(`❌ Erro ao finalizar produção:\n${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Handler para encerrar parcial
  const handleEncerrarParcial = async () => {
    try {
      // TODO: Implementar lógica de finalização parcial via API
      console.log('🔄 Encerrar parcial - implementar');
    } catch (error) {
      console.error('❌ Erro ao encerrar parcial:', error);
    }
  };

  // Handler para encerrar total
  const handleEncerrarTotal = async () => {
    try {
      // TODO: Implementar lógica de finalização total via API
      console.log('🔄 Encerrar total - implementar');
    } catch (error) {
      console.error('❌ Erro ao encerrar total:', error);
    }
  };

  // Handler para iniciar produção com mapa - ✅ MEMOIZADO para evitar re-renders do modal
  const handleStartProductionWithMap = useCallback(async (mapaId: number, taloes: TalaoSelecionado[]) => {
    try {
      console.log('🎯 Iniciando produção com mapa:', { mapaId, taloes, isMultipostos, isEvaMode });

      // ✅ NOVO: Preparar payloads de talões para cada tipo de máquina
      // Para máquinas simples, validar que todos talões pertencem à estação 1
      if (!(isMultipostos || isEvaMode)) {
        const taloesInvalidos = taloes.filter(talao => talao.estacao_numero !== 1);
        if (taloesInvalidos.length > 0) {
          const refs = taloesInvalidos.map(t => `${t.talao_referencia} (estação ${t.estacao_numero})`).join(', ');
          alert(`❌ Máquina simples só aceita talões da estação 1.\nRemova: ${refs}`);
          throw new Error('Máquina simples com talões fora da estação 1');
        }
      }

      const taloesParaSimples = taloes.map(talao => ({
        id_talao: talao.id_talao,
        estacao_numero: talao.estacao_numero,
        id_maquina_filha: machine.id_maquina,
        quantidade: talao.quantidade,
        ...(talao.tempo_ciclo_segundos && { tempo_ciclo_segundos: talao.tempo_ciclo_segundos })
      }));

      const taloesParaMultipostos: Array<{
        id_talao: number;
        id_maquina_filha: number;
        quantidade: number;
        tempo_ciclo_segundos?: number;
      }> = taloes.map(talao => {
        let idMaquinaFilha = machine.id_maquina; // Default: máquina raiz

        if (isMultipostos) {
          // Buscar a estação filha correspondente no childMachinesData
          const estacaoFilha = Array.from(childMachinesData.values()).find(
            child => child.numero_estacao === talao.estacao_numero
          );

          if (estacaoFilha && estacaoFilha.id_maquina) {
            idMaquinaFilha = estacaoFilha.id_maquina;
            console.log(`✅ Talão ${talao.id_talao} (Estação ${talao.estacao_numero}): Mapeado para máquina filha ${idMaquinaFilha}`);
          } else {
            console.warn(`⚠️ Talão ${talao.id_talao} (Estação ${talao.estacao_numero}): Máquina filha não encontrada - usando máquina raiz`);
          }
        }

        return {
          id_talao: talao.id_talao,
          id_maquina_filha: idMaquinaFilha,
          quantidade: talao.quantidade,
          ...(talao.tempo_ciclo_segundos && { tempo_ciclo_segundos: talao.tempo_ciclo_segundos })
        };
      });

      // ✅ Agrupar por estação apenas para logging
      const taloesPorEstacao = taloes.reduce((acc, talao) => {
        const estacao = talao.estacao_numero;
        if (!acc[estacao]) {
          acc[estacao] = [];
        }
        acc[estacao].push(talao);
        return acc;
      }, {} as Record<number, TalaoSelecionado[]>);
      const estacoesDistintas = Object.keys(taloesPorEstacao).map(Number);
      console.log(`🎯 Iniciando produção com ${taloes.length} talões em ${estacoesDistintas.length} estação(ões):`, estacoesDistintas);

      // ✅ Preparar payload único com TODOS os talões
      // ✅ Escolher endpoint e payload baseado no tipo de máquina
      const isMultipostosOrEVA = isMultipostos || isEvaMode;
      let response;

      if (isMultipostosOrEVA) {
        const payloadMultiposto = {
          id_maquina: machine.id_maquina, // ✅ SEMPRE a máquina raiz/pai
          id_mapa: mapaId,
          taloes: taloesParaMultipostos
        };
        console.log('📤 Payload multiposto:', payloadMultiposto);
        response = await apiService.iniciarProducaoMapa(payloadMultiposto);  // POST /api/producao/iniciar
      } else {
        const payloadSimples = {
          id_maquina: machine.id_maquina,
          id_mapa: mapaId,
          taloes: taloesParaSimples
        };
        console.log('📤 Payload simples:', payloadSimples);
        response = await apiService.iniciarProducaoSimples(payloadSimples);  // POST /api/producao/iniciar-simples
      }
      
      if (response.success) {
        console.log('✅ Produção iniciada com sucesso em todas as estações');
        playSuccess();
        
        // ✅ Consultar contexto atualizado após iniciar produção
        console.log('🔄 Consultando contexto atualizado após iniciar produção...');
        try {
          await consultarContexto();
          console.log('✅ Contexto atualizado após iniciar produção');
        } catch (contextError) {
          console.warn('⚠️ Erro ao consultar contexto após iniciar produção:', contextError);
        }
      } else {
        throw new Error(response.error || 'Erro ao iniciar produção');
      }
    } catch (error) {
      console.error('❌ Erro ao iniciar produção com mapa:', error);
      playError();
      throw error;
    }
  }, [machine.id_maquina, isMultipostos, isEvaMode, childMachinesData, playSuccess, playError, consultarContexto]); // ✅ Dependências estáveis

  // Handler for finishing session - ✅ MEMOIZADO para evitar re-renders do modal
  const handleFinishSession = useCallback(async () => {
    try {
      console.log('🏁 Finalizando sessão para máquina:', machine.id_maquina);

      const response = await apiService.finalizarSessao({
        id_maquina: machine.id_maquina,
        id_operador: operator?.id_operador,
        id_sessao: sessionId || undefined
        // ❌ motivo removido - backend não aceita
      });
      
      if (response.success) {
        console.log('✅ Sessão finalizada com sucesso');
        // TODO: Redirecionar para tela de login ou mostrar feedback
      } else {
        throw new Error(response.error || 'Erro ao finalizar sessão');
      }
    } catch (error) {
      console.error('❌ Erro ao finalizar sessão:', error);
      throw error;
    }
  }, [machine.id_maquina, operator?.id_operador, sessionId]); // ✅ Dependências estáveis

  // Buscar motivos de parada
  useEffect(() => {
    const fetchStopReasons = async () => {
      try {
        setLoadingStopReasons(true);
        // Buscar motivos específicos para a máquina (backend mescla máquina+grupo e deduplica)
        const response = await apiService.listarMotivosParada({ id_maquina: machine.id_maquina });
        
        if (response.success && response.data) {
          setStopReasons(response.data);
          console.log('✅ Motivos de parada carregados:', response.data.length);
      } else {
          console.error('❌ Erro ao buscar motivos de parada:', response.error);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar motivos de parada:', error);
      } finally {
        setLoadingStopReasons(false);
      }
    };

    fetchStopReasons();
  }, []);

  // ✅ NOVO: Handler para pré-justificar parada (salvar motivo no localStorage)
  const handlePreJustify = useCallback(async (reasonId: number) => {
    savePreSelectedReason(reasonId);
    setShowPreJustifyModal(false);
    
    // Buscar descrição do motivo para exibir no toast
    const motivo = stopReasons.find(r => r.id === reasonId);
    const motivoDesc = motivo?.descricao || 'Motivo pré-selecionado';
    
    setSuccessToastMessage(`Motivo pré-selecionado: ${motivoDesc}`);
    setShowSuccessToast(true);
    playSuccess();
    
    console.log('✅ Motivo pré-selecionado salvo:', motivoDesc);
    
    // Esconder toast após 3 segundos
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);
  }, [savePreSelectedReason, stopReasons]);

  // Handler para justificar parada (usa parada atual ou última parada)
  // ✅ MELHORADO: Fecha modal imediatamente e mostra confirmação, processa resposta em background
  const handleJustifyStop = async (reasonId: number) => {
    const paradaAtiva = machineData?.contexto?.parada_ativa as any;
    const ultimaParada = (machineData?.contexto as any)?.ultima_parada;
    const paradaId = paradaAtiva?.id || ultimaParada?.id;
    
    if (!paradaId) {
      console.error('❌ Não há parada atual ou última parada para justificar');
      setErrorMessage('Não há parada para justificar');
      setShowErrorModal(true);
      return;
    }

    // ✅ FECHAR MODAL IMEDIATAMENTE e mostrar confirmação
    console.log('🔄 Justificando parada (feedback imediato):', { idParada: paradaId, idMotivo: reasonId });
    setShowJustifyModal(false);
    setIsManualStop(false);
    setSuccessToastMessage('Parada justificada com sucesso!');
    setShowSuccessToast(true);
    playSuccess();
    
    // ✅ Resetar ref para permitir detectar novas paradas
    lastProcessedStopRef.current = { id: null, tipo: null };
    
    // ✅ Atualização otimista da UI
    setLocalStopJustified(true);
    setLocalStopJustifiedReason('Justificada');
    
    // ✅ Esconder toast após 3 segundos
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);

    // ✅ Processar resposta do backend em background (sem bloquear UI)
    try {
      const response = await apiService.justificarParada(paradaId, reasonId);
      
      if (response.success) {
        console.log('✅ Parada justificada com sucesso (backend confirmado)');
        // ✅ Atualização imediata na UI baseada no retorno da API
        try {
          const data: any = response.data || {};
          if (data && (data.id_parada || data.id_motivo)) {
            setLocalStopJustified(true);
            setLocalStopJustifiedReason('Justificada');
          }
        } catch {}
        // Reconsultar contexto para consolidar estado com backend
        await consultarContexto();
        // A atualização virá via SSE
      } else {
        // ✅ Se houver erro, reverter estado otimista e mostrar erro
        console.error('❌ Erro ao justificar parada (backend):', response.error);
        setLocalStopJustified(false);
        setLocalStopJustifiedReason(null);
        setErrorMessage(response.error || 'Erro ao justificar parada. Tente novamente.');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      // ✅ Se houver erro, reverter estado otimista e mostrar erro
      console.error('❌ Erro ao justificar parada:', error);
      setLocalStopJustified(false);
      setLocalStopJustifiedReason(null);
      const errorMsg = error?.message || error?.response?.data?.detail || 'Erro ao justificar parada. Tente novamente.';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    }
  };

  // Handler para parada forçada
  const handleForcedStop = async () => {
    try {
      const jaParada = machineData?.contexto?.parada_ativa !== null;
      // Se já existe parada ativa, abrir modal para justificar (não criar nova parada)
      setIsManualStop(!jaParada);
      setShowJustifyModal(true);
      
      // Se não há motivos carregados, buscar agora
      if (stopReasons.length === 0) {
        setLoadingStopReasons(true);
        const response = await apiService.listarMotivosParada();
        
        if (response.success && response.data) {
          setStopReasons(response.data);
        }
        setLoadingStopReasons(false);
      }
    } catch (error) {
      console.error('❌ Erro ao iniciar parada forçada:', error);
    }
  };

  // Handler para confirmar parada forçada (quando motivo selecionado)
  // ✅ MELHORADO: Fecha modal imediatamente e mostra confirmação, processa resposta em background
  const handleConfirmForcedStop = async (reasonId: number) => {
    const jaParada = machineData?.contexto?.parada_ativa !== null;
    
    // Se já existe parada ativa, redirecionar para justificativa ao invés de criar nova parada
    if (jaParada) {
      console.warn('⚠️ Já existe uma parada ativa. Redirecionando para justificativa.');
      await handleJustifyStop(reasonId);
      return;
    }

    // ✅ FECHAR MODAL IMEDIATAMENTE e mostrar confirmação
    console.log('🛑 Confirmando parada forçada (feedback imediato):', reasonId);
    setShowJustifyModal(false);
    setIsManualStop(false);
    setSuccessToastMessage('Parada forçada iniciada com sucesso!');
    setShowSuccessToast(true);
    playStop();
    playSuccess();
    
    // ✅ Resetar ref para permitir detectar novas paradas
    lastProcessedStopRef.current = { id: null, tipo: null };
    
    // ✅ Esconder toast após 3 segundos
    setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);

    // ✅ Processar resposta do backend em background (sem bloquear UI)
    try {
      const response = await forcarParada({
        id_maquina: machine.id_maquina,
        id_motivo: reasonId
      });

      if (response.success) {
        console.log('✅ Parada forçada iniciada com sucesso (backend confirmado)');
        console.log('📊 Dados da parada:', response.data);
        
        // ✅ Forçar atualização do contexto para garantir sincronização
        try {
          await consultarContexto();
          console.log('🔄 Contexto atualizado após parada forçada');
        } catch (e) {
          console.warn('⚠️ Erro ao atualizar contexto:', e);
        }
      } else {
        // ✅ Se houver erro, mostrar erro
        console.error('❌ Erro ao forçar parada (backend):', response.error);
        setErrorMessage(response.error || 'Erro ao forçar parada. Tente novamente.');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      const msg = error?.message || '';
      const detail = (error?.detail || error?.response?.data?.detail || '').toString().toLowerCase();
      
      // Tratamento amigável quando backend indica que já existe parada ativa
      if (msg.includes('400') || msg.includes('500') || detail.includes('parada ativa')) {
        console.warn('⚠️ Backend informa que já há parada ativa. Redirecionando para justificativa.');
        // Não mostrar erro, apenas redirecionar para justificativa
        await handleJustifyStop(reasonId);
        return;
      }
      
      // ✅ Se houver outro erro, mostrar erro
      console.error('❌ Erro ao forçar parada:', error);
      const errorMsg = error?.message || error?.response?.data?.detail || 'Erro ao forçar parada. Tente novamente.';
      setErrorMessage(errorMsg);
      setShowErrorModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Determinar se máquina está parada
  const isMachineStopped = machineData?.contexto?.parada_ativa !== null || machineData?.contexto?.status === false;

  return (
    <div className={`flex flex-col min-h-screen bg-gradient-to-br ${isMachineStopped ? 'from-red-900 via-red-800 to-red-900' : 'from-blue-900 via-blue-800 to-indigo-900'}`}>
      {/* Sidebar */}
      <Sidebar
        pendingStops={0}
        pendingStopStartTime={null}
        sessionId={sessionId}
        machineId={machine.id_maquina}
        operadorId={operator?.id_operador || 0}
        onShowStops={() => console.log('🛑 Mostrar paradas - implementar')}
        onShowSettings={onShowSettings}
        onShowProductionCommands={() => setShowProductionCommands(true)}
        onShowFinalizarProducoes={() => setShowFinalizarProducoes(true)} // ✅ NOVO
        onCollapsedChange={setSidebarCollapsed}
        secondaryOperator={secondaryOperator?.nome || null}
        onShowPreStopModal={() => console.log('⚠️ Modal pre-parada - implementar')}
        preSelectedStopReasonDesc={null}
        canPreJustify={false}
        onShowStopReasonModal={() => console.log('🔍 Modal motivo parada - implementar')}
        isMachineStopped={machineData?.contexto?.parada_ativa !== null}
        onForcedResume={async () => {
          try {
            console.log('▶️ Retomar forçado - iniciando');
            playResume();
            const response = await retomarParada();
            if (response.success) {
              console.log('✅ Retomada forçada concluída');
              playSuccess();
              
              // ✅ Forçar atualização do contexto para garantir sincronização
              try {
                await consultarContexto();
                console.log('🔄 Contexto atualizado após retomar parada');
              } catch (e) {
                console.warn('⚠️ Erro ao atualizar contexto:', e);
              }
            } else {
              console.error('❌ Erro ao retomar parada forçada:', response.error);
              const errMsg = (response.error || '').toString();
              if (errMsg.includes('Não há parada forçada ativa')) {
                console.warn('ℹ️ Sem parada forçada ativa. Atualizando contexto e voltando ao botão padrão.');
                await consultarContexto();
                return;
              }
            }
          } catch (err: any) {
            console.error('❌ Erro ao retomar parada forçada:', err);
            const detail = (err?.detail || err?.response?.data?.detail || err?.message || '').toString();
            if (detail.includes('Não há parada forçada ativa')) {
              console.warn('ℹ️ Sem parada forçada ativa (backend). Atualizando contexto e voltando ao botão padrão.');
              await consultarContexto();
              return;
            }
          }
        }}
        onJustifyStop={() => {
          // ✅ CORREÇÃO: Verificar se a parada já está justificada antes de abrir o modal
          const ctx: any = machineData?.contexto || {};
          const paradaAtivaJustificada = ctx.parada_ativa?.motivo_id !== null && ctx.parada_ativa?.motivo_id !== undefined;
          const ultimaParadaJustificada = ctx.ultima_parada_justificada === true || ctx.ultima_parada?.justificada === true;
          
          if (paradaAtivaJustificada || ultimaParadaJustificada || localStopJustified) {
            console.log('ℹ️ Parada já está justificada, não abrindo modal');
            return;
          }
          
          setShowJustifyModal(true);
        }}
        onPreJustify={() => {
          // ✅ NOVO: Abrir modal de pré-justificação
          setShowPreJustifyModal(true);
        }}
        preSelectedReasonId={preSelectedReasonId}
        currentStopJustified={Boolean(
          localStopJustified || 
          (machineData?.contexto as any)?.ultima_parada_justificada === true || 
          (machineData?.contexto as any)?.ultima_parada?.justificada === true ||
          // ✅ CORREÇÃO: Verificar se parada_ativa tem motivo_id (indica que já foi justificada)
          (machineData?.contexto?.parada_ativa?.motivo_id !== null && machineData?.contexto?.parada_ativa?.motivo_id !== undefined)
        )}
        wsData={machineData}
        justifiedStopReason={(() => {
          const ctx: any = machineData?.contexto || {};
          const hasLatest = ctx.parada_ativa || ctx.ultima_parada;
          // ✅ CORREÇÃO: Verificar se parada_ativa tem motivo_id (indica que já foi justificada)
          const paradaAtivaJustificada = ctx.parada_ativa?.motivo_id !== null && ctx.parada_ativa?.motivo_id !== undefined;
          const isJust = localStopJustified || ctx.ultima_parada_justificada === true || ctx.ultima_parada?.justificada === true || paradaAtivaJustificada;
          if (localStopJustified && localStopJustifiedReason) return localStopJustifiedReason;
          if (!hasLatest) return 'sem paradas para justificar';
          return isJust ? (ctx.ultima_parada_motivo || ctx.parada_ativa?.motivo_id || 'Justificada') : 'Parada não justificada';
        })()}
        onWsEndSession={() => console.log('🔚 Finalizar sessão - implementar')}
        onForcedStop={handleForcedStop}
      />

      {/* Header com Botões de Contexto Integrados */}
      <DashboardHeader
        machine={machine}
        realtimeMachine={machine}
        user={user}
        currentShift={null}
        shiftError={null}
        sidebarCollapsed={sidebarCollapsed}
        velocidade={machineData?.contexto?.velocidade || 0}
        statusParada={machineData?.contexto?.parada_ativa !== null}
        onRefresh={() => console.log('🔄 Refresh - implementar')}
        // Novos props para contextos - sempre mostrar para máquinas simples também
        contextoAtivo={contextoAtivo}
        onContextoChange={setContextoAtivo}
        showContextButtons={true} // Sempre mostrar botões de contexto
        // ✅ NOVO: Props de configuração de layout
        onOpenLayoutConfig={() => setShowLayoutConfig(true)}
        showLayoutButton={isMultipostos} // Mostrar apenas para multipostos
      />

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-12' : 'ml-56'} pt-12 px-4 pb-6 gap-4 flex flex-col`}>
        {/* Indicador de Produção Atual - BASEADO NO BACKEND (SSE) - Esconder nos layouts EVA 16 e Rotativas */}
        {hasProducaoMapaAtiva && !(currentLayout === 'eva_16_stations' && isMultipostos) && !(currentLayout === 'rotativas' && isMultipostos) && (
          <div className="mb-4 bg-green-600/20 border border-green-400/40 rounded-xl p-4 text-sm text-green-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 rounded-lg bg-green-500/30 border border-green-400/60 font-bold uppercase text-xs">Em Produção</span>
              <span className="font-semibold">Mapa #{producaoMapaAtiva?.id_mapa ?? 'N/A'}</span>
              <span className="opacity-80">•</span>
              <span className="font-semibold">Talão #{producaoMapaAtiva?.id_talao_estacao || 'N/A'}</span>
              {producaoMapaAtiva?.saldo_a_produzir !== undefined && (
                <>
                  <span className="opacity-80">•</span>
                  <span className="font-semibold text-yellow-200">Saldo: {producaoMapaAtiva?.saldo_a_produzir}</span>
                </>
              )}
              {storedProduction && storedProduction.taloes && storedProduction.taloes.length > 1 && (
                <>
                  <span className="opacity-80">•</span>
                  <span className="text-blue-200 text-xs">{storedProduction.taloes.length} talões na fila</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-500 border border-red-400 text-white font-bold text-sm transition-all duration-200 shadow-lg hover:shadow-red-500/50"
                onClick={handleFinalizarEstacaoAtual}
                title="Finalizar produção da estação atual"
              >
                🏁 Finalizar Estação
              </button>
              <button
                className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20"
                onClick={() => {
                  consultarContexto().catch(err => console.warn('Erro ao atualizar:', err));
                }}
                title="Atualizar dados do backend"
              >
                🔄 Atualizar
              </button>
            </div>
          </div>
        )}
        {error && (
          <ErrorMessage message={error} />
        )}


        {/* Machine View - Esconder quando usar layouts EVA 16 ou Rotativas */}
        {!(currentLayout === 'eva_16_stations' && isMultipostos) && !(currentLayout === 'rotativas' && isMultipostos) && (
          <SingleMachineViewNew
            machineData={machineData}
            contextoAtivo={contextoAtivo}
            onAddReject={async (gradeId) => {
              console.log('🔄 Adicionando rejeito para grade:', gradeId);
              await handleAddRejeito();
            }}
            onAddRejeito={handleAddRejeito}
            statusParada={machineData?.contexto?.parada_ativa !== null}
            onEncerrarParcial={handleEncerrarParcial}
            onEncerrarTotal={handleEncerrarTotal}
          />
        )}

        {/* Child Machines (Estações) - Interface com Sistema de Layout Configurável */}
        {childProductions.length > 0 && (
          <div className="mt-6">
            {currentLayout === 'eva_16_stations' ? (
              // ✅ Layout EVA 16 Estações (2 colunas ESQUERDA/DIREITA)
              <Eva16StationsView
                machineData={machineData}
                childProductions={childProductions}
                contextoAtivo={contextoAtivo}
                onAddReject={handleAddRejeitoEstacao}
              />
            ) : currentLayout === 'rotativas' ? (
              // ✅ Layout Rotativas (2 colunas automáticas divididas por quantidade)
              <RotativasStationsView
                machineData={machineData}
                childProductions={childProductions}
                contextoAtivo={contextoAtivo}
                onAddReject={handleAddRejeitoEstacao}
              />
            ) : isEvaMode ? (
              // EVA Mode - Layout especializado para máquinas EVA
              <div className="space-y-4">
                <div className="bg-black/20 rounded-xl border border-white/30 shadow-xl backdrop-blur-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                      <span>🔧</span>
                      {machine.nome} - {childProductions.length} Estações Ativas
                          </h3>
                        </div>
                  
                          <ChildMachineGrid 
                    productions={childProductions}
                    onAddReject={(machineId) => {
                      console.log(`🔄 Adicionando rejeito para estação ${machineId}...`);
                      handleAddRejeitoEstacao(machineId);
                    }}
                    statusParada={machineData?.parada_ativa !== null}
                    isEvaMode={isEvaMode}
                    side="left" // TODO: Detectar lado baseado no nome da máquina
                    lastSignalStationId={null} // TODO: Implementar última estação com sinal
                    noGaps={false}
                          />
                        </div>
                      </div>
            ) : isMultipostos ? (
              // Multipostos Mode - Layout otimizado para múltiplas estações
              <div className="bg-black/20 rounded-xl border border-white/30 shadow-xl backdrop-blur-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span>🏭</span>
                    {machine.nome} - {childProductions.length} Estações
                          </h3>
                        </div>
                
                          <ChildMachineGrid 
                  productions={childProductions}
                  onAddReject={(machineId) => {
                    console.log(`🔄 Adicionando rejeito para estação ${machineId}...`);
                    handleAddRejeitoEstacao(machineId);
                  }}
                  statusParada={machineData?.parada_ativa !== null}
                  isEvaMode={false}
                  lastSignalStationId={null} // TODO: Implementar última estação com sinal
                  noGaps={true} // Layout mais compacto para multipostos
                />
                    </div>
                  ) : (
              // Fallback - Layout simples em cards para outras máquinas
              <div className="bg-black/20 rounded-xl border border-white/30 shadow-xl backdrop-blur-sm">
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                    <span>🏭</span>
                    Estações da Máquina ({childProductions.length})
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {childProductions.map((production) => (
                      <div key={production.machine.id_maquina} className="bg-black/30 rounded-lg border border-white/20 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-lg font-semibold text-white truncate" title={production.machine.nome}>
                            {production.machine.nome}
                          </h4>
                          <div className={`w-3 h-3 rounded-full ${production.parameters.producao_ativa ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-white/70">Sinais:</span>
                            <span className="text-green-400 font-semibold">{production.stats.produzido}</span>
        </div>
                          
                          <div className="flex justify-between">
                            <span className="text-white/70">Rejeitos:</span>
                            <span className="text-red-400 font-semibold">{production.stats.rejeitos}</span>
                    </div>
                    </div>
                        
              <button
                          onClick={() => handleAddRejeitoEstacao(production.machine.id_maquina)}
                          disabled={!production.parameters.producao_ativa}
                          className="mt-3 w-full px-3 py-2 bg-red-600/80 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-semibold rounded transition-colors"
                        >
                          + Rejeito
              </button>
                      </div>
                    ))}
            </div>
          </div>
              </div>
            )}
        </div>
      )}

        {/* Debug Info (apenas em modo admin) */}
        {isAdminMode && (
          <div className="mt-6 p-4 bg-black/30 rounded-lg backdrop-blur-sm">
            <h3 className="text-white font-semibold mb-2">🔧 Debug SSE Data</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-1">Machine Data (Máquina Principal):</h4>
                <pre className="text-xs text-green-300 overflow-auto max-h-40 bg-black/20 p-2 rounded">
                  {JSON.stringify(machineData, null, 2)}
                </pre>
              </div>
              
              {childMachinesData.size > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-1">Child Machines Data ({childMachinesData.size} estações):</h4>
                  <pre className="text-xs text-blue-300 overflow-auto max-h-40 bg-black/20 p-2 rounded">
                    {JSON.stringify(Object.fromEntries(childMachinesData), null, 2)}
                  </pre>
          </div>
              )}
            </div>
          </div>
        )}
      </main>

        {/* Modal de Comandos de Produção */}
        <ProductionCommandsModal
          isOpen={showProductionCommands}
          onClose={() => setShowProductionCommands(false)}
          machineId={machine.id_maquina}
          onStartProduction={handleStartProductionWithMap}
          onFinishSession={handleFinishSession}
        />

        {/* Modal de Justificativa de Paradas */}
        <JustifyStopModal
          isOpen={showJustifyModal}
          onClose={() => {
            setShowJustifyModal(false);
            setIsManualStop(false);
          }}
          onJustify={async (reasonId: number) => {
            if (isManualStop) {
              await handleConfirmForcedStop(reasonId);
            } else {
              await handleJustifyStop(reasonId);
            }
          }}
          stopReasons={stopReasons}
          machineGroup={null} // TODO: Buscar grupo da máquina se necessário
          isManualStop={isManualStop}
        />

        {/* ✅ NOVO: Modal de Pré-Justificação de Paradas */}
        <JustifyStopModal
          isOpen={showPreJustifyModal}
          onClose={() => {
            setShowPreJustifyModal(false);
          }}
          onJustify={async (reasonId: number) => {
            await handlePreJustify(reasonId);
          }}
          stopReasons={stopReasons}
          machineGroup={null}
          isPreJustificationMode={true}
        />
        
        {/* ✅ NOVO: Modal de Configuração de Layout */}
        <LayoutConfigModal
          isOpen={showLayoutConfig}
          onClose={() => setShowLayoutConfig(false)}
          currentLayout={currentLayout}
          machineName={machine.nome}
          onSelectLayout={handleLayoutChange}
        />

        {/* ✅ NOVO: Modal de Finalizar Produções (Concluídas e Parciais) */}
        <FinalizarProducoesModal
          isOpen={showFinalizarProducoes}
          onClose={() => setShowFinalizarProducoes(false)}
          producoesConcluidas={todasProducoesAtivas}
          onFinalizarSuccess={() => {
            console.log('✅ Produções finalizadas - atualizando contexto');
            consultarContexto().catch(err => console.warn('Erro ao atualizar contexto:', err));
          }}
        />

        {/* ✅ NOVO: Alerta Automático de Saldo Zero */}
        <AlertaSaldoZeroModal
          isOpen={showAlertaSaldoZero}
          onClose={() => setShowAlertaSaldoZero(false)}
          producoes={producoesConcluidas.map(p => ({
            id_maquina: p.id_maquina,
            nome_maquina: p.nome_maquina,
            numero_estacao: p.numero_estacao,
            talao_referencia: p.talao_referencia,
            talao_tamanho: p.talao_tamanho,
            produto: p.produto,
            cor: p.cor,
            total_produzido: p.total_produzido,
            total_a_produzir: p.total_a_produzir
          }))}
          onFinalizar={() => {
            setShowAlertaSaldoZero(false);
            setShowFinalizarProducoes(true);
          }}
          onIniciarNova={() => {
            setShowAlertaSaldoZero(false);
            setShowProductionCommands(true);
          }}
        />

        {/* ✅ NOVO: Modal de Erro para justificação de paradas */}
        {showErrorModal && (
          <ErrorModal
            message={errorMessage}
            onClose={() => {
              setShowErrorModal(false);
              setErrorMessage('');
            }}
          />
        )}

        {/* ✅ NOVO: Toast de Sucesso para justificação de paradas */}
        {showSuccessToast && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in-right max-w-md">
            <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-semibold">{successToastMessage}</p>
              {successToastMessage.includes('pré-selecionado') ? (
                <p className="text-sm text-green-100">A próxima parada será justificada automaticamente.</p>
              ) : (
                <p className="text-sm text-green-100">A confirmação será processada em background.</p>
              )}
            </div>
          </div>
        )}

        {/* Justificar Parada agora na Sidebar (removido botão flutuante) */}
    </div>
  );
}
