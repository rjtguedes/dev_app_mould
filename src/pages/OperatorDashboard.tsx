// 📊 Operator Dashboard com SSE + API REST

import React, { useState, useEffect, useMemo } from 'react';
import { useSSEManager } from '../hooks/useSSEManager';
import { useSounds } from '../hooks/useSounds';
import { SingleMachineViewNew } from '../components/SingleMachineView-new';
import { ChildMachineGrid } from '../components/ChildMachineGrid';
import { DashboardHeader } from '../components/DashboardHeader';
import { Sidebar } from '../components/Sidebar';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { ProductionCommandsModal } from '../components/ProductionCommandsModal';
import { JustifyStopModal } from '../components/JustifyStopModal';
import { apiService } from '../services/apiService';
import type { Machine } from '../types/machine';
import type { User } from '@supabase/supabase-js';
import type { TalaoSelecionado } from '../types/production';
import type { ChildMachineProduction } from '../types/production';
import type { StopReason } from '../types/stops';

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

  // Estados para fluxo de paradas
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [isManualStop, setIsManualStop] = useState(false);
  const [stopReasons, setStopReasons] = useState<StopReason[]>([]);
  const [loadingStopReasons, setLoadingStopReasons] = useState(false);

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

  // Detectar tipo de máquina
  const isEvaMode = machine.nome?.toLowerCase().includes('eva') || false;
  const isMultipostos = machine.multipostos === true;

  // Converter dados SSE para formato ChildMachineProduction baseado no contexto ativo
  const childProductions: ChildMachineProduction[] = useMemo(() => {
    if (childMachinesData.size === 0) return [];

    console.log(`🔄 [ChildProductions] Processando ${childMachinesData.size} estações para contexto: ${contextoAtivo}`);

    return Array.from(childMachinesData.entries()).map(([machineId, childData]) => {
      // Selecionar dados baseado no contexto ativo
      let displayData = { sinais: 0, rejeitos: 0, sinais_validos: 0 };
      
      console.log(`📊 [Estação ${machineId}] Dados disponíveis:`, {
        sessao: childData.sessao_operador,
        turno: childData.producao_turno,
        mapa: childData.producao_mapa,
        last_updated: childData.last_updated
      });
      
      switch (contextoAtivo) {
        case 'sessao':
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
          displayData = {
            sinais: childData.producao_mapa?.sinais || 0,
            sinais_validos: childData.producao_mapa?.sinais_validos || childData.producao_mapa?.sinais || 0,
            rejeitos: childData.producao_mapa?.rejeitos || 0
          };
          break;
      }

      console.log(`🎯 [Estação ${machineId}] Dados para contexto '${contextoAtivo}':`, displayData);
        
        return {
        machine: {
          id_maquina: machineId,
          nome: childData.nome,
          numero_estacao: childData.numero_estacao || 1,
          maquina_pai: machine.id_maquina,
          maquina_filha: true
        },
          stats: {
          produzido: displayData.sinais,
          rejeitos: displayData.rejeitos,
          ultimo_sinal: childData.ultimo_sinal || null,
          minutos_disponivel: 0
        },
        parameters: {
          producao_ativa: childData.status || false
        },
        produto: null,
        grade: null,
          websocket_data: {
            sessao_operador: {
            sinais: displayData.sinais,
            sinais_validos: displayData.sinais_validos,
            rejeitos: displayData.rejeitos
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
  }, [childMachinesData, machine.id_maquina, contextoAtivo]);

  // Debug completo dos dados recebidos
  useEffect(() => {
    console.log(`🔍 Dashboard DEBUG - Machine Info:`, {
      machine_id: machine.id_maquina,
      machine_name: machine.nome,
      machine_multipostos: machine.multipostos,
      isEvaMode,
      isMultipostos,
      machineData_exists: !!machineData,
      childMachinesData_size: childMachinesData.size,
      contexto_ativo: contextoAtivo
    });

    // Log das máquinas filhas com contexto
    if (childMachinesData.size > 0) {
      console.log(`🏭 Dashboard: ${childMachinesData.size} máquinas filhas recebidas via SSE (contexto: ${contextoAtivo}):`, 
        Array.from(childMachinesData.entries()).map(([id, data]) => ({
          id,
          nome: data.nome,
          status: data.status,
          contexto_sessao: data.sessao_operador,
          contexto_turno: data.producao_turno,
          contexto_taloes: data.producao_mapa
        }))
      );
    } else {
      console.log(`⚠️ Dashboard: Nenhuma máquina filha encontrada`);
    }

    console.log(`🎯 Tipo de máquina detectado: EVA=${isEvaMode}, Multipostos=${isMultipostos}`);
  }, [childMachinesData, isEvaMode, isMultipostos, machineData, machine, contextoAtivo]);

  // 🔊 Detectar novas paradas via SSE e tocar som
  useEffect(() => {
    const paradaAtiva = machineData?.contexto?.parada_ativa;
    
    // Se há uma parada ativa (e não tinha antes), tocar som de alerta
    if (paradaAtiva) {
      console.log('🔊 Nova parada detectada - tocando som de alerta');
      playAlert();
    }
  }, [machineData?.contexto?.parada_ativa, playAlert]);

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
      
      // Fazer chamada direta para a API com a estação específica
      const result = await apiService.adicionarRejeitos({
        id_maquina: estacaoId, // ID da estação específica
        quantidade: 1,
        id_motivo_rejeito: 1
      });

      if (result.success) {
        console.log(`✅ Rejeito adicionado com sucesso para estação ${estacaoId}`);
        console.log(`🔄 Aguardando atualização via SSE...`);
        // A atualização virá via SSE através do evento 'rejeitos_adicionados'
              } else {
        console.error(`❌ Erro ao adicionar rejeito para estação ${estacaoId}:`, result.error);
        // TODO: Mostrar erro para usuário
      }
    } catch (error) {
      console.error(`❌ Erro ao adicionar rejeito para estação ${estacaoId}:`, error);
      // TODO: Mostrar erro para usuário
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

  // Handler para iniciar produção com mapa
  const handleStartProductionWithMap = async (mapaId: number, taloes: TalaoSelecionado[]) => {
    try {
      console.log('🎯 Iniciando produção com mapa:', { mapaId, taloes, isMultipostos, isEvaMode });

      // ✅ Preparar payload unificado
      const payload = {
        id_maquina: machine.id_maquina,
        id_mapa: mapaId,
        taloes: taloes.map(t => ({
          id_talao: t.id_talao,
          estacao_numero: t.estacao_numero,
          quantidade: t.quantidade,
          // Para máquinas simples, incluir tempo_ciclo_segundos
          // Para multipostos, esse campo pode ser opcional
          ...(t.tempo_ciclo_segundos && { tempo_ciclo_segundos: t.tempo_ciclo_segundos })
        }))
      };

      console.log('📤 Payload enviado:', payload);

      // ✅ Escolher endpoint baseado no tipo de máquina
      const isMultipostosOrEVA = isMultipostos || isEvaMode;
      const response = isMultipostosOrEVA
        ? await apiService.iniciarProducaoMapa(payload)  // POST /api/producao/iniciar
        : await apiService.iniciarProducaoSimples(payload);  // POST /api/producao/iniciar-s
      
      if (response.success) {
        console.log('✅ Produção iniciada com sucesso');
        playSuccess();
      } else {
        throw new Error(response.error || 'Erro ao iniciar produção');
      }
    } catch (error) {
      console.error('❌ Erro ao iniciar produção com mapa:', error);
      playError();
      throw error;
    }
  };

  // Handler for finishing session
  const handleFinishSession = async () => {
    try {
      console.log('🏁 Finalizando sessão para máquina:', machine.id_maquina);

      const response = await apiService.finalizarSessao({
        id_maquina: machine.id_maquina,
        id_operador: operator?.id_operador,
        id_sessao: sessionId || undefined,
        motivo: 'Sessão finalizada pelo operador'
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
  };

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

  // Handler para justificar parada (usa parada atual ou última parada)
  const handleJustifyStop = async (reasonId: number) => {
    try {
      const paradaAtiva = machineData?.contexto?.parada_ativa as any;
      const ultimaParada = (machineData?.contexto as any)?.ultima_parada;
      const paradaId = paradaAtiva?.id || ultimaParada?.id;
      if (!paradaId) {
        console.error('❌ Não há parada atual ou última parada para justificar');
        return;
      }

      console.log('🔄 Justificando parada:', { idParada: paradaId, idMotivo: reasonId });

      const response = await apiService.justificarParada(paradaId, reasonId);
      
      if (response.success) {
        console.log('✅ Parada justificada com sucesso');
        setShowJustifyModal(false);
        setIsManualStop(false);
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
        throw new Error(response.error || 'Erro ao justificar parada');
      }
    } catch (error) {
      console.error('❌ Erro ao justificar parada:', error);
      throw error;
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
  const handleConfirmForcedStop = async (reasonId: number) => {
    try {
      const jaParada = machineData?.contexto?.parada_ativa !== null;
      // Se já existe parada ativa, redirecionar para justificativa ao invés de criar nova parada
      if (jaParada) {
        console.warn('⚠️ Já existe uma parada ativa. Redirecionando para justificativa.');
        await handleJustifyStop(reasonId);
        return;
      }

      console.log('🛑 Confirmando parada forçada com motivo:', reasonId);
      playStop();

      const response = await forcarParada({
        id_maquina: machine.id_maquina,
        id_motivo: reasonId
      });

      if (response.success) {
        console.log('✅ Parada forçada iniciada com sucesso');
        playSuccess();
        setShowJustifyModal(false);
        setIsManualStop(false);
        // A atualização virá via SSE
                } else {
        throw new Error(response.error || 'Erro ao forçar parada');
      }
    } catch (error: any) {
      const msg = error?.message || '';
      const detail = (error?.detail || error?.response?.data?.detail || '').toString().toLowerCase();
      // Tratamento amigável quando backend indica que já existe parada ativa
      if (msg.includes('400') || msg.includes('500') || detail.includes('parada ativa')) {
        console.warn('⚠️ Backend informa que já há parada ativa. Abrindo justificativa.');
        await handleJustifyStop(reasonId);
        setShowJustifyModal(false);
        setIsManualStop(false);
        return;
      }
      console.error('❌ Erro ao forçar parada:', error);
      throw error;
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
        justifiedStopReason={null}
        sessionId={sessionId}
        machineId={machine.id_maquina}
        operadorId={operator?.id_operador || 0}
        onShowStops={() => console.log('🛑 Mostrar paradas - implementar')}
        onShowSettings={onShowSettings}
        onShowProductionCommands={() => setShowProductionCommands(true)}
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
        onJustifyStop={() => setShowJustifyModal(true)}
        currentStopJustified={Boolean(localStopJustified || (machineData?.contexto as any)?.ultima_parada_justificada === true || (machineData?.contexto as any)?.ultima_parada?.justificada === true)}
        wsData={machineData}
        justifiedStopReason={(() => {
          const ctx: any = machineData?.contexto || {};
          const hasLatest = ctx.parada_ativa || ctx.ultima_parada;
          const isJust = localStopJustified || ctx.ultima_parada_justificada === true || ctx.ultima_parada?.justificada === true;
          if (localStopJustified && localStopJustifiedReason) return localStopJustifiedReason;
          if (!hasLatest) return 'sem paradas para justificar';
          return isJust ? (ctx.ultima_parada_motivo || 'Justificada') : 'Parada não justificada';
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
      />

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'} pt-16 p-6`}>
        {/* Indicador de Produção Atual (local) */}
        {storedProduction && (
          <div className="mb-4 bg-green-600/20 border border-green-400/40 rounded-xl p-4 text-sm text-green-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 rounded-lg bg-green-500/30 border border-green-400/60 font-bold uppercase text-xs">Em Produção</span>
              <span className="font-semibold">Mapa #{storedProduction.id_mapa}</span>
              <span className="opacity-80">•</span>
              <span>{storedProduction.taloes.length} talão(ões) selecionado(s)</span>
            </div>
            <button
              className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20"
              onClick={() => {
                // Atualizar do localStorage manualmente em caso de mudanças externas
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
              }}
            >
              Atualizar
            </button>
          </div>
        )}
        {error && (
          <ErrorMessage message={error} />
        )}


        {/* Machine View */}
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

        {/* Child Machines (Estações) - Interface Especializada */}
        {childProductions.length > 0 && (
          <div className="mt-6">
            {isEvaMode ? (
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

        {/* Justificar Parada agora na Sidebar (removido botão flutuante) */}
    </div>
  );
}
