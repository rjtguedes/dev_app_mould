import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { endSession, toBrasiliaTime, getBrasiliaTimestamp } from '../lib/session';
import type { Session } from '../types/session';
import { 
  Settings, 
  LogOut,
  Clock,
  AlertTriangle,
  PanelLeft,
  PanelLeftClose,
  PauseCircle,
  User,
  X,
  Activity,
  Square,
  Play
} from 'lucide-react';

interface SidebarProps {
  pendingStops: number;
  pendingStopStartTime: number | null;
  justifiedStopReason: string | null;
  sessionId: number | null;
  machineId: number;
  operadorId: number;
  onShowStops: () => void;
  onShowSettings: () => void;
  onShowProductionCommands: () => void;
  onCollapsedChange: (collapsed: boolean) => void;
  secondaryOperator: string | null;
  onShowPreStopModal: () => void;
  preSelectedStopReasonDesc: string | null;
  canPreJustify: boolean;
  onShowStopReasonModal: () => void;
  isMachineStopped: boolean;
  onForcedResume: () => void;
  currentStopJustified: boolean; // ✅ NOVO
  // ✅ NOVOS (WS)
  wsData?: any | null;
  onWsEndSession?: () => Promise<void>;
}

interface MachineStats {
  velocidade: number;
  status: boolean;
  ultimo_sinal?: number;
}

interface SessionStats {
  quantidadeProduzida: number;
  quantidadeRejeito: number;
  duracaoSessao: string;
  turno: string | null;
  oee: {
    disponibilidade: number;
    performance: number;
    qualidade: number;
    oee: number;
  };
}

