// 🌐 Serviço de API REST

import { API_ENDPOINTS, getAPIUrl } from '../config/sse';
import type { Machine } from '../types/machine';
import type { MapaProducao, MapaDetalhes, AlocacaoMapa } from '../types/production';

// ==================== TIPOS DE REQUEST ====================

export interface IniciarSessaoRequest {
  id_maquina: number;
  id_operador: number;
  id_turno: number;
}

export interface FinalizarSessaoRequest {
  id_maquina: number;
  id_operador?: number;
  id_sessao?: number; // novo campo opcional quando disponível no login
  motivo?: string;
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

export interface RetomarParadaRequest {
  id_maquina: number;
}

export interface LoginRequest {
  pin: number;
  id_maquina?: number;  // Opcional - mas recomendado para tablet IHM
}

export interface IniciarProducaoMapaRequest {
  id_maquina: number;
  id_mapa: number;
  taloes: TalaoProducaoRequest[];
}

export interface TalaoProducaoRequest {
  id_talao: number;
  estacao_numero: number;
  quantidade: number;
  tempo_ciclo_segundos?: number;
}

export interface FinalizarTalaoRequest {
  id_maquina: number;
  id_talao: number;
  estacao_numero: number;
  quantidade_produzida: number;
  motivo?: string;
}

// ==================== TIPOS DE RESPONSE ====================

export interface LoginResponse {
  id_operador: number;
  nome: string;
  empresa: number;
  cargo: string;
  ativo: boolean;
  id_empresa: number;
  sessao?: {
    id_sessao: number;
    id_maquina: number;
    id_operador: number;
  };
}

export interface APIResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  status?: number; // ✅ NOVO: Status HTTP para detecção de autenticação
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
      
      // Log do body para requests POST/PUT (apenas para debug de login)
      if (options.body && endpoint.includes('login')) {
        console.log('📤 Request body (LOGIN):', options.body);
      }

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
        // ✅ NOVO: Incluir status HTTP no erro para detectar autenticação
        const errorMsg = data.error || `Erro HTTP ${response.status}`;
        return {
          success: false,
          error: errorMsg,
          status: response.status // ✅ NOVO: Incluir status para detecção
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

  // ==================== AUTENTICAÇÃO ====================

  async login(request: LoginRequest): Promise<APIResponse<LoginResponse>> {
    console.log('🔍 Login API Service - Request details:', {
      pin: request.pin ? '****' : 'undefined',
      id_maquina: request.id_maquina,
      id_maquina_type: typeof request.id_maquina,
      has_id_maquina: request.id_maquina !== undefined && request.id_maquina !== null,
      full_request_keys: Object.keys(request)
    });

    return this.request<LoginResponse>(API_ENDPOINTS.login, {
      method: 'POST',
      body: JSON.stringify(request)
    });
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

  async retomarParada(request: RetomarParadaRequest): Promise<APIResponse> {
    return this.request(API_ENDPOINTS.retomarParada, {
      method: 'POST',
      body: JSON.stringify({ id_maquina: request.id_maquina })
    });
  }

  // ==================== MÁQUINAS ====================

  async listarMaquinas(ativa?: boolean): Promise<APIResponse<Machine[]>> {
    const params = ativa ? '?ativa=true' : '';
    return this.request<Machine[]>(`/api/maquinas${params}`, {
      method: 'GET'
    });
  }

  // ==================== MAPAS DE PRODUÇÃO ====================

  async listarMapas(params?: { id_maquina?: number; ativo?: boolean }): Promise<APIResponse<AlocacaoMapa[]>> {
    const queryParams = new URLSearchParams();
    if (params?.id_maquina) queryParams.append('id_maquina', params.id_maquina.toString());
    if (params?.ativo !== undefined) queryParams.append('ativo', params.ativo.toString());
    
    const queryString = queryParams.toString();
    const url = `/api/mapas${queryString ? `?${queryString}` : ''}`;
    
    return this.request<MapaProducao[]>(url, {
      method: 'GET'
    });
  }

  async obterDetalhesMapa(idMapa: number): Promise<APIResponse<MapaDetalhes>> {
    return this.request<MapaDetalhes>(`/api/mapa/${idMapa}/detalhes`, {
      method: 'GET'
    });
  }

  async iniciarProducaoMapa(request: IniciarProducaoMapaRequest): Promise<APIResponse> {
    return this.request('/api/producao/iniciar', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async iniciarProducaoSimples(request: IniciarProducaoMapaRequest): Promise<APIResponse> {
    return this.request('/api/producao/iniciar-simples', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // ==================== COMANDOS DE FINALIZAÇÃO ====================

  async finalizarSessao(request: FinalizarSessaoRequest): Promise<APIResponse> {
    return this.request('/api/sessao/finalizar', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async finalizarTalao(request: FinalizarTalaoRequest): Promise<APIResponse> {
    return this.request('/api/talao/finalizar', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  async finalizarEstacao(request: { id_maquina: number; estacao_numero: number; id_talao: number; motivo?: string }): Promise<APIResponse> {
    return this.request('/api/producao/finalizar-estacao', {
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

  // ==================== PARADAS ====================

  async listarMotivosParada(options?: { grupoMaquina?: number; id_maquina?: number }): Promise<APIResponse<any[]>> {
    const queryParams: string[] = [];
    if (options?.grupoMaquina) queryParams.push(`grupo_maquina=${options.grupoMaquina}`);
    if (options?.id_maquina) queryParams.push(`id_maquina=${options.id_maquina}`);
    const params = queryParams.length ? `?${queryParams.join('&')}` : '';
    return this.request<any[]>(`/api/motivos-parada${params}`, {
      method: 'GET'
    });
  }

  async justificarParada(idParada: number, idMotivo: number, observacoes?: string): Promise<APIResponse> {
    return this.request(`/api/parada/${idParada}/justificar`, {
      method: 'POST',
      body: JSON.stringify({
        id_motivo: idMotivo,
        ...(observacoes ? { observacoes } : {})
      })
    });
  }
}

// Exportar instância singleton
export const apiService = new APIService();


