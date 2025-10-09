/**
 * Componente de Debug para Armazenamento WebSocket
 * 
 * Este componente mostra informações sobre o armazenamento local de dados WebSocket,
 * incluindo estações, mensagens e estatísticas.
 */

import React, { useState, useEffect } from 'react';
import { useWebSocketStorage } from '../lib/websocketStorage';
import { Database, MessageSquare, Zap, Trash2, RefreshCw, Download } from 'lucide-react';

interface WebSocketStorageDebugProps {
  parentMachineId: number;
  isVisible?: boolean;
  onToggle?: () => void;
}

export function WebSocketStorageDebug({ 
  parentMachineId, 
  isVisible = false,
  onToggle 
}: WebSocketStorageDebugProps) {
  const storage = useWebSocketStorage();
  
  // ✅ Inicialização segura com tratamento de erro
  const [stats, setStats] = useState(() => {
    try {
      return storage.getStats();
    } catch (error) {
      console.warn('⚠️ [WebSocketDebug] Erro ao obter stats iniciais:', error);
      return { total_messages: 0, stations_count: 0, last_update: 0, memory_usage: 0 };
    }
  });
  
  const [stations, setStations] = useState(() => {
    try {
      return storage.getStationsByParent(parentMachineId);
    } catch (error) {
      console.warn('⚠️ [WebSocketDebug] Erro ao obter estações iniciais:', error);
      return [];
    }
  });
  
  const [recentMessages, setRecentMessages] = useState(() => {
    try {
      return storage.getMessagesByMachine ? storage.getMessagesByMachine(parentMachineId, 10) : [];
    } catch (error) {
      console.warn('⚠️ [WebSocketDebug] Erro ao obter mensagens iniciais:', error);
      return [];
    }
  });

  // Atualizar dados periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        setStats(storage.getStats());
        setStations(storage.getStationsByParent(parentMachineId));
        setRecentMessages(storage.getMessagesByMachine ? storage.getMessagesByMachine(parentMachineId, 10) : []);
      } catch (error) {
        console.warn('⚠️ [WebSocketDebug] Erro ao atualizar dados:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [storage, parentMachineId]);

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 z-50"
        title="Mostrar Debug WebSocket"
      >
        <Database className="w-5 h-5" />
      </button>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-96 max-h-96 overflow-hidden z-50">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">Debug WebSocket Storage</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setStats(storage.getStats());
              setStations(storage.getStationsByParent(parentMachineId));
              setRecentMessages(storage.getMessagesByMachine(parentMachineId, 10));
            }}
            className="text-gray-400 hover:text-white transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              const data = storage.exportData();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `websocket-storage-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-gray-400 hover:text-white transition-colors"
            title="Exportar dados"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
            title="Fechar"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        {/* Estatísticas Gerais */}
        <div className="bg-gray-800 rounded-lg p-3">
          <h4 className="text-white font-medium mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Estatísticas
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-300">
              <span className="text-gray-400">Mensagens:</span> {stats.total_messages}
            </div>
            <div className="text-gray-300">
              <span className="text-gray-400">Estações:</span> {stats.stations_count}
            </div>
            <div className="text-gray-300">
              <span className="text-gray-400">Memória:</span> {formatBytes(stats.memory_usage)}
            </div>
            <div className="text-gray-300">
              <span className="text-gray-400">Última atualização:</span> {formatTimestamp(stats.last_update)}
            </div>
          </div>
        </div>

        {/* Estações */}
        <div className="bg-gray-800 rounded-lg p-3">
          <h4 className="text-white font-medium mb-2 flex items-center gap-2">
            <Database className="w-4 h-4 text-green-400" />
            Estações ({stations.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {stations.map(station => (
              <div key={station.id_maquina} className="bg-gray-700 rounded p-2 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white font-medium">{station.nome}</span>
                  <span className="text-gray-400">{formatTimestamp(station.last_update)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-green-400">Sinais: {station.sinais}</div>
                  <div className="text-red-400">Rejeitos: {station.rejeitos}</div>
                  <div className="text-blue-400">Válidos: {station.sinais_validos}</div>
                </div>
              </div>
            ))}
            {stations.length === 0 && (
              <div className="text-gray-400 text-center py-2">
                Nenhuma estação encontrada
              </div>
            )}
          </div>
        </div>

        {/* Mensagens Recentes */}
        <div className="bg-gray-800 rounded-lg p-3">
          <h4 className="text-white font-medium mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            Mensagens Recentes ({recentMessages.length})
          </h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {recentMessages.map((message, index) => (
              <div key={index} className="bg-gray-700 rounded p-2 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white font-medium">{message.type}</span>
                  <span className="text-gray-400">{formatTimestamp(message.timestamp * 1000)}</span>
                </div>
                <div className="text-gray-300">
                  Máquina: {message.target_machine_id}
                  {message.source_machine_id && ` → ${message.source_machine_id}`}
                </div>
              </div>
            ))}
            {recentMessages.length === 0 && (
              <div className="text-gray-400 text-center py-2">
                Nenhuma mensagem recente
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              storage.clear();
              setStats(storage.getStats());
              setStations([]);
              setRecentMessages([]);
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Tudo
          </button>
        </div>
      </div>
    </div>
  );
}
