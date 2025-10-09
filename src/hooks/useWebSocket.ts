import { useState, useEffect, useRef, useCallback } from 'react';
import type { 
  WebSocketCommand, 
  WebSocketEvent,
  WebSocketState,
  MachineDataEvent,
  SignalEvent,
  RejectEvent,
  VelocityEvent,
  StopEvent,
  ResumeEvent,
  StartSessionAckEvent,
  EndSessionAckEvent,
  ErrorEvent
} from '../types/websocket';

// Configuração do WebSocket
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://10.200.0.184:8765';
const BASE_RECONNECT_INTERVAL = 5000; // 5 segundos (base)
const MAX_RECONNECT_INTERVAL = 60000; // 1 minuto (máximo)
const MAX_RECONNECT_ATTEMPTS = 5; // Reduzido para 5 tentativas
const PING_TIMEOUT = 60000; // 60 segundos sem ping = considerar desconectado
const RECONNECT_JITTER = 1000; // Jitter para evitar reconexões sincronizadas

interface UseWebSocketOptions {
  machineId: number;
  onMachineData?: (event: MachineDataEvent) => void;
  onSignal?: (event: SignalEvent) => void;
  onReject?: (event: RejectEvent) => void;
  onVelocity?: (event: VelocityEvent) => void;
  onStop?: (event: StopEvent) => void;
  onResume?: (event: ResumeEvent) => void;
  onStartSessionAck?: (event: StartSessionAckEvent) => void;
  onEndSessionAck?: (event: EndSessionAckEvent) => void;
  onError?: (event: ErrorEvent) => void;
  autoConnect?: boolean;
}

