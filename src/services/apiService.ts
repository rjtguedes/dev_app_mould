// 🌐 Serviço de API REST

import { API_ENDPOINTS, getAPIUrl } from '../config/sse';

// ==================== TIPOS DE REQUEST ====================

export interface IniciarSessaoRequest {
  id_maquina: number;
  id_operador: number;
  id_turno: number;
}

export interface FinalizarSessaoRequest {
  id_maquina: number;
}

export interface IniciarProducaoRequest {
  id_maquina: number;
  id_mapa: number;
  tempo_ciclo: number;
}

export interface PausarProducaoRequest {
  id_maquina: number;
}

export interface RetomarProducaoRequest {
  id_maquina: number;
}

export interface FinalizarProducaoRequest {
  id_maquina: number;
}

export interface AdicionarRejeitosRequest {
  id_maquina: number;
  quantidade: number;
  id_motivo_rejeito: number;
}

export interface ForcarParadaRequest {
  id_maquina: number;
  id_motivo: number;
}

// ==================== TIPOS DE RESPONSE ====================

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  timestamp?: string;
}

// ==================== SERVIÇO API ====================

class APIService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const url = getAPIUrl(endpoint);
      console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error(`❌ API Error: ${response.status}`, data);
        return {
          success: false,
          error: data.error || `Erro HTTP ${response.status}`
        };
      }

      console.log(`✅ API Response:`, data);
      return data;
    } catch (error) {
      console.error('❌ API Request Failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // ==================== SESSÃO ====================

  async iniciarSessao(request: IniciarSessaoRequest): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.iniciarSessao, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async finalizarSessao(request: FinalizarSessaoRequest): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.finalizarSessao, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // ==================== PRODUÇÃO ====================

  async iniciarProducao(request: IniciarProducaoRequest): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.iniciarProducao, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async pausarProducao(request: PausarProducaoRequest): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.pausarProducao, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async retomarProducao(request: RetomarProducaoRequest): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.retomarProducao, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async finalizarProducao(request: FinalizarProducaoRequest): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.finalizarProducao, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // ==================== REJEITOS ====================

  async adicionarRejeitos(request: AdicionarRejeitosRequest): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.adicionarRejeitos, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // ==================== PARADA ====================

  async forcarParada(request: ForcarParadaRequest): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.forcarParada, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // ==================== CONTEXTO ====================

  async consultarContexto(machineId: number): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.consultarContexto(machineId), {
      method: 'GET'
    });
  }
}

// Exportar instância singleton
export const apiService = new APIService();


