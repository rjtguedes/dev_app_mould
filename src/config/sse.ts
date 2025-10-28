// ⚙️ Configuração SSE (Server-Sent Events)

export interface SSEConfig {
  baseUrl: string;
  reconnectInterval: number;
  heartbeatTimeout: number;
}

export const SSE_CONFIG: SSEConfig = {
  baseUrl: 'http://10.200.0.184:8000',
  reconnectInterval: 5000,
  heartbeatTimeout: 60000
};

export function getSSEUrl(machineId: number): string {
  return `${SSE_CONFIG.baseUrl}/api/sse/updates/${machineId}`;
}

export function getAPIUrl(endpoint: string): string {
  return `${SSE_CONFIG.baseUrl}${endpoint}`;
}

// URLs dos endpoints
export const API_ENDPOINTS = {
  // Autenticação
  login: '/api/auth/login',
  
  // Sessão
  iniciarSessao: '/api/sessao/iniciar',
  finalizarSessao: '/api/sessao/finalizar',
  
  // Produção
  iniciarProducao: '/api/producao/iniciar',
  pausarProducao: '/api/producao/pausar',
  retomarProducao: '/api/producao/retomar',
  finalizarProducao: '/api/producao/finalizar',
  
  // Rejeitos
  adicionarRejeitos: '/api/rejeitos/adicionar',
  
  // Parada
  forcarParada: '/api/parada/forcar',
  
  // Contexto
  consultarContexto: (machineId: number) => `/api/maquina/${machineId}/contexto`,
  
  // SSE
  sseUpdates: (machineId: number) => `/api/sse/updates/${machineId}`
} as const;


