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

      // Login principal
      const loginRequest: LoginRequest = {
        pin: parseInt(primaryPin),
        id_maquina
      };

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
            id_maquina
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
    
    // Limpar dados da sessão
    localStorage.removeItem('industrack_session');
  };

  return {
    ...authState,
    login,
    logout
  };
}
