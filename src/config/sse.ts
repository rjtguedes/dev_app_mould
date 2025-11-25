// ⚙️ Configuração SSE (Server-Sent Events)

import { getApiBaseUrl, loadSettings } from './appSettings';

export interface SSEConfig {
  baseUrl: string;
  reconnectInterval: number;
  heartbeatTimeout: number;
}

// Configuração dinâmica - baseUrl será atualizado quando as configurações forem carregadas
export let SSE_CONFIG: SSEConfig = {
  baseUrl: getApiBaseUrl(), // Usa configuração dinâmica
  reconnectInterval: 5000,
  heartbeatTimeout: 60000
};

// Atualizar baseUrl quando as configurações forem carregadas
loadSettings().then(settings => {
  SSE_CONFIG.baseUrl = settings.apiBaseUrl;
  console.log('✅ SSE_CONFIG atualizado com baseUrl:', SSE_CONFIG.baseUrl);
}).catch(err => {
  console.error('❌ Erro ao atualizar SSE_CONFIG:', err);
});

export function getSSEUrl(machineId: number): string {
  // Sempre usar a configuração mais recente
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}/api/sse/updates/${machineId}`;
}

export function getAPIUrl(endpoint: string): string {
  // Sempre usar a configuração mais recente
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${endpoint}`;
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
  retomarParada: '/api/parada/retomar-forcada',
  
  // Contexto
  consultarContexto: (machineId: number) => `/api/maquina/${machineId}/contexto`,
  
  // SSE
  sseUpdates: (machineId: number) => `/api/sse/updates/${machineId}`
} as const;


