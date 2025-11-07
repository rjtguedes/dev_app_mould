// 🔐 Hook de Autenticação via API REST

import { useState, useEffect } from 'react';
import { apiService, LoginRequest, LoginResponse } from '../services/apiService';

interface AuthState {
  isAuthenticated: boolean;
  operator: LoginResponse | null;
  secondaryOperator: { id: number; nome: string } | null;
  isLoading: boolean;
  error: string;
}

interface LoginParams {
  pin: string;
  twoOperators?: boolean;
  id_maquina?: number;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    operator: null,
    secondaryOperator: null,
    isLoading: true, // ✅ Iniciar como true para evitar flash de login
    error: ''
  });

  // ✅ SIMPLIFICADO: Auto-restaurar sessão na inicialização do hook
  useEffect(() => {
    console.log('🔐 useAuth: Verificando sessão ativa na inicialização...');
    
    const autoRestoreSession = () => {
      try {
        // ✅ NOVO: Sistema simplificado - apenas 2 campos
        const id_sessao = localStorage.getItem('id_sessao');
        const sessao_ativa = localStorage.getItem('sessao_ativa');
        
        console.log('📋 Dados da sessão:', { id_sessao, sessao_ativa });
        
        if (!id_sessao || sessao_ativa !== 'true') {
          console.log('📋 Nenhuma sessão ativa encontrada - redirecionando para login');
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        console.log('✅ Sessão ativa encontrada - ID:', id_sessao);
        console.log('🔄 Restaurando autenticação...');

        // Restaurar estado de autenticação
        setAuthState({
          isAuthenticated: true,
          operator: {
            id_operador: 0, // Será atualizado pelo SSE
            nome: 'Operador', // Será atualizado pelo SSE
            empresa: 0
          },
          secondaryOperator: null,
          isLoading: false,
          error: ''
        });

        console.log('✅ Sessão restaurada com sucesso - ID:', id_sessao);
      } catch (error) {
        console.error('❌ Erro ao restaurar sessão:', error);
        localStorage.removeItem('id_sessao');
        localStorage.removeItem('sessao_ativa');
        setAuthState(prev => ({ ...prev, isLoading: false }));
      }
    };

    autoRestoreSession();
  }, []); // Executar apenas uma vez na montagem

  const login = async ({ pin, twoOperators = false, id_maquina }: LoginParams) => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: '' }));

      const expectedLength = twoOperators ? 8 : 4;
      if (pin.length !== expectedLength) {
        throw new Error(`PIN deve ter ${expectedLength} dígitos`);
      }

      const primaryPin = pin.slice(0, 4);
      const secondaryPin = twoOperators ? pin.slice(4, 8) : null;

      console.log('🔐 Iniciando login via API REST:', { primaryPin, secondaryPin, twoOperators });

      // Respeitar sessão ativa existente: se já houver sessão salva para a mesma máquina,
      // não enviar id_maquina no login para evitar criação/reset de sessão no backend
      let savedSession: { id_sessao?: number; id_maquina?: number; id_operador?: number; timestamp?: number } | null = null;
      try {
        const savedStr = localStorage.getItem('industrack_active_session');
        savedSession = savedStr ? JSON.parse(savedStr) : null;
      } catch {}

      const shouldOmitMachineId = Boolean(
        savedSession &&
        typeof id_maquina === 'number' &&
        savedSession.id_maquina === id_maquina
      );

      // Login principal
      const loginRequest: LoginRequest = {
        pin: parseInt(primaryPin),
        ...(shouldOmitMachineId ? {} : (typeof id_maquina === 'number' ? { id_maquina } : {}))
      };

      console.log('📤 Enviando request de login:', {
        pin: '****',
        id_maquina,
        id_maquina_type: typeof id_maquina,
        id_maquina_undefined: id_maquina === undefined,
        id_maquina_null: id_maquina === null
      });

      const response = await apiService.login(loginRequest);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erro no login');
      }

      console.log('✅ Login principal realizado:', response.data);
      console.log('🔍 Dados da sessão retornados:', response.data.sessao);
      console.log('🔍 response.data.sessao existe?', !!response.data.sessao);
      console.log('🔍 response.data.sessao.id_sessao:', response.data.sessao?.id_sessao);

      let secondaryOperatorData: { id: number; nome: string } | null = null;

      // Login do segundo operador (se necessário)
      if (twoOperators && secondaryPin && secondaryPin !== '0000') {
        try {
          console.log('🔐 Login do segundo operador...');
          
          const secondaryRequest: LoginRequest = {
            pin: parseInt(secondaryPin),
            ...(shouldOmitMachineId ? {} : (typeof id_maquina === 'number' ? { id_maquina } : {}))
          };

          const secondaryResponse = await apiService.login(secondaryRequest);

          if (secondaryResponse.success && secondaryResponse.data) {
            secondaryOperatorData = {
              id: secondaryResponse.data.id_operador,
              nome: secondaryResponse.data.nome
            };
            console.log('✅ Segundo operador logado:', secondaryOperatorData);
          } else {
            console.warn('⚠️ Segundo operador não encontrado, continuando apenas com o principal');
          }
        } catch (secondaryError) {
          console.warn('⚠️ Erro no login do segundo operador:', secondaryError);
          // Continua mesmo se o segundo operador falhar
        }
      }

      // ✅ SIMPLIFICADO: Salvar apenas ID da sessão e flag ativa
      console.log('🔍 Verificando se deve salvar sessão...');
      console.log('🔍 response.data:', response.data);
      
      // Pode vir em response.data.sessao OU direto no response.data
      const sessionId = response.data.sessao?.id_sessao || response.data.id_sessao;
      
      if (sessionId) {
        console.log('✅ Sessão recebida do backend - ID:', sessionId);
        
        // ✅ NOVO: Sistema simplificado - apenas 2 campos
        localStorage.setItem('id_sessao', String(sessionId));
        localStorage.setItem('sessao_ativa', 'true');
        
        console.log('💾 Sessão salva no localStorage:', {
          id_sessao: sessionId,
          sessao_ativa: true
        });
      } else {
        console.warn('⚠️ Backend não retornou ID de sessão');
        console.warn('⚠️ Verifique response.data:', response.data);
      }

      // Sucesso - atualizar estado
      setAuthState({
        isAuthenticated: true,
        operator: response.data,
        secondaryOperator: secondaryOperatorData,
        isLoading: false,
        error: ''
      });

      return {
        success: true,
        operator: response.data,
        secondaryOperator: secondaryOperatorData
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no login';
      console.error('❌ Erro no login:', errorMessage);
      
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  const logout = () => {
    console.log('🚪 Logout realizado');
    
    // ✅ Limpar estado de autenticação
    setAuthState({
      isAuthenticated: false,
      operator: null,
      secondaryOperator: null,
      isLoading: false,
      error: ''
    });
    
    // ✅ SIMPLIFICADO: Limpar apenas os campos necessários
    console.log('🧹 Limpando sessão do localStorage...');
    localStorage.removeItem('id_sessao');
    localStorage.removeItem('sessao_ativa');
    
    // ✅ Limpar chaves antigas (limpeza)
    localStorage.removeItem('industrack_session');
    localStorage.removeItem('industrack_active_session');
    
    console.log('✅ Logout completo - sessão encerrada');
  };

  return {
    ...authState,
    login,
    logout
  };
}
