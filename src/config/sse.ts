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
  const url = `${baseUrl}/api/sse/updates/${machineId}`;
  console.log('🔗 getSSEUrl() gerado:', url);
  return url;
}

export async function getSSEUrlAsync(machineId: number): Promise<string> {
  // Versão assíncrona que garante que as configurações foram carregadas
  const baseUrl = await getApiBaseUrlAsync();
  const url = `${baseUrl}/api/sse/updates/${machineId}`;
  console.log('🔗 getSSEUrlAsync() gerado:', url);
  return url;
}

export function getAPIUrl(endpoint: string): string {
  // Sempre usar a configuração mais recente
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  console.log('🔗 getAPIUrl() gerado:', url);
  return url;
}

export async function getAPIUrlAsync(endpoint: string): Promise<string> {
  // Versão assíncrona que garante que as configurações foram carregadas
  const baseUrl = await getApiBaseUrlAsync();
  const url = `${baseUrl}${endpoint}`;
  console.log('🔗 getAPIUrlAsync() gerado:', url);
  return url;
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


