// 🧪 Página de teste SSE

import React, { useState } from 'react';
import { useSSEManager } from '../hooks/useSSEManager';
import { Wifi, WifiOff, Activity, RefreshCcw, Send } from 'lucide-react';

export function TestSSE() {
  const [machineId, setMachineId] = useState(135);
  const [enabled, setEnabled] = useState(true);

  const {
    machineData,
    isConnected,
    isLoading,
    error,
    disconnect,
    reconnect,
    consultarContexto,
    iniciarSessao,
    adicionarRejeitos,
    iniciarProducao
  } = useSSEManager({
    machineId,
    enabled
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🧪 Teste SSE + API REST</h1>
          <p className="text-gray-400">
            Testar comunicação via Server-Sent Events e API REST
          </p>
        </div>

        {/* Configuração */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">⚙️ Configuração</h2>
          
          <div className="grid grid-cols-2 gap-4">
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

            <div className="flex items-end">
              <button
                onClick={() => setEnabled(!enabled)}
                className={`w-full px-4 py-2 rounded-lg font-semibold transition-colors ${
                  enabled
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {enabled ? '🟢 SSE Ativo' : '🔴 SSE Inativo'}
              </button>
            </div>
          </div>
        </div>

        {/* Status da Conexão */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">📡 Status da Conexão</h2>
          
          <div className="flex items-center gap-4 mb-4">
            {isConnected ? (
              <div className="flex items-center gap-2 text-green-400">
                <Wifi className="w-5 h-5" />
                <span className="font-semibold">Conectado</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <WifiOff className="w-5 h-5" />
                <span className="font-semibold">Desconectado</span>
              </div>
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-yellow-400">
                <Activity className="w-5 h-5 animate-spin" />
                <span>Carregando...</span>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
              <p className="text-red-400">❌ {error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => disconnect()}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <WifiOff className="w-4 h-4" />
              Desconectar
            </button>
            <button
              onClick={() => reconnect()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Reconectar
            </button>
            <button
              onClick={() => consultarContexto()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
              Consultar Contexto
            </button>
          </div>
        </div>

        {/* Comandos de Teste */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">🎮 Comandos de Teste</h2>
          
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={async () => {
                const result = await iniciarSessao({
                  id_operador: 1,
                  id_turno: 3
                });
                console.log('Iniciar Sessão:', result);
              }}
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-semibold"
            >
              🚀 Iniciar Sessão
            </button>

            <button
              onClick={async () => {
                const result = await iniciarProducao({
                  id_mapa: 1,
                  tempo_ciclo: 15
                });
                console.log('Iniciar Produção:', result);
              }}
              className="px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-semibold"
            >
              ▶️ Iniciar Produção
            </button>

            <button
              onClick={async () => {
                const result = await adicionarRejeitos({
                  quantidade: 1,
                  id_motivo_rejeito: 1
                });
                console.log('Adicionar Rejeitos:', result);
              }}
              className="px-4 py-3 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors font-semibold"
            >
              ➕ Adicionar Rejeito
            </button>
          </div>
        </div>

        {/* Dados da Máquina */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📊 Dados da Máquina (SSE)</h2>
          
          {machineData ? (
            <pre className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96 text-sm">
              {JSON.stringify(machineData, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-400">
              Aguardando dados via SSE...
            </p>
          )}
        </div>

        {/* Informações */}
        <div className="mt-6 bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <h3 className="text-blue-400 font-semibold mb-2">💡 Como usar:</h3>
          <ul className="text-sm text-blue-300 space-y-1">
            <li>1. Configure o ID da máquina</li>
            <li>2. Verifique o status da conexão SSE</li>
            <li>3. Use os comandos de teste para enviar ações via API</li>
            <li>4. Observe os dados sendo atualizados em tempo real</li>
            <li>5. Abra o console do navegador para ver logs detalhados</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