export function useWebSocket({
  machineId,
  onMachineData,
  onSignal,
  onReject,
  onVelocity,
  onStop,
  onResume,
  onStartSessionAck,
  onEndSessionAck,
  onError,
  autoConnect = true
}: UseWebSocketOptions) {
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    lastPing: null
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Limpar timeout de ping
  const clearPingTimeout = useCallback(() => {
    if (pingTimeoutRef.current) {
      clearTimeout(pingTimeoutRef.current);
      pingTimeoutRef.current = null;
    }
  }, []);

  // Configurar timeout de ping
  const setupPingTimeout = useCallback(() => {
    clearPingTimeout();
    pingTimeoutRef.current = setTimeout(() => {
      console.warn('⚠️ WebSocket: Sem ping do servidor há mais de 60s');
      // Reconectar se não houver ping
      if (wsRef.current) {
        wsRef.current.close();
      }
    }, PING_TIMEOUT);
  }, [clearPingTimeout]);

  // Processar eventos recebidos
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: WebSocketEvent = JSON.parse(event.data);
      console.log('📥 WebSocket evento recebido:', data.type, data);

      switch (data.type) {
        case 'machine_data':
          onMachineData?.(data as MachineDataEvent);
          break;
        
        case 'sinal':
          onSignal?.(data as SignalEvent);
          break;
        
        case 'rejeito':
          onReject?.(data as RejectEvent);
          break;
        
        case 'velocidade':
          onVelocity?.(data as VelocityEvent);
          break;
        
        case 'parada':
          onStop?.(data as StopEvent);
          break;
        
        case 'retomada':
          onResume?.(data as ResumeEvent);
          break;
        
        case 'start_session_ack':
          onStartSessionAck?.(data as StartSessionAckEvent);
          break;
        
        case 'end_session_ack':
          onEndSessionAck?.(data as EndSessionAckEvent);
          break;
        
        case 'ping':
          // Atualizar timestamp do último ping
          setState(prev => ({ ...prev, lastPing: Date.now() }));
          setupPingTimeout();
          break;
        
        case 'error':
          console.error('❌ WebSocket erro:', data);
          onError?.(data as ErrorEvent);
          setState(prev => ({ ...prev, error: (data as ErrorEvent).message }));
          break;
        
        default:
          console.warn('⚠️ WebSocket evento desconhecido:', data.type);
      }
    } catch (error) {
      console.error('❌ Erro ao processar mensagem WebSocket:', error);
    }
  }, [
    onMachineData, 
    onSignal, 
    onReject, 
    onVelocity, 
    onStop, 
    onResume, 
    onStartSessionAck, 
    onEndSessionAck, 
    onError,
    setupPingTimeout
  ]);

  // Conectar ao WebSocket
  const connect = useCallback(() => {
    // Verificar se o componente ainda está montado
    if (!isMountedRef.current) {
      console.log('⚠️ Tentativa de conectar WebSocket em componente desmontado, ignorando');
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket já está conectado');
      return;
    }

    if (state.connecting) {
      console.log('⏳ WebSocket já está tentando conectar');
      return;
    }

    console.log(`🔌 Conectando ao WebSocket: ${WS_URL}?machine_id=${machineId}`);
    
    // Só atualizar estado se o componente estiver montado
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, connecting: true, error: null }));
    }

    try {
      const ws = new WebSocket(`${WS_URL}?machine_id=${machineId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket conectado');
        // Verificar se o componente ainda está montado
        if (isMountedRef.current) {
          setState({
            connected: true,
            connecting: false,
            error: null,
            lastPing: Date.now()
          });
          reconnectAttemptsRef.current = 0;
          setupPingTimeout();
        } else {
          console.log('⚠️ WebSocket conectado, mas componente já foi desmontado');
          // Fechar a conexão se o componente foi desmontado
          ws.close();
        }
      };

      ws.onmessage = (event) => {
        // Verificar se o componente ainda está montado antes de processar mensagens
        if (isMountedRef.current) {
          handleMessage(event);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket erro:', error);
        // Verificar se o componente ainda está montado
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            connecting: false,
            error: 'Erro na conexão WebSocket'
          }));
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket desconectado:', event.code, event.reason);
        
        // Verificar se o componente ainda está montado
        if (!isMountedRef.current) {
          console.log('⚠️ WebSocket fechado, mas componente já foi desmontado - não tentando reconectar');
          wsRef.current = null;
          return;
        }
        
        setState({
          connected: false,
          connecting: false,
          error: event.reason || 'Conexão fechada',
          lastPing: null
        });
        clearPingTimeout();
        wsRef.current = null;

        // Tentar reconectar com backoff exponencial
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          // Calcular intervalo com backoff exponencial
          // Fórmula: min(base * 2^attempt, max) + jitter aleatório
          const attempt = reconnectAttemptsRef.current + 1;
          const backoff = Math.min(
            BASE_RECONNECT_INTERVAL * Math.pow(2, attempt),
            MAX_RECONNECT_INTERVAL
          );
          
          // Adicionar jitter para evitar reconexões sincronizadas
          const jitter = Math.random() * RECONNECT_JITTER;
          const delay = Math.floor(backoff + jitter);
          
          reconnectAttemptsRef.current = attempt;
          
          console.log(
            `🔄 Tentando reconectar (${attempt}/${MAX_RECONNECT_ATTEMPTS}) em ${Math.round(delay / 1000)}s...`
          );
          
          reconnectTimeoutRef.current = setTimeout(() => {
            // Verificar se o componente ainda está montado antes de tentar reconectar
            if (isMountedRef.current && wsRef.current === null) {
              connect();
            } else if (!isMountedRef.current) {
              console.log('⚠️ Não reconectando pois componente foi desmontado');
            }
          }, delay);
        } else {
          console.error('❌ Número máximo de tentativas de reconexão atingido');
          
          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              error: 'Falha ao reconectar ao servidor. Tente recarregar a página.'
            }));
          }
          
          // Parar de tentar por um tempo mais longo antes de tentar novamente
          reconnectTimeoutRef.current = setTimeout(() => {
            // Verificar se o componente ainda está montado
            if (isMountedRef.current) {
              // Resetar contador e tentar novamente após um longo intervalo
              reconnectAttemptsRef.current = 0;
              console.log('🔄 Tentando reconexão final após pausa longa...');
              connect();
            }
          }, MAX_RECONNECT_INTERVAL * 2); // 2 minutos
        }
      };

    } catch (error) {
      console.error('❌ Erro ao criar WebSocket:', error);
      setState({
        connected: false,
        connecting: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        lastPing: null
      });
    }
  }, [machineId, state.connecting, handleMessage, setupPingTimeout, clearPingTimeout]);

  // Desconectar do WebSocket
  const disconnect = useCallback(() => {
    console.log('🔌 Desconectando WebSocket...');
    
    // Limpar timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    clearPingTimeout();

    // Fechar conexão
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setState({
      connected: false,
      connecting: false,
      error: null,
      lastPing: null
    });
  }, [clearPingTimeout]);

  // Enviar comando
  const sendCommand = useCallback((command: WebSocketCommand) => {
    // Verificar se o WebSocket está pronto para enviar mensagens
    if (!wsRef.current) {
      console.error('❌ WebSocket não inicializado');
      throw new Error('WebSocket não inicializado');
    }
    
    if (wsRef.current.readyState === WebSocket.CONNECTING) {
      console.warn('⚠️ WebSocket ainda está se conectando, enfileirando comando...');
      // Aguardar conexão e tentar novamente
      const maxRetries = 3;
      let retryCount = 0;
      
      const tryToSend = () => {
        if (retryCount >= maxRetries) {
          console.error(`❌ Falha ao enviar comando após ${maxRetries} tentativas`);
          throw new Error(`Falha ao enviar comando após ${maxRetries} tentativas`);
        }
        
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log(`📤 Enviando comando (tentativa ${retryCount + 1}):`, command.type, command);
          wsRef.current.send(JSON.stringify(command));
        } else {
          retryCount++;
          console.warn(`⏳ WebSocket não está pronto, tentativa ${retryCount}/${maxRetries} em 1s...`);
          setTimeout(tryToSend, 1000);
        }
      };
      
      // Iniciar tentativas
      setTimeout(tryToSend, 1000);
      return;
    }
    
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket não está conectado (readyState:', wsRef.current.readyState, ')');
      throw new Error('WebSocket não está conectado');
    }

    console.log('📤 Enviando comando:', command.type, command);
    wsRef.current.send(JSON.stringify(command));
  }, []);

  // Comandos específicos
  const getMachineData = useCallback(() => {
    sendCommand({
      type: 'get_machine_data',
      id_maquina: machineId
    });
  }, [machineId, sendCommand]);

  const startSession = useCallback((operatorId: number, sessionId: number) => {
    sendCommand({
      type: 'start_session',
      id_maquina: machineId,
      id_operador: operatorId,
      id_sessao: sessionId
    });
  }, [machineId, sendCommand]);

  const endSession = useCallback(() => {
    sendCommand({
      type: 'end_session',
      id_maquina: machineId
    });
  }, [machineId, sendCommand]);

  // Referência para controlar se o componente está montado
  const isMountedRef = useRef(true);

  // Conectar/desconectar automaticamente
  useEffect(() => {
    // Marcar componente como montado
    isMountedRef.current = true;
    
    // Evitar conexões duplicadas
    let isConnecting = false;
    let connectTimeout: NodeJS.Timeout | null = null;
    
    if (autoConnect) {
      // Delay maior para garantir que o componente está completamente montado
      // e evitar múltiplas tentativas rápidas
      connectTimeout = setTimeout(() => {
        // Verificar se o componente ainda está montado e não está tentando conectar
        if (isMountedRef.current && !isConnecting && !state.connecting && !state.connected) {
          isConnecting = true;
          console.log('🔌 Iniciando conexão automática após delay de inicialização');
          connect();
        }
      }, 2000); // Aumentado para 2 segundos
    }

    // Função de cleanup
    return () => {
      // Marcar componente como desmontado para evitar atualizações de estado
      isMountedRef.current = false;
      console.log('🔄 Componente WebSocket desmontado');
      
      // Limpar timeout de conexão
      if (connectTimeout) {
        clearTimeout(connectTimeout);
      }
      
      // Limpar timeout de reconexão
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // Limpar timeout de ping
      clearPingTimeout();
      
      // Fechar WebSocket se existir e estiver em estado adequado
      if (wsRef.current) {
        // Não fechar se estiver apenas se conectando
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CLOSING) {
          console.log('🧹 Fechando WebSocket no unmount (readyState:', wsRef.current.readyState, ')');
          wsRef.current.onclose = null; // Remover handler de onclose para evitar tentativas de reconexão
          wsRef.current.close();
        } else {
          console.log('⚠️ WebSocket não está aberto no unmount (readyState:', wsRef.current.readyState, '), pulando close');
        }
        wsRef.current = null;
      } else {
        console.log('🧹 Nenhum WebSocket ativo para limpar no unmount');
      }
    };
  }, [autoConnect, machineId, connect, clearPingTimeout, state.connecting, state.connected]); // Reconectar se machineId mudar

  return {
    state,
    connect,
    disconnect,
    sendCommand,
    getMachineData,
    startSession,
    endSession
  };
}

