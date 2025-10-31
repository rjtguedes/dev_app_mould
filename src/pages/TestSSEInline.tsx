// 🧪 Teste SSE Inline (dentro do dashboard)

import React, { useState } from 'react';
import { useSSEManager } from '../hooks/useSSEManager';
import { Wifi, WifiOff, RefreshCcw, Activity } from 'lucide-react';

interface TestSSEInlineProps {
  machineId: number;
}

export function TestSSEInline({ machineId }: TestSSEInlineProps) {
  const [enabled, setEnabled] = useState(true);

  const {
    machineData,
    isConnected,
    isLoading,
    error,
    reconnect,
    consultarContexto,
    iniciarSessao,
    adicionarRejeitos
  } = useSSEManager({
    machineId,
    enabled
  });

  return (
    <div className="fixed bottom-4 right-4 z-50" style={{ display: 'none' }}>
      {/* Toggle Button */}
      <button
        onClick={() => setEnabled(!enabled)}
        className={`mb-2 px-4 py-2 rounded-lg font-semibold transition-all shadow-lg ${
          enabled
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-gray-600 hover:bg-gray-700'
        } text-white`}
        style={{ display: 'none' }}
      >
        {enabled ? '🟢 SSE Ativo' : '🔴 SSE Inativo'}
      </button>

      {/* Status Card */}
      {enabled && (
        <div className="bg-gray-800 rounded-lg shadow-2xl p-4 w-80 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold">🧪 SSE Test</h3>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-400" />
              )}
              {isLoading && <Activity className="w-4 h-4 text-yellow-400 animate-spin" />}
            </div>
          </div>

          {/* Status */}
          <div className="mb-3">
            <p className={`text-sm font-semibold ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
            </p>
            {error && (
              <p className="text-xs text-red-400 mt-1">❌ {error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => reconnect()}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white transition-colors"
            >
              <RefreshCcw className="w-3 h-3" />
              Reconectar
            </button>
            <button
              onClick={() => consultarContexto()}
              className="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 rounded text-xs text-white transition-colors"
            >
              Contexto
            </button>
          </div>

          {/* Test Commands */}
          <div className="space-y-2">
            <button
              onClick={async () => {
                const result = await iniciarSessao({
                  id_operador: 1,
                  id_turno: 3
                });
                console.log('🧪 SSE Test - Iniciar Sessão:', result);
              }}
              className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-sm text-white transition-colors"
            >
              🚀 Iniciar Sessão
            </button>
            <button
              onClick={async () => {
                const result = await adicionarRejeitos({
                  quantidade: 1,
                  id_motivo_rejeito: 1
                });
                console.log('🧪 SSE Test - Adicionar Rejeito:', result);
              }}
              className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm text-white transition-colors"
            >
              ➕ Adicionar Rejeito
            </button>
          </div>

          {/* Data Preview */}
          {machineData && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Dados SSE:</p>
              <pre className="text-xs text-gray-300 overflow-auto max-h-32 bg-gray-900 rounded p-2">
                {JSON.stringify(machineData, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


