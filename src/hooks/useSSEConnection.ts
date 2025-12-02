// 🔌 Hook para conexão SSE (Server-Sent Events)

import { useState, useEffect, useRef, useCallback } from 'react';
import { getSSEUrl, getSSEUrlAsync, SSE_CONFIG } from '../config/sse';
import { loadSettings } from '../config/appSettings';

interface SSEConnectionOptions {
  machineId: number;
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  enabled?: boolean;
}

export function useSSEConnection(options: SSEConnectionOptions) {
  const { machineId, onMessage, onError, onOpen, enabled = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failedAttemptsRef = useRef(0); // ✅ NOVO: Contador de tentativas falhas
  const maxFailedAttempts = 3; // ✅ NOVO: Limite de tentativas antes de limpar sessão
  
  // Usar refs para callbacks para evitar re-criação
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const onOpenRef = useRef(onOpen);

  // Atualizar refs quando callbacks mudarem
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    onOpenRef.current = onOpen;
  }, [onMessage, onError, onOpen]);

  const disconnect = useCallback(() => {
    console.log('🔌 SSE: Desconectando...');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setIsConnected(false);
    failedAttemptsRef.current = 0; // ✅ NOVO: Resetar contador ao desconectar
  }, []);

  const connect = useCallback(async () => {
    if (!enabled || !machineId) {
      console.log('⏸️ SSE: Conexão desabilitada ou sem ID de máquina');
      return;
    }

    // Não reconectar se já conectado
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      console.log('⏸️ SSE: Já conectado');
      return;
    }

    // Limpar conexão anterior
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      // ✅ NOVO: Garantir que as configurações foram carregadas antes de conectar
      console.log('⏳ SSE: Aguardando carregamento das configurações...');
      const settings = await loadSettings();
      console.log('✅ SSE: Configurações carregadas:', {
        apiBaseUrl: settings.apiBaseUrl,
        companyName: settings.companyName
      });
      
      const url = await getSSEUrlAsync(machineId);
      console.log(`🔌 SSE: Conectando em ${url}...`);
      console.log(`📋 SSE: Verificando se o servidor SSE está acessível em ${settings.apiBaseUrl}`);
      
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      // Handler: Conexão aberta
      eventSource.onopen = () => {
        console.log(`✅ SSE: Conectado com sucesso à máquina ${machineId}`);
        setIsConnected(true);
        setError(null);
        failedAttemptsRef.current = 0; // ✅ NOVO: Resetar contador em sucesso
        onOpenRef.current?.();
      };

      // Handler: Mensagem recebida
      eventSource.onmessage = (event) => {
        try {
          // Ignorar heartbeats
          if (event.data === '{"type": "heartbeat"}') {
            console.log('💓 SSE: Heartbeat recebido');
            return;
          }

          const data = JSON.parse(event.data);
          console.log('📥 SSE: Mensagem recebida:', data);
          onMessageRef.current(data);
        } catch (error) {
          console.error('❌ SSE: Erro ao parsear mensagem:', error);
        }
      };

      // Handler: Erro de conexão
      eventSource.onerror = (event) => {
        console.error('❌ SSE: Erro de conexão:', event);
        setIsConnected(false);
        setError('Erro de conexão SSE');
        
        // ✅ NOVO: Incrementar contador de tentativas falhas
        failedAttemptsRef.current += 1;
        console.log(`⚠️ SSE: Tentativa falha ${failedAttemptsRef.current}/${maxFailedAttempts}`);
        
        // ✅ NOVO: Se muitas tentativas falharam, pode ser erro de autenticação
        if (failedAttemptsRef.current >= maxFailedAttempts) {
          console.warn('⚠️ SSE: Múltiplas tentativas de conexão falharam - limpando sessão salva');
          // ✅ Limpar sessão salva (chaves corretas)
          localStorage.removeItem('id_sessao');
          localStorage.removeItem('sessao_ativa');
          localStorage.removeItem('industrack_active_session'); // Limpar chave antiga
          console.log('🧹 SSE: Sessão salva removida após múltiplas falhas de conexão');
          // Não tentar reconectar mais - deixar usuário fazer login
          onErrorRef.current?.(event);
          return;
        }
        
        onErrorRef.current?.(event);

        // Tentar reconectar
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log(`🔄 SSE: Reconectando em ${SSE_CONFIG.reconnectInterval}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, SSE_CONFIG.reconnectInterval);
        }
      };

    } catch (error) {
      console.error('❌ SSE: Erro ao criar conexão:', error);
      setError('Erro ao criar conexão SSE');
      
      // Tentar reconectar
      reconnectTimeoutRef.current = setTimeout(() => {
        connect().catch(err => console.error('❌ Erro ao reconectar:', err));
      }, SSE_CONFIG.reconnectInterval);
    }
  }, [enabled, machineId]);

  // Conectar/desconectar quando enabled ou machineId mudar
  useEffect(() => {
    if (enabled && machineId) {
      connect().catch(err => console.error('❌ Erro ao conectar SSE:', err));
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, machineId, connect, disconnect]);

  return {
    isConnected,
    error,
    disconnect,
    reconnect: connect
  };
}