export function Sidebar({ 
  pendingStops, 
  pendingStopStartTime,
  justifiedStopReason,
  sessionId,
  machineId,
  operadorId,
  onShowStops, 
  onShowSettings, 
  onShowProductionCommands,
  onShowPreStopModal,
  onCollapsedChange,
  secondaryOperator,
  preSelectedStopReasonDesc,
  canPreJustify,
  onShowStopReasonModal,
  isMachineStopped,
  onForcedResume,
  currentStopJustified, // ✅ NOVO
  wsData,
  onWsEndSession
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [machineStats, setMachineStats] = React.useState<MachineStats | null>(null);
  const [loadingStats, setLoadingStats] = React.useState(false);
  const [endingSession, setEndingSession] = React.useState(false);
  const [currentSessionId, setCurrentSessionId] = React.useState<number | null>(sessionId);
  const [sessionStats, setSessionStats] = React.useState<SessionStats | null>(null);
  const [loadingSessionStats, setLoadingSessionStats] = React.useState(false);
  const [errorModalMessage, setErrorModalMessage] = React.useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = React.useState(false);

  // Log quando sessionId mudar
  React.useEffect(() => {
    console.log('Sidebar - sessionId atualizado:', sessionId);
    setCurrentSessionId(sessionId);
  }, [sessionId]);

  // Detectar modo admin
  React.useEffect(() => {
    const checkAdminMode = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Buscar o operador associado ao usuário
        const { data: operatorData, error: operatorError } = await supabase
          .from('operador')
          .select('id')
          .eq('user', user.id)
          .eq('Delete', false)
          .single();

        if (!operatorError && operatorData) {
          // Verificar se este operador tem o PIN 5777
          const { data: fastAccessData, error: fastAccessError } = await supabase
            .from('operator_fast_acess')
            .select('PIN')
            .eq('operador', operatorData.id)
            .eq('PIN', 5777)
            .single();

          if (!fastAccessError && fastAccessData) {
            console.log('Modo admin detectado no Sidebar');
            setIsAdminMode(true);
          }
        }
      }
    };
    checkAdminMode();
  }, []);

  const handleCollapse = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    onCollapsedChange?.(collapsed);
  };

  const handleLogoutClick = async () => {
    console.log('=== INÍCIO handleLogoutClick ===');
    console.log('sessionId disponível:', sessionId);
    console.log('machineId disponível:', machineId);
    
    if (!machineId) {
      console.log('Nenhum machineId disponível');
      return;
    }

    // Se não há sessionId, tentar criar uma sessão ou buscar uma existente
    let sessionToEnd = sessionId;
    if (!sessionToEnd) {
      console.log('Nenhum sessionId disponível, tentando buscar sessão...');
      
      try {
        // Primeiro buscar o usuário atual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('Usuário não encontrado');
          return;
        }

        // Buscar o operador
        const { data: operatorData, error: operatorError } = await supabase
          .from('operador')
          .select('id')
          .eq('user', user.id)
          .eq('Delete', false)
          .single();

        if (operatorError || !operatorData) {
          console.error('Erro ao buscar operador:', operatorError);
          return;
        }

        // Verificar se há sessão ativa
        const { data: sessions, error: sessionsError } = await supabase
          .from('sessoes')
          .select('id')
          .eq('operador', operatorData.id)
          .eq('maquina', machineId)
          .is('fim', null)
          .order('created_at', { ascending: false })
          .limit(1);

        if (sessionsError) {
          console.error('Erro ao buscar sessões:', sessionsError);
          return;
        }

        if (sessions && sessions.length > 0) {
          sessionToEnd = sessions[0].id;
          console.log('Sessão ativa encontrada:', sessionToEnd);
        } else {
          // NÃO criar nova sessão aqui - apenas informar que não há sessão
          console.log('Nenhuma sessão ativa encontrada - não é possível encerrar');
          setErrorModalMessage('Nenhuma sessão ativa encontrada para encerrar');
          return;
        }
      } catch (err) {
        console.error('Erro ao buscar/criar sessão:', err);
        return;
      }
    }

    // Armazenar o sessionId para usar no encerramento
    setCurrentSessionId(sessionToEnd);

    // Carregar dados: priorizar WebSocket (wsData)
    if (wsData) {
      setMachineStats({
        velocidade: wsData.velocidade ?? 0,
        status: !(wsData.parada_ativa),
        ultimo_sinal: wsData.last_updated ?? undefined
      });
    } else {
      // Fallback: machine_stats (legado)
      setLoadingStats(true);
      try {
        const { data, error } = await supabase
          .from('machine_stats')
          .select('velocidade, status, ultimo_sinal')
          .eq('id_maquina', machineId)
          .single();
        if (error) {
          console.error('Erro ao carregar machine_stats:', error);
          setMachineStats(null);
        } else {
          setMachineStats(data);
        }
      } catch (err) {
        console.error('Erro ao carregar machine_stats:', err);
        setMachineStats(null);
      } finally {
        setLoadingStats(false);
      }
    }

    // Carregar estatísticas da sessão
    if (sessionToEnd) {
      await loadSessionStats(sessionToEnd, machineId);
    }

    // Mostrar modal de confirmação
    setShowLogoutModal(true);
  };

  const handleForceLogout = async () => {
    console.log('=== INÍCIO handleForceLogout (Modo Admin) ===');
    console.log('Modo admin - fazendo logout simples sem encerrar sessão');
    
    await supabase.auth.signOut();
    console.log('Logout do Supabase concluído');
    
    console.log('Recarregando página...');
    window.location.reload();
  };

  const handleConfirmLogout = async () => {
    console.log('=== INÍCIO handleConfirmLogout ===');
    setEndingSession(true);
    
    if (currentSessionId) {
      try {
        console.log('Encerrando sessão via Sidebar, sessionId:', currentSessionId);
        
        // 1. Enviar comando WS para finalizar sessão (se disponível)
        if (onWsEndSession) {
          try {
            console.log('Enviando comando WebSocket para finalizar sessão...');
            await onWsEndSession();
          } catch (wsErr) {
            console.warn('Falha ao finalizar sessão via WS (seguindo com Supabase):', wsErr);
          }
        }

        // 2. Encerrar paradas pendentes
        console.log('2. Verificando e encerrando paradas pendentes...');
        const { data: pendingStops, error: pendingStopsError } = await supabase
          .from('paradas_redis')
          .select('id, inicio_unix_segundos')
          .eq('id_sessao', currentSessionId)
          .is('fim_unix_segundos', null);

        if (pendingStopsError) {
          console.error('Erro ao buscar paradas pendentes:', pendingStopsError);
        } else if (pendingStops && pendingStops.length > 0) {
          console.log('Encerrando paradas pendentes:', pendingStops.length);
          
          const now = Math.floor(Date.now() / 1000);
          for (const stop of pendingStops) {
            const { error: updateError } = await supabase
              .from('paradas_redis')
              .update({ fim_unix_segundos: now })
              .eq('id', stop.id);
            
            if (updateError) {
              console.error('Erro ao encerrar parada:', stop.id, updateError);
            } else {
              console.log('Parada encerrada:', stop.id);
            }
          }
        } else {
          console.log('Nenhuma parada pendente encontrada');
        }

        // 3. Encerrar a sessão no Supabase
        console.log('3. Encerrando a sessão...');
        await endSession(currentSessionId);
        console.log('Sessão encerrada com sucesso');

        // 3. Criar registro na tabela OEE
        if (sessionStats && machineId) {
          console.log('3. Criando registro OEE...');
          
          // Buscar dados da sessão para o registro OEE
          const { data: sessionData, error: sessionError } = await supabase
            .from('sessoes')
            .select('inicio, fim, turno')
            .eq('id', currentSessionId)
            .single();

          if (sessionError) {
            console.error('Erro ao buscar dados da sessão para OEE:', sessionError);
          } else {
            const sessionEnd = sessionData.fim || Math.floor(Date.now() / 1000);
            const sessionStart = sessionData.inicio;
            const duration = sessionEnd - sessionStart;
            
            // Calcular minutos disponível e parada
            const minutosDisponivel = Math.floor((duration - (sessionStats.oee.disponibilidade / 100 * duration)) / 60);
            const minutosParada = Math.floor((sessionStats.oee.disponibilidade / 100 * duration) / 60);

            const oeeData = {
              id_maquina: machineId,
              id_turno: sessionData.turno,
              inicio_turno: toBrasiliaTime(sessionStart),
              fim_turno: toBrasiliaTime(sessionEnd),
              disponibilidade: sessionStats.oee.disponibilidade,
              desempenho: sessionStats.oee.performance,
              qualidade: sessionStats.oee.qualidade,
              pecas_produzidas: sessionStats.quantidadeProduzida,
              pecas_refugadas: sessionStats.quantidadeRejeito,
              minutos_disponivel: minutosDisponivel,
              minutos_parada: minutosParada,
              oee: sessionStats.oee.oee,
              data: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-'),
              timestamp_epoch_inicio_turno: sessionStart,
              tempo_operacao: Math.floor(duration / 60),
              sessao: currentSessionId
            };

            const { data: oeeRecord, error: oeeError } = await supabase
              .from('OEE')
              .insert(oeeData)
              .select()
              .single();

            if (oeeError) {
              console.error('Erro ao criar registro OEE:', oeeError);
            } else {
              console.log('Registro OEE criado com sucesso:', oeeRecord.id);
            }
          }
        }

        // 4. Zerar estatísticas da máquina principal
        console.log('4. Zerando estatísticas da máquina principal...');
        const { error: resetMainMachineError } = await supabase
          .from('machine_stats')
          .update({
            produzido: 0,
            rejeitos: 0,
            disponibilidade: 0,
            desempenho: 0,
            qualidade: 0,
            oee: 0,
            minutos_disponivel: 0,
            minutos_parada: 0,
            producao_teorica: 0,
            velocidade: 0,
            ultimo_sinal: null,
            id_parada_atual: null,
            ligada: false
          })
          .eq('id_maquina', machineId);

        if (resetMainMachineError) {
          console.error('Erro ao zerar estatísticas da máquina principal:', resetMainMachineError);
        } else {
          console.log('Estatísticas da máquina principal zeradas com sucesso');
        }

        // 5. Buscar e zerar estatísticas das máquinas filhas
        console.log('5. Buscando e zerando estatísticas das máquinas filhas...');
        const { data: childMachines, error: childMachinesError } = await supabase
          .from('Maquinas')
          .select('id_maquina')
          .eq('maquina_pai', machineId);

        if (childMachinesError) {
          console.error('Erro ao buscar máquinas filhas:', childMachinesError);
        } else if (childMachines && childMachines.length > 0) {
          console.log(`Encontradas ${childMachines.length} máquinas filhas`);
          
          for (const childMachine of childMachines) {
            const { error: resetChildError } = await supabase
              .from('machine_stats')
              .update({
                produzido: 0,
                rejeitos: 0,
                disponibilidade: 0,
                desempenho: 0,
                qualidade: 0,
                oee: 0,
                minutos_disponivel: 0,
                minutos_parada: 0,
                producao_teorica: 0,
                velocidade: 0,
                ultimo_sinal: null,
                id_parada_atual: null,
                ligada: false
              })
              .eq('id_maquina', childMachine.id_maquina);

            if (resetChildError) {
              console.error(`Erro ao zerar estatísticas da máquina filha ${childMachine.id_maquina}:`, resetChildError);
            } else {
              console.log(`Estatísticas da máquina filha ${childMachine.id_maquina} zeradas com sucesso`);
            }
          }
        } else {
          console.log('Nenhuma máquina filha encontrada');
        }

        // 6. Registro na tabela encerramento_sessao agora é criado automaticamente pela função endSession
        console.log('6. Registro de encerramento será criado automaticamente pela função endSession');

        console.log('=== FLUXO DE ENCERRAMENTO CONCLUÍDO COM SUCESSO ===');
        
      } catch (err) {
        console.error('Erro durante o encerramento da sessão:', err);
      }
    }
    
    console.log('Fazendo logout do Supabase...');
    await supabase.auth.signOut();
    console.log('Logout do Supabase concluído');
    
    console.log('Recarregando página...');
    window.location.reload();
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
    setMachineStats(null);
    setSessionStats(null);
    setEndingSession(false);
    setErrorModalMessage(null);
  };

  const formatLastSignal = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('pt-BR');
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const loadSessionStats = async (sessionId: number, machineId: number) => {
    setLoadingSessionStats(true);
    try {
      console.log('Carregando estatísticas da sessão:', sessionId);

      // Buscar dados da sessão
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessoes')
        .select(`
          id,
          inicio,
          fim,
          turno,
          turnos (
            descricao
          )
        `)
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('Erro ao buscar dados da sessão:', sessionError);
        return;
      }

      // Calcular duração da sessão
      const now = Math.floor(Date.now() / 1000);
      const sessionStart = sessionData.inicio;
      const sessionEnd = sessionData.fim || now;
      const duration = sessionEnd - sessionStart;

      // Buscar dados diretos da tabela machine_stats
      const { data: machineStatsData, error: machineStatsError } = await supabase
        .from('machine_stats')
        .select('produzido, rejeitos, disponibilidade, desempenho, qualidade, oee')
        .eq('id_maquina', machineId)
        .single();

      if (machineStatsError) {
        console.error('Erro ao buscar machine_stats:', machineStatsError);
        return;
      }

      // Usar dados diretos da machine_stats
      const quantidadeProduzida = machineStatsData?.produzido || 0;
      const quantidadeRejeito = machineStatsData?.rejeitos || 0;
      const disponibilidade = machineStatsData?.disponibilidade || 0;
      const performance = machineStatsData?.desempenho || 0;
      const qualidade = machineStatsData?.qualidade || 0;
      const oee = machineStatsData?.oee || 0;

      const stats: SessionStats = {
        quantidadeProduzida,
        quantidadeRejeito,
        duracaoSessao: formatDuration(duration),
        turno: sessionData.turnos?.descricao || null,
        oee: {
          disponibilidade: Math.round(disponibilidade * 100) / 100,
          performance: Math.round(performance * 100) / 100,
          qualidade: Math.round(qualidade * 100) / 100,
          oee: Math.round(oee * 100) / 100
        }
      };

      console.log('Estatísticas da sessão carregadas:', stats);
      setSessionStats(stats);
    } catch (err) {
      console.error('Erro ao carregar estatísticas da sessão:', err);
    } finally {
      setLoadingSessionStats(false);
    }
  };

  return (
    <>
    <div 
      className={`
        fixed left-0 top-0 h-full bg-black/30 backdrop-blur-md border-r border-white/10
        transition-all duration-300 z-40
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Toggle Button */}
      <button
        onClick={() => handleCollapse(!isCollapsed)}
        className="absolute -right-4 top-6 p-2 bg-black/30 rounded-full 
                   hover:bg-black/40 transition-colors border border-white/10 hover:scale-110"
      >
        {isCollapsed ? (
          <PanelLeft className="w-4 h-4 text-white" />
        ) : (
          <PanelLeftClose className="w-4 h-4 text-white" />
        )}
      </button>

      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <img 
          src="https://oixnkjcvkfdimwoikzgl.supabase.co/storage/v1/object/public/Industrack//industrack_versao_dark.svg"
          alt="Industrack Logo"
          className={`h-8 transition-all duration-300 ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>

      {/* Menu Items */}
      <div className="flex flex-col h-[calc(100%-5rem)] justify-between p-2">
        <div className="space-y-2">
          <button
            onClick={onShowProductionCommands}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              hover:bg-white/10 transition-colors text-white
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}
          >
            <Activity className="w-7 h-7" />
            <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
              Produção
            </span>
          </button>

          {/* Botão de Parada Manual / Retomada */}
          {!isMachineStopped ? (
            <button
              onClick={onShowStopReasonModal}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                hover:bg-red-500/20 transition-colors text-white
                border border-red-500/30
                ${isCollapsed ? 'justify-center' : 'justify-start'}
              `}
            >
              <Square className="w-7 h-7" />
              <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Parada Manual
              </span>
            </button>
          ) : (
            <button
              onClick={onForcedResume}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                hover:bg-green-500/20 transition-colors text-white
                border border-green-500/30
                ${isCollapsed ? 'justify-center' : 'justify-start'}
              `}
            >
              <Play className="w-7 h-7" />
              <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Retomada
              </span>
            </button>
          )}

          {/* Botão para parada em andamento - só mostrar quando relevante */}
          {(pendingStops > 0 || justifiedStopReason === 'Parada não justificada') && (
          <button
            onClick={onShowStops}
            className={`
                w-full flex items-center gap-3 px-4 py-4 rounded-xl
                transition-all duration-300 text-white relative
              ${isCollapsed ? 'justify-center' : 'justify-start'}
                ${currentStopJustified 
                  ? 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/25 border-2 border-green-400/50'
                  : pendingStops > 0 
                    ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/25 border-2 border-red-400/50' 
                    : 'bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/25 border-2 border-orange-400/50'
                }
                hover:scale-105 active:scale-95
              `}
            >
              <PauseCircle className={`w-8 h-8 ${
                currentStopJustified
                  ? 'text-green-200'
                  : pendingStops > 0 
                    ? 'text-red-200' 
                    : 'text-orange-200'
              }`} />
              <div className={`flex flex-col items-start ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                <span className={`text-base font-bold ${
                  currentStopJustified
                    ? 'text-green-100'
                    : pendingStops > 0 
                      ? 'text-red-100' 
                      : 'text-orange-100'
                }`}>
                  {currentStopJustified
                    ? '✓ Parada Justificada' 
                    : pendingStops > 0 
                      ? 'Justificar Parada' 
                      : 'Parada Não Justificada'
                  }
                </span>
                
                {pendingStops > 0 && pendingStopStartTime && !currentStopJustified && (
                  <span className="text-sm text-red-200/80">
                    Início: {new Date(pendingStopStartTime * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                
                {/* ✅ NOVO: Indicador quando a parada atual foi justificada */}
                {currentStopJustified && (
                  <div className="mt-2 p-2 rounded-lg border bg-green-600/20 border-green-400/30">
                    <span className="text-xs font-medium text-green-300">
                      ✓ Justificativa Registrada:
                    </span>
                    <div className="text-xs mt-1 text-green-200">
                      Parada já foi justificada via WebSocket
                    </div>
                  </div>
                )}
                
                {justifiedStopReason === 'Parada não justificada' && !currentStopJustified && (
                  <div className="mt-2 p-2 rounded-lg border bg-orange-600/20 border-orange-400/30">
                    <span className="text-xs font-medium text-orange-300">
                      Ação Necessária:
                    </span>
                    <div className="text-xs mt-1 text-orange-200">
                      Clique para justificar esta parada
                    </div>
                  </div>
                )}

                {/* Indicador de status da parada */}
                {justifiedStopReason && justifiedStopReason !== 'Parada não justificada' && (
                  <div className="mt-2 p-2 rounded-lg border bg-blue-600/20 border-blue-400/30">
                    <span className="text-xs font-medium text-blue-300">
                      Status:
                    </span>
                    <div className="text-xs mt-1 text-blue-200">
                      Parada justificada: {justifiedStopReason}
                    </div>
                  </div>
                )}

                {/* Indicador quando máquina está parada e parada já foi justificada */}
                {!canPreJustify && justifiedStopReason && justifiedStopReason !== 'Parada não justificada' && (
                  <div className="mt-2 p-2 rounded-lg border bg-yellow-600/20 border-yellow-400/30">
                    <span className="text-xs font-medium text-yellow-300">
                      ⏸️ Máquina Parada
            </span>
                    <div className="text-xs mt-1 text-yellow-200">
                      Parada já justificada: {justifiedStopReason}
                    </div>
                    <div className="text-xs mt-1 text-yellow-300/80">
                      Aguarde a máquina voltar a funcionar para pré-justificar próxima parada
                    </div>
                  </div>
                )}
              </div>
              
            {pendingStops > 0 && (
              <span className={`
                  absolute bg-red-500 text-white text-sm font-bold rounded-full min-w-[24px] h-6 px-2
                  flex items-center justify-center shadow-lg
                  ${isCollapsed ? '-top-2 -right-2' : 'top-2 right-3'}
                  animate-pulse
              `}>
                {pendingStops > 99 ? '99+' : pendingStops}
              </span>
            )}
              
              {justifiedStopReason === 'Parada não justificada' && (
                <span className={`
                  absolute bg-orange-500 text-white text-sm font-bold rounded-full min-w-[24px] h-6 px-2
                  flex items-center justify-center shadow-lg
                  ${isCollapsed ? '-top-2 -right-2' : 'top-2 right-3'}
                  animate-pulse
                `}>
                  !
              </span>
            )}
          </button>
          )}

                {/* Botão Informar Parada - só mostrar quando NÃO há parada em andamento E máquina está funcionando */}
                {pendingStops === 0 && justifiedStopReason !== 'Parada não justificada' && canPreJustify && (
                  <button
                    onClick={onShowPreStopModal}
                    className={`
                      w-full flex items-center gap-3 px-4 py-4 rounded-xl
                      transition-all duration-300 text-white relative
                      ${isCollapsed ? 'justify-center' : 'justify-start'}
                      ${preSelectedStopReasonDesc 
                        ? 'bg-yellow-600 hover:bg-yellow-700 shadow-lg shadow-yellow-500/25 border-2 border-yellow-400/50' 
                        : 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/25 border-2 border-green-400/50'
                      }
                      hover:scale-105 active:scale-95
                    `}
                  >
                    <AlertTriangle className={`w-8 h-8 ${preSelectedStopReasonDesc ? 'text-yellow-200' : 'text-green-200'}`} />
                    <div className={`flex flex-col items-start ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                      <span className={`text-base font-bold ${preSelectedStopReasonDesc ? 'text-yellow-100' : 'text-green-100'}`}>
                        {preSelectedStopReasonDesc ? 'Motivo Pré-selecionado' : 'Informar Parada'}
                      </span>
                      <span className={`text-sm ${preSelectedStopReasonDesc ? 'text-yellow-200/80' : 'text-green-200/80'}`}>
                        {preSelectedStopReasonDesc || 'Pré-selecionar motivo'}
                      </span>
                    </div>
                  </button>
                )}

            {/* Operador Secundário */}
            {secondaryOperator && (
              <div className={`
                px-3 py-2 bg-blue-500/20 border border-blue-400/30 rounded-lg
                ${isCollapsed ? 'mx-2' : ''}
              `}>
                <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                  <User className="w-5 h-5 text-blue-300" />
                  <div className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                    <p className="text-blue-200 text-xs">Operador Secundário:</p>
                    <p className="text-white text-sm font-medium">{secondaryOperator}</p>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Bottom Section */}
        <div className="space-y-2">
          <button
            onClick={onShowSettings}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              hover:bg-white/10 transition-colors text-blue-200
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}
          >
            <Settings className="w-7 h-7" />
            <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
              Configurações
            </span>
          </button>

          <button
              onClick={handleLogoutClick}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
              hover:bg-red-500/20 transition-colors text-red-300
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}
              title="Encerrar sessão atual"
          >
            <LogOut className="w-7 h-7" />
            <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
              Encerrar Sessão
            </span>
          </button>

          {isAdminMode && (
            <button
              onClick={handleForceLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                        hover:bg-red-500/20 transition-colors text-red-300
                        justify-start"
              title="Forçar logout (modo admin)"
            >
              <LogOut className="w-7 h-7" />
              <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Forçar Logout
              </span>
            </button>
          )}
        </div>
      </div>
    </div>

      {/* Modal de Confirmação de Logout */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
                Confirmar Encerramento da Sessão
              </h3>
              <button
                onClick={handleCancelLogout}
                className="text-gray-400 hover:text-white transition-colors"
                disabled={endingSession}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {errorModalMessage && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4 text-red-200 text-center">
                  {errorModalMessage}
                </div>
              )}
              <p className="text-gray-300 text-lg">
                Tem certeza que deseja encerrar a sessão? Esta ação irá registrar a hora de fim na tabela de sessões.
              </p>

              {/* Grid Layout para melhor organização */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Session Stats */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-300 mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Estatísticas da Sessão
                  </h4>
                  
                  {loadingSessionStats ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                    </div>
                  ) : sessionStats ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-700 rounded-lg p-3">
                          <div className="text-gray-400 text-sm mb-1">Produzido</div>
                          <div className="text-green-400 font-bold text-xl">{sessionStats.quantidadeProduzida} un</div>
                        </div>
                        <div className="bg-gray-700 rounded-lg p-3">
                          <div className="text-gray-400 text-sm mb-1">Rejeitos</div>
                          <div className="text-red-400 font-bold text-xl">{sessionStats.quantidadeRejeito} un</div>
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3">
                        <div className="text-gray-400 text-sm mb-1">Duração</div>
                        <div className="text-white font-mono text-xl">{sessionStats.duracaoSessao}</div>
                      </div>
                      {sessionStats.turno && (
                        <div className="bg-gray-700 rounded-lg p-3">
                          <div className="text-gray-400 text-sm mb-1">Turno</div>
                          <div className="text-blue-400 font-bold text-lg">{sessionStats.turno}</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      Não foi possível carregar as estatísticas da sessão
                    </div>
                  )}
                </div>

                {/* OEE Stats */}
                {sessionStats && (
                  <div className="bg-gray-800 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-300 mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Indicadores OEE
                    </h4>
                    <div className="space-y-4">
                      <div className="bg-gray-700 rounded-lg p-3">
                        <div className="text-gray-400 text-sm mb-1">Disponibilidade</div>
                        <div className={`font-bold text-xl ${sessionStats.oee.disponibilidade >= 80 ? 'text-green-400' : sessionStats.oee.disponibilidade >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {sessionStats.oee.disponibilidade}%
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3">
                        <div className="text-gray-400 text-sm mb-1">Performance</div>
                        <div className={`font-bold text-xl ${sessionStats.oee.performance >= 80 ? 'text-green-400' : sessionStats.oee.performance >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {sessionStats.oee.performance}%
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-3">
                        <div className="text-gray-400 text-sm mb-1">Qualidade</div>
                        <div className={`font-bold text-xl ${sessionStats.oee.qualidade >= 80 ? 'text-green-400' : sessionStats.oee.qualidade >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {sessionStats.oee.qualidade}%
                        </div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4 border-2 border-gray-600">
                        <div className="text-gray-300 font-bold text-sm mb-1">OEE Total</div>
                        <div className={`font-bold text-2xl ${sessionStats.oee.oee >= 80 ? 'text-green-400' : sessionStats.oee.oee >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {sessionStats.oee.oee}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Machine Stats */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Status da Máquina
                </h4>
                
                {loadingStats ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                  </div>
                ) : machineStats ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-1">Velocidade</div>
                      <div className="text-white font-bold text-xl">{machineStats.velocidade} RPM</div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-gray-400 text-sm mb-1">Status</div>
                      <div className={`font-bold text-xl ${machineStats.status ? 'text-green-400' : 'text-red-400'}`}>
                        {machineStats.status ? 'Ativo' : 'Parado'}
                      </div>
                    </div>
                    {machineStats.ultimo_sinal && (
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="text-gray-400 text-sm mb-1">Último Sinal</div>
                        <div className="text-white font-mono text-lg">
                          {formatLastSignal(machineStats.ultimo_sinal)}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-8">
                    Não foi possível carregar os dados da máquina
                  </div>
                )}
              </div>

              {/* Session Info */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-300 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Informações da Sessão
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">ID da Sessão</div>
                    <div className="text-white font-mono text-lg">{currentSessionId}</div>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Hora de Fim</div>
                    <div className="text-white font-mono text-lg">
                      {new Date().toLocaleTimeString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-4 mt-8">
              <button
                onClick={handleCancelLogout}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                disabled={endingSession}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                disabled={endingSession}
              >
                {endingSession ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Encerrando...
                  </>
                ) : (
                  'Finalizar Sessão'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}