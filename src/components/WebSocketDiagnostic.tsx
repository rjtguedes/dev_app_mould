import { useState, useEffect } from 'react';
import { 
  getWebSocketConnectionInfo, 
  diagnoseWebSocketURL,
  logWebSocketDiagnostics 
} from '../lib/websocketConfig';
import { AlertCircle, CheckCircle2, Wifi, WifiOff, Info, Copy } from 'lucide-react';

/**
 * Componente de Diagnóstico do WebSocket
 * Use este componente para debugar problemas de conexão WebSocket
 * 
 * Como usar:
 * 1. Adicione ao seu app (ex: na página de Settings)
 * 2. Visualize os diagnósticos e avisos
 * 3. Use as informações para configurar o Android corretamente
 */
export function WebSocketDiagnostic() {
  const [info, setInfo] = useState(getWebSocketConnectionInfo());
  const [diagnosis, setDiagnosis] = useState(diagnoseWebSocketURL());
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState<string>('');

  useEffect(() => {
    // Atualizar informações
    setInfo(getWebSocketConnectionInfo());
    setDiagnosis(diagnoseWebSocketURL());
    
    // Logar diagnóstico no console
    logWebSocketDiagnostics();
  }, []);

  const testConnection = async () => {
    setTestStatus('testing');
    setTestError('');

    try {
      const ws = new WebSocket(info.url);
      
      const timeout = setTimeout(() => {
        ws.close();
        setTestStatus('error');
        setTestError('Timeout: Servidor não respondeu em 5 segundos');
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        setTestStatus('success');
        ws.close();
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        setTestStatus('error');
        setTestError(`Erro de conexão: ${error}`);
      };

      ws.onclose = (event) => {
        if (testStatus === 'testing') {
          clearTimeout(timeout);
          setTestStatus('error');
          setTestError(`Conexão fechada: ${event.code} - ${event.reason || 'Sem motivo'}`);
        }
      };

    } catch (error) {
      setTestStatus('error');
      setTestError(`Erro ao criar WebSocket: ${error}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isAndroid = /android/i.test(navigator.userAgent);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isMobile = isAndroid || isIOS;

  return (
    <div className="space-y-4 p-4 bg-slate-800 rounded-lg">
      {/* Header */}
      <div className="flex items-center gap-2 text-white">
        <Wifi className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Diagnóstico WebSocket</h3>
      </div>

      {/* Informações de Conexão */}
      <div className="bg-slate-700 rounded p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">URL:</span>
          <div className="flex items-center gap-2">
            <code className="text-blue-400 text-sm">{info.url}</code>
            <button
              onClick={() => copyToClipboard(info.url)}
              className="p-1 hover:bg-slate-600 rounded"
            >
              <Copy className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">Host:</span>
          <code className="text-blue-400 text-sm">{info.host}</code>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">Porta:</span>
          <code className="text-blue-400 text-sm">{info.port}</code>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">Seguro (SSL):</span>
          <span className={`text-sm ${info.isSecure ? 'text-green-400' : 'text-yellow-400'}`}>
            {info.isSecure ? 'Sim (WSS)' : 'Não (WS)'}
          </span>
        </div>
      </div>

      {/* Informações do Dispositivo */}
      <div className="bg-slate-700 rounded p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">Plataforma:</span>
          <span className="text-blue-400 text-sm">
            {isAndroid ? '🤖 Android' : isIOS ? '🍎 iOS' : '💻 Desktop'}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">Protocolo Site:</span>
          <span className="text-blue-400 text-sm">{window.location.protocol}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-slate-300 text-sm">Hostname Site:</span>
          <span className="text-blue-400 text-sm">{window.location.hostname}</span>
        </div>
      </div>

      {/* Avisos */}
      {diagnosis.warnings.length > 0 && (
        <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 space-y-2">
          <div className="flex items-center gap-2 text-yellow-400">
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold text-sm">Avisos</span>
          </div>
          {diagnosis.warnings.map((warning, index) => (
            <p key={index} className="text-yellow-200 text-sm ml-6">{warning}</p>
          ))}
        </div>
      )}

      {/* Recomendações */}
      {diagnosis.recommendations.length > 0 && (
        <div className="bg-blue-900/30 border border-blue-700 rounded p-3 space-y-2">
          <div className="flex items-center gap-2 text-blue-400">
            <Info className="w-4 h-4" />
            <span className="font-semibold text-sm">Recomendações</span>
          </div>
          {diagnosis.recommendations.map((rec, index) => (
            <p key={index} className="text-blue-200 text-sm ml-6">• {rec}</p>
          ))}
        </div>
      )}

      {/* Teste de Conexão */}
      <div className="space-y-2">
        <button
          onClick={testConnection}
          disabled={testStatus === 'testing'}
          className={`w-full py-2 px-4 rounded font-semibold flex items-center justify-center gap-2
            ${testStatus === 'testing' 
              ? 'bg-slate-600 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
        >
          {testStatus === 'testing' && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          )}
          {testStatus === 'testing' ? 'Testando...' : 'Testar Conexão'}
        </button>

        {/* Resultado do Teste */}
        {testStatus === 'success' && (
          <div className="bg-green-900/30 border border-green-700 rounded p-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-200 text-sm">✅ Conexão bem-sucedida!</span>
          </div>
        )}

        {testStatus === 'error' && (
          <div className="bg-red-900/30 border border-red-700 rounded p-3 space-y-2">
            <div className="flex items-center gap-2">
              <WifiOff className="w-5 h-5 text-red-400" />
              <span className="text-red-200 text-sm font-semibold">❌ Falha na conexão</span>
            </div>
            <p className="text-red-200 text-sm ml-7">{testError}</p>
            
            {isAndroid && !info.isSecure && (
              <div className="ml-7 mt-2 p-2 bg-red-950/50 rounded">
                <p className="text-red-100 text-sm font-semibold">🔧 Solução Android:</p>
                <p className="text-red-200 text-xs mt-1">
                  Configure network_security_config.xml para permitir cleartext.
                </p>
                <p className="text-red-200 text-xs mt-1">
                  Veja o arquivo: <code>android-configs/network_security_config.xml</code>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Link para Documentação */}
      <div className="pt-3 border-t border-slate-600">
        <p className="text-slate-400 text-xs text-center">
          📚 Para mais informações, veja <code className="text-blue-400">ANDROID_WEBSOCKET_FIX.md</code>
        </p>
      </div>
    </div>
  );
}

export default WebSocketDiagnostic;

