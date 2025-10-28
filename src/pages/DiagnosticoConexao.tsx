// 🔍 Diagnóstico de Conexão SSE + API

import React, { useState, useEffect } from 'react';
import { SSE_CONFIG, getSSEUrl, getAPIUrl, API_ENDPOINTS } from '../config/sse';

export function DiagnosticoConexao() {
  const [machineId, setMachineId] = useState(135);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test: string, status: 'success' | 'error' | 'warning', message: string, details?: any) => {
    setTestResults(prev => [...prev, {
      test,
      status,
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testBackendHealth = async () => {
    try {
      addResult('Backend Health', 'warning', 'Testando conectividade básica...');
      
      const response = await fetch(`${SSE_CONFIG.baseUrl}/docs`, {
        method: 'GET',
        mode: 'cors'
      });
      
      if (response.ok) {
        addResult('Backend Health', 'success', `✅ Backend respondendo (${response.status})`, {
          url: `${SSE_CONFIG.baseUrl}/docs`,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        });
      } else {
        addResult('Backend Health', 'error', `❌ Backend com problema (${response.status})`, {
          url: `${SSE_CONFIG.baseUrl}/docs`,
          status: response.status
        });
      }
    } catch (error) {
      addResult('Backend Health', 'error', `❌ Erro de conexão: ${error instanceof Error ? error.message : 'Desconhecido'}`, {
        url: `${SSE_CONFIG.baseUrl}/docs`,
        error: error
      });
    }
  };

  const testAPIEndpoint = async () => {
    try {
      addResult('API Endpoint', 'warning', 'Testando endpoint de contexto...');
      
      const url = getAPIUrl(API_ENDPOINTS.consultarContexto(machineId));
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        addResult('API Endpoint', 'success', `✅ API funcionando (${response.status})`, {
          url,
          status: response.status,
          dataKeys: Object.keys(data),
          hasContextosFilhas: data.contextos_filhas ? data.contextos_filhas.length : 0
        });
      } else {
        const errorText = await response.text();
        addResult('API Endpoint', 'error', `❌ API com erro (${response.status})`, {
          url,
          status: response.status,
          error: errorText
        });
      }
    } catch (error) {
      addResult('API Endpoint', 'error', `❌ Erro na API: ${error instanceof Error ? error.message : 'Desconhecido'}`, {
        error: error
      });
    }
  };

  const testSSEConnection = async () => {
    return new Promise<void>((resolve) => {
      addResult('SSE Connection', 'warning', 'Testando conexão SSE...');
      
      const url = getSSEUrl(machineId);
      let eventSource: EventSource | null = null;
      let timeoutId: NodeJS.Timeout;
      
      try {
        eventSource = new EventSource(url);
        
        // Timeout de 10 segundos
        timeoutId = setTimeout(() => {
          if (eventSource) {
            eventSource.close();
            addResult('SSE Connection', 'error', '❌ Timeout na conexão SSE (10s)', {
              url,
              timeout: true
            });
            resolve();
          }
        }, 10000);
        
        eventSource.onopen = () => {
          clearTimeout(timeoutId);
          addResult('SSE Connection', 'success', '✅ SSE conectado com sucesso!', {
            url,
            readyState: eventSource?.readyState
          });
          
          // Fechar após 2 segundos para não manter conexão aberta
          setTimeout(() => {
            if (eventSource) {
              eventSource.close();
              addResult('SSE Connection', 'success', '✅ Teste SSE concluído', {
                url,
                closed: true
              });
            }
            resolve();
          }, 2000);
        };
        
        eventSource.onmessage = (event) => {
          addResult('SSE Message', 'success', '📨 Mensagem SSE recebida', {
            data: event.data,
            type: event.type
          });
        };
        
        eventSource.onerror = (error) => {
          clearTimeout(timeoutId);
          addResult('SSE Connection', 'error', '❌ Erro na conexão SSE', {
            url,
            error: error,
            readyState: eventSource?.readyState
          });
          if (eventSource) {
            eventSource.close();
          }
          resolve();
        };
        
      } catch (error) {
        clearTimeout(timeoutId);
        addResult('SSE Connection', 'error', `❌ Erro ao criar EventSource: ${error instanceof Error ? error.message : 'Desconhecido'}`, {
          url,
          error: error
        });
        resolve();
      }
    });
  };

  const testNetworkInfo = () => {
    addResult('Network Info', 'warning', 'Coletando informações de rede...');
    
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      onLine: navigator.onLine,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : 'Não disponível',
      location: {
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port,
        origin: window.location.origin
      },
      sseConfig: SSE_CONFIG
    };
    
    addResult('Network Info', 'success', '📊 Informações de rede coletadas', info);
  };

  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();
    
    addResult('Diagnóstico', 'warning', '🚀 Iniciando diagnóstico completo...');
    
    // Teste 1: Informações de rede
    testNetworkInfo();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Teste 2: Backend health
    await testBackendHealth();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Teste 3: API endpoint
    await testAPIEndpoint();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Teste 4: SSE connection
    await testSSEConnection();
    
    addResult('Diagnóstico', 'success', '✅ Diagnóstico concluído!');
    setIsRunning(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🔍 Diagnóstico de Conexão</h1>
          <p className="text-gray-400">
            Diagnóstico completo da conectividade SSE + API REST
          </p>
        </div>

        {/* Configuração */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">⚙️ Configuração</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                ID da Máquina
              </label>
              <input
                type="number"
                value={machineId}
                onChange={(e) => setMachineId(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                onClick={runAllTests}
                disabled={isRunning}
                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                  isRunning
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isRunning ? '🔄 Executando...' : '🚀 Executar Diagnóstico'}
              </button>
              
              <button
                onClick={clearResults}
                disabled={isRunning}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors font-semibold"
              >
                🗑️ Limpar
              </button>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-blue-400">Configuração Atual:</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Base URL:</p>
                <p className="font-mono text-green-400">{SSE_CONFIG.baseUrl}</p>
              </div>
              <div>
                <p className="text-gray-400">SSE URL:</p>
                <p className="font-mono text-green-400">{getSSEUrl(machineId)}</p>
              </div>
              <div>
                <p className="text-gray-400">API URL:</p>
                <p className="font-mono text-green-400">{getAPIUrl(API_ENDPOINTS.consultarContexto(machineId))}</p>
              </div>
              <div>
                <p className="text-gray-400">Reconnect Interval:</p>
                <p className="font-mono text-green-400">{SSE_CONFIG.reconnectInterval}ms</p>
              </div>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Resultados do Diagnóstico</h2>
          
          {testResults.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              Clique em "Executar Diagnóstico" para começar
            </p>
          ) : (
            <div className="space-y-3">
              {testResults.map((result, index) => (
                <div key={index} className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getStatusIcon(result.status)}</span>
                      <span className={`font-semibold ${getStatusColor(result.status)}`}>
                        {result.test}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{result.timestamp}</span>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-2">{result.message}</p>
                  
                  {result.details && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-400 hover:text-white mb-2">
                        Ver detalhes
                      </summary>
                      <pre className="bg-gray-800 rounded p-2 overflow-auto max-h-32 text-gray-300">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Soluções Comuns */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">💡 Soluções Comuns:</h3>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>• <strong>CORS:</strong> Verificar se o backend permite CORS do seu domínio</li>
            <li>• <strong>Firewall:</strong> Confirmar se a porta 8000 está liberada</li>
            <li>• <strong>Backend:</strong> Verificar se o servidor está rodando em http://10.200.0.184:8000</li>
            <li>• <strong>Rede:</strong> Testar conectividade: <code>curl http://10.200.0.184:8000/docs</code></li>
            <li>• <strong>SSE:</strong> Testar SSE: <code>curl -N http://10.200.0.184:8000/api/sse/updates/135</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}


