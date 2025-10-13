/**
 * Configuração dinâmica do WebSocket
 * Detecta automaticamente o melhor endereço baseado no ambiente
 * 
 * IMPORTANTE: Backend agora usa WSS (WebSocket Secure) com SSL/TLS
 * URL padrão: wss://10.200.0.184:443
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
 * MUDANÇA: Backend atualizado para WSS na porta 443
 */
export function getWebSocketURL(): string {
  // 1. Primeiro, tentar variável de ambiente (prioridade máxima)
  const envUrl = import.meta.env.VITE_WS_URL;
  if (envUrl) {
    console.log('🔌 WebSocket: Usando URL da variável de ambiente:', envUrl);
    return envUrl;
  }

  // 2. NOVO: Backend usa WSS (porta 443) por padrão
  const protocol = 'wss:';  // Sempre WSS agora (criptografado)
  const port = import.meta.env.VITE_WS_PORT || '443';  // Porta HTTPS padrão

  // 3. Obter hostname atual
  const hostname = window.location.hostname;

  // 4. Casos especiais
  // Se for localhost/127.0.0.1, usar IP VPN padrão com WSS
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const defaultUrl = `wss://10.200.0.184:443`;
    console.log('🔌 WebSocket: Localhost detectado, usando IP VPN WSS:', defaultUrl);
    return defaultUrl;
  }

  // 5. Se tiver um hostname válido, usar o mesmo host com WSS
  const dynamicUrl = `${protocol}//${hostname}:${port}`;
  console.log('🔌 WebSocket: Usando hostname dinâmico WSS:', dynamicUrl);
  return dynamicUrl;
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
    port: parseInt(urlObj.port || '8765', 10)
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
    recommendations.push('Atualize para wss:// na porta 443');
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

