import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiService } from '../services/apiService';
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
  Play,
  CheckCircle2
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
  // ✅ NOVO: Parada forçada
  onForcedStop?: () => void;
  // ✅ NOVO: Justificar parada (ativa ou última)
  onJustifyStop?: () => void;
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
  onWsEndSession,
  onForcedStop, // ✅ NOVO
  onJustifyStop
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
  // ✅ Modo admin agora é detectado apenas pelo PIN 5777 no login (API REST)
  // Não precisamos mais verificar no Supabase
  React.useEffect(() => {
    const checkAdminMode = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Modo admin (Supabase auth) detectado no Sidebar');
        setIsAdminMode(true);
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

    // ✅ sessionId é opcional - backend só precisa de machineId
    let sessionToEnd = sessionId;
    if (!sessionToEnd) {
      console.log('⚠️ sessionId não disponível, mas backend só precisa de machineId - prosseguindo...');
    } else {
      console.log('✅ sessionId disponível:', sessionToEnd);
    }

    // Armazenar o sessionId para usar no encerramento (pode ser null)
    setCurrentSessionId(sessionToEnd);

    // ✅ Carregar dados do SSE (wsData - contexto)
    if (wsData && wsData.contexto) {
      const ctx = wsData.contexto;
      
      // Dados da máquina
      setMachineStats({
        velocidade: ctx.velocidade ?? 0,
        status: ctx.status ?? true,
        ultimo_sinal: ctx.last_updated ?? undefined
      });

      // ✅ Dados da sessão do SSE
      const sessaoOp = ctx.sessao_operador;
      if (sessaoOp) {
        const duracaoSegundos = sessaoOp.tempo_decorrido_segundos ?? sessaoOp.tempo_valido_segundos ?? 0;
        
        const stats: SessionStats = {
          quantidadeProduzida: sessaoOp.sinais_validos ?? sessaoOp.sinais ?? 0,
          quantidadeRejeito: sessaoOp.rejeitos ?? 0,
          duracaoSessao: formatDuration(duracaoSegundos),
          turno: sessaoOp.nome_turno ?? null,
          oee: {
            disponibilidade: 0, // Backend não envia no SSE
            performance: 0,
            qualidade: sessaoOp.sinais_validos > 0 ? (sessaoOp.sinais_validos / (sessaoOp.sinais_validos + sessaoOp.rejeitos)) : 1,
            oee: 0
          }
        };
        setSessionStats(stats);
        console.log('📊 Estatísticas da sessão carregadas do SSE:', stats);
      }
    } else {
      console.warn('⚠️ Sem dados SSE disponíveis para exibir no modal');
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
    
    try {
      console.log('🔚 Encerrando sessão via API REST');
      console.log('📤 Payload:', { id_maquina: machineId, id_sessao: currentSessionId || 'não disponível' });
      
      // ✅ Backend só precisa de id_maquina, id_sessao é opcional
      const response = await apiService.finalizarSessao({
        id_maquina: machineId,
        ...(currentSessionId ? { id_sessao: currentSessionId } : {}),
        motivo: 'Sessão finalizada pelo operador'
      });

      if (!response.success) {
        throw new Error(response.error || 'Erro ao finalizar sessão');
      }

      console.log('✅ Sessão finalizada com sucesso via API');

      // Limpar sessão salva do localStorage
      localStorage.removeItem('industrack_active_session');
      localStorage.removeItem('industrack_current_production');
      console.log('🧹 Dados da sessão removidos do localStorage');
      
    } catch (err) {
      console.error('❌ Erro durante o encerramento da sessão:', err);
      // Mesmo com erro, continuar logout local
    }
    
    // Logout do Supabase (modo admin)
    try {
      await supabase.auth.signOut();
      console.log('✅ Logout do Supabase concluído');
    } catch (err) {
      console.warn('⚠️ Erro no logout Supabase:', err);
    }
    
    console.log('🔄 Recarregando página...');
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
              bg-indigo-600 hover:bg-indigo-700 text-white transition-colors
              border border-indigo-400/40 shadow-lg shadow-indigo-900/30
              focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}
          >
            <Activity className="w-7 h-7" />
            <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
              Produção
            </span>
          </button>

          {/* Botão de Parada Forçada / Retomada */}
          {!isMachineStopped ? (
            <button
              onClick={onForcedStop || onShowStopReasonModal}
              disabled={!onForcedStop && !onShowStopReasonModal}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                bg-red-600 hover:bg-red-700 text-white transition-colors
                border border-red-400/50 shadow-lg shadow-red-900/30
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300
                ${isCollapsed ? 'justify-center' : 'justify-start'}
              `}
            >
              <Square className="w-7 h-7" />
              <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Parada Forçada
              </span>
            </button>
          ) : (
            <button
              onClick={onForcedResume}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                bg-green-600 hover:bg-green-700 text-white transition-colors
                border border-green-400/50 shadow-lg shadow-green-900/30
                focus:outline-none focus-visible:ring-2 focus-visible:ring-green-300
                ${isCollapsed ? 'justify-center' : 'justify-start'}
              `}
            >
              <Play className="w-7 h-7" />
              <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                Retomada
              </span>
            </button>
          )}

          {/* ✅ Controle de Justificativa de Parada (sempre mirando a última) */}
          {(() => {
            const contexto: any = wsData?.contexto || null;
            const latestParada = contexto?.parada_ativa || contexto?.ultima_parada || null;
            const hasLatestParada = !!latestParada;
            const isLatestJustified = !!currentStopJustified || (justifiedStopReason && justifiedStopReason !== 'Parada não justificada');

            if (hasLatestParada && !isLatestJustified) {
              // Mostrar botão para justificar (mesmo se a máquina estiver funcionando)
              return (
                <button
                  onClick={onJustifyStop}
                  disabled={!onJustifyStop}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    bg-amber-600 hover:bg-amber-700 text-white transition-colors
                    border border-amber-400/50 shadow-lg shadow-amber-900/30
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                >
                  <PauseCircle className="w-7 h-7" />
                  <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                    {contexto?.parada_ativa ? 'Justificar Parada' : 'Justificar Última Parada'}
                  </span>
                </button>
              );
            }

            if (hasLatestParada && isLatestJustified) {
              // Última parada já justificada -> mostrar estado "Justificada"
              return (
                <div
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    bg-green-600/20 text-green-300 border border-green-400/40
                    ${isCollapsed ? 'justify-center' : 'justify-start'}
                  `}
                >
                  <CheckCircle2 className="w-7 h-7" />
                  <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                    Justificada
                  </span>
                </div>
              );
            }

            // Sem paradas para justificar
            return (
              <div
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  bg-white/5 text-white/70 border border-white/10
                  ${isCollapsed ? 'justify-center' : 'justify-start'}
                `}
              >
                <PauseCircle className="w-7 h-7" />
                <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
                  sem paradas para justificar
                </span>
              </div>
            );
          })()}

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