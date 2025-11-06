// 🔐 Hook de Autenticação via API REST

import { useState } from 'react';
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
    isLoading: false,
    error: ''
  });

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

      // ✅ Persistência da sessão: se backend retornar sessão
      if (response.data.sessao?.id_sessao) {
        const newSession = {
          id_sessao: response.data.sessao.id_sessao,
          id_maquina: response.data.sessao.id_maquina,
          id_operador: response.data.sessao.id_operador,
          timestamp: Date.now()
        };

        // Se já existe sessão salva da mesma máquina, apenas renova timestamp
        if (savedSession && savedSession.id_maquina === newSession.id_maquina) {
          const merged = { ...savedSession, timestamp: Date.now() };
          localStorage.setItem('industrack_active_session', JSON.stringify(merged));
          console.log('🕒 Sessão existente encontrada - timestamp renovado');
        } else if (!savedSession) {
          localStorage.setItem('industrack_active_session', JSON.stringify(newSession));
          console.log('💾 Sessão salva no localStorage:', newSession.id_sessao);
        } else {
          // Existe sessão de outra máquina: sobrescrever apenas se id_maquina do request foi enviado
          if (!shouldOmitMachineId) {
            localStorage.setItem('industrack_active_session', JSON.stringify(newSession));
            console.log('🔄 Sessão substituída no localStorage (máquina diferente)');
          } else {
            console.log('⚠️ Mantendo sessão existente (máquina diferente, mas login sem id_maquina)');
          }
        }
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
    setAuthState({
      isAuthenticated: false,
      operator: null,
      secondaryOperator: null,
      isLoading: false,
      error: ''
    });
    
    // ✅ NOVO: Limpar dados da sessão (novo e antigo)
    localStorage.removeItem('industrack_session');
    localStorage.removeItem('industrack_active_session');
  };

  // ✅ NOVO: Verificar se há sessão salva e restaurar autenticação
  const checkSavedSession = () => {
    try {
      const savedSessionStr = localStorage.getItem('industrack_active_session');
      if (!savedSessionStr) {
        console.log('📋 Nenhuma sessão salva encontrada');
        return null;
      }

      const savedSession = JSON.parse(savedSessionStr);
      console.log('🔍 Sessão salva encontrada:', savedSession);

      // Verificar se a sessão não está muito antiga (mais de 24 horas sem uso)
      const sessionAge = Date.now() - (savedSession.timestamp || 0);
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas em ms
      
      if (sessionAge > maxAge) {
        console.log('⏰ Sessão salva expirada, removendo...');
        localStorage.removeItem('industrack_active_session');
        return null;
      }

      return savedSession;
    } catch (error) {
      console.error('❌ Erro ao verificar sessão salva:', error);
      localStorage.removeItem('industrack_active_session');
      return null;
    }
  };

  // ✅ NOVO: Função para limpar todos os dados locais
  const clearAllLocalData = () => {
    console.log('🧹 Limpando TODOS os dados locais...');
    try {
      localStorage.removeItem('industrack_active_session');
      localStorage.removeItem('industrack_current_machine');
      localStorage.removeItem('industrack_current_production');
      localStorage.removeItem('industrack_machines_list');
      localStorage.removeItem('industrack_machines_last_update');
      console.log('✅ Todos os dados locais foram limpos');
    } catch (error) {
      console.error('❌ Erro ao limpar dados locais:', error);
    }
  };

  // ✅ NOVO: Restaurar sessão salva e atualizar estado de autenticação
  const restoreSession = (savedSession: any) => {
    try {
      console.log('🔄 Restaurando estado de autenticação da sessão:', savedSession.id_sessao);
      
      // Criar objeto de operador baseado na sessão salva
      const restoredOperator = {
        id_operador: savedSession.id_operador,
        nome: 'Operador', // Nome será atualizado quando conectar ao backend
        empresa: 0
      };

      setAuthState({
        isAuthenticated: true,
        operator: restoredOperator,
        secondaryOperator: null,
        isLoading: false,
        error: ''
      });

      console.log('✅ Sessão restaurada com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao restaurar sessão:', error);
      return false;
    }
  };

  return {
    ...authState,
    login,
    logout,
    checkSavedSession,
    restoreSession,
    clearAllLocalData
  };
}
