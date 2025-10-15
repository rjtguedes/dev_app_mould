import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';

/**
 * Componente para verificar se o certificado SSL foi aceito
 * 
 * IMPORTANTE: Necessário para WSS com certificado auto-assinado
 * O navegador bloqueia WebSocket WSS se o certificado não for aceito primeiro
 */
export function SSLHealthCheck() {
  const [sslAccepted, setSSLAccepted] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [checkAttempts, setCheckAttempts] = useState(0);

  // URL do servidor SSL
  const SSL_URL = 'https://industrackwss.vps-kinghost.net:8443/health';

  const checkSSL = async () => {
    setChecking(true);
    try {
      const response = await fetch(SSL_URL, {
        mode: 'no-cors', // Permite request mesmo com CORS
        cache: 'no-store' // Não usar cache
      });
      
      // Se chegou aqui, certificado foi aceito
      setSSLAccepted(true);
      setChecking(false);
    } catch (error) {
      // Se falhar, certificado não foi aceito
      setSSLAccepted(false);
      setChecking(false);
      setCheckAttempts(prev => prev + 1);
    }
  };

  useEffect(() => {
    checkSSL();
    
    // Recheck a cada 5 segundos se não foi aceito
    const interval = setInterval(() => {
      if (!sslAccepted) {
        checkSSL();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sslAccepted]);

  // Enquanto está verificando na primeira vez
  if (checking && checkAttempts === 0) {
    return (
      <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
          <p className="text-blue-200">🔍 Verificando certificado SSL...</p>
        </div>
      </div>
    );
  }

  // Se certificado foi aceito
  if (sslAccepted) {
    return (
      <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <p className="text-green-200">✅ Certificado SSL aceito - WebSocket pronto!</p>
        </div>
      </div>
    );
  }

  // Se certificado NÃO foi aceito
  return (
    <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-4 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-yellow-200 font-bold text-lg mb-1">
            Certificado SSL Não Aceito
          </h3>
          <p className="text-yellow-100 text-sm">
            Para conectar via WebSocket seguro (WSS), você precisa aceitar o certificado SSL do servidor primeiro.
          </p>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-yellow-950/50 rounded p-3 space-y-2">
        <p className="text-yellow-100 text-sm font-semibold">📋 Passos para resolver:</p>
        <ol className="text-yellow-100 text-sm space-y-1 ml-4 list-decimal">
          <li>Clique no botão "Aceitar Certificado SSL" abaixo</li>
          <li>Uma nova aba abrirá com um aviso de segurança</li>
          <li>Clique em <strong>"Avançado"</strong> e depois <strong>"Prosseguir"</strong></li>
          <li>Volte para esta página (ela recarregará automaticamente)</li>
        </ol>
      </div>

      {/* Botões */}
      <div className="flex gap-3 flex-wrap">
        <a
          href={SSL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          🔓 Aceitar Certificado SSL
        </a>

        <button
          onClick={checkSSL}
          disabled={checking}
          className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          Verificar Novamente
        </button>
      </div>

      {/* Info Extra */}
      <div className="text-yellow-200/70 text-xs space-y-1">
        <p>💡 <strong>Por que isso é necessário?</strong></p>
        <p className="ml-4">
          O servidor usa um certificado auto-assinado para desenvolvimento. 
          Navegadores bloqueiam conexões WebSocket WSS até você aceitar o certificado manualmente.
        </p>
        <p className="ml-4 mt-2">
          ℹ️ No app Android, isso não é necessário - funciona automaticamente!
        </p>
      </div>

      {/* Status de tentativas */}
      {checkAttempts > 0 && (
        <div className="text-yellow-300/60 text-xs">
          🔄 Verificando automaticamente... (tentativa {checkAttempts})
        </div>
      )}
    </div>
  );
}

export default SSLHealthCheck;

