/**
 * Configuração dinâmica do WebSocket
 * Detecta automaticamente o melhor endereço baseado no ambiente
 * 
 * IMPORTANTE: Backend agora usa WSS (WebSocket Secure) com SSL/TLS
 * URL padrão: wss://industrackwss.vps-kinghost.net:8443
 */

export interface WebSocketConnectionInfo {
  url: string;
  isSecure: boolean;
  host: string;
  port: number;
}

/**
 * Obtém a URL do WebSocket baseado no ambiente atual
 * 
 * MUDANÇA: Backend atualizado para WSS com domínio público
 * 
 * ESTRATÉGIA (em ordem de prioridade):
 * 1. Variável de ambiente VITE_WS_URL (se definida)
 * 2. Domínio público padrão: wss://industrackwss.vps-kinghost.net:8443
 * 3. Mesmo domínio do site (fallback)
 */
export function getWebSocketURL(): string {
  // 1. Primeiro, tentar variável de ambiente (prioridade máxima)
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) {
    console.log('🔌 WebSocket: Usando URL da variável de ambiente:', envUrl);
    return envUrl;
  }

  // 2. URL padrão com domínio público
  const defaultUrl = 'wss://industrackwss.vps-kinghost.net:8443';
  
  // 3. Verificar se está em desenvolvimento local
  const hostname = window.location.hostname;
  const sitePort = window.location.port;
  
  if ((hostname === 'localhost' || hostname === '127.0.0.1') && sitePort === '5173') {
    console.log('🔌 WebSocket: Desenvolvimento local detectado, usando domínio público:', defaultUrl);
    return defaultUrl;
  }
  
  // 4. Se site está no mesmo domínio do WebSocket, tentar usar mesmo domínio
  if (hostname.includes('industrack') || hostname.includes('vps-kinghost')) {
    // Tentar caminho /ws no mesmo domínio primeiro
    const isHTTPS = window.location.protocol === 'https:';
    const protocol = isHTTPS ? 'wss:' : 'ws:';
    const sameDomainUrl = `${protocol}//${hostname}/ws`;
    console.log('🔌 WebSocket: Usando mesmo domínio do site:', sameDomainUrl);
    return sameDomainUrl;
  }

  // 5. Fallback: usar domínio público padrão
  console.log('🔌 WebSocket: Usando domínio público padrão:', defaultUrl);
  return defaultUrl;
}

/**
 * Obtém informações detalhadas da conexão WebSocket
 */
export function getWebSocketConnectionInfo(): WebSocketConnectionInfo {
  const url = getWebSocketURL();
  const urlObj = new URL(url);

  return {
    url,
    isSecure: urlObj.protocol === 'wss:',
    host: urlObj.hostname,
    port: parseInt(urlObj.port || '8443', 10)
  };
}

/**
 * Valida se a URL do WebSocket é acessível
 * Retorna um diagnóstico básico
 */
export function diagnoseWebSocketURL(): {
  url: string;
  warnings: string[];
  recommendations: string[];
} {
  const info = getWebSocketConnectionInfo();
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Verificar se está usando WSS (novo backend requer)
  if (!info.isSecure) {
    warnings.push('⚠️ Backend agora requer WSS (WebSocket Secure)');
    recommendations.push('Atualize para wss:// na porta 8443');
  }

  // Verificar se está em Android com certificado auto-assinado
  const isAndroid = /android/i.test(navigator.userAgent);
  const isPrivateIP = /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(info.host);
  
  if (isAndroid && isPrivateIP && info.isSecure) {
    warnings.push('ℹ️ Android com IP privado: certificado auto-assinado pode causar avisos');
    recommendations.push('WebView deve aceitar certificados auto-assinados automaticamente');
    recommendations.push('Se houver erro SSL, verifique as configurações do WebView');
  }

  // Verificar se é IP privado
  if (isPrivateIP) {
    warnings.push('ℹ️ IP privado detectado - certifique-se de estar na mesma rede');
  }

  // Verificar se está usando HTTPS no site mas WSS com IP
  if (window.location.protocol === 'https:' && isPrivateIP) {
    warnings.push('ℹ️ Site HTTPS com WSS em IP privado: pode ter aviso de certificado misto');
  }

  return {
    url: info.url,
    warnings,
    recommendations
  };
}

/**
 * Loga informações de diagnóstico no console
 */
export function logWebSocketDiagnostics(): void {
  const diagnosis = diagnoseWebSocketURL();
  
  console.group('🔍 Diagnóstico WebSocket');
  console.log('📡 URL:', diagnosis.url);
  
  if (diagnosis.warnings.length > 0) {
    console.warn('Avisos:', diagnosis.warnings);
  }
  
  if (diagnosis.recommendations.length > 0) {
    console.info('Recomendações:', diagnosis.recommendations);
  }
  
  console.log('🌐 User Agent:', navigator.userAgent);
  console.log('🔒 Protocolo:', window.location.protocol);
  console.log('🏠 Hostname:', window.location.hostname);
  console.groupEnd();
}

