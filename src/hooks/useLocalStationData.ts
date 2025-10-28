/**
 * Hook para usar dados das estações do armazenamento local
 * 
 * Este hook fornece uma interface limpa para acessar dados das estações
 * armazenados localmente via WebSocket, com fallback para dados do Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { useWebSocketStorage, type StationData } from '../lib/websocketStorage';
import type { ChildMachineProduction } from '../types/production';

interface UseLocalStationDataOptions {
  parentMachineId: number;
  fallbackProductions?: ChildMachineProduction[];
}

interface LocalStationData {
  id_maquina: number;
  nome: string;
  sinais: number;
  rejeitos: number;
  sinais_validos: number;
  tempo_decorrido_segundos: number;
  last_update: number;
  data_source: 'websocket' | 'fallback';
}

export function useLocalStationData({ 
  parentMachineId, 
  fallbackProductions = [] 
}: UseLocalStationDataOptions) {
  const storage = useWebSocketStorage();
  const [stationData, setStationData] = useState<LocalStationData[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // Função para converter dados do storage para o formato local
  const convertStationData = useCallback((storageData: StationData[]): LocalStationData[] => {
    return storageData.map(data => ({
      id_maquina: data.id_maquina,
      nome: data.nome,
      sinais: data.sinais,
      rejeitos: data.rejeitos,
      sinais_validos: data.sinais_validos,
      tempo_decorrido_segundos: data.tempo_decorrido_segundos,
      last_update: data.last_update,
      data_source: 'websocket' as const
    }));
  }, []);

  // Função para converter dados de fallback para o formato local
  const convertFallbackData = useCallback((fallbackData: ChildMachineProduction[]): LocalStationData[] => {
    return fallbackData.map(prod => ({
      id_maquina: prod.machine.id_maquina,
      nome: prod.machine.nome,
      sinais: prod.stats.produzido || 0,
      rejeitos: prod.stats.rejeitos || 0,
      sinais_validos: prod.stats.produzido || 0, // Assumindo que produzido = válidos para fallback
      tempo_decorrido_segundos: 0,
      last_update: Date.now() - 24 * 60 * 60 * 1000, // 24 horas atrás para indicar dados antigos
      data_source: 'fallback' as const
    }));
  }, []);

  // Função para mesclar dados do WebSocket com fallback
  const mergeStationData = useCallback((
    websocketData: LocalStationData[], 
    fallbackData: LocalStationData[]
  ): LocalStationData[] => {
    const merged = new Map<number, LocalStationData>();

    // Primeiro, adicionar dados de fallback
    fallbackData.forEach(data => {
      merged.set(data.id_maquina, data);
    });

    // Depois, sobrescrever com dados do WebSocket (mais recentes)
    websocketData.forEach(data => {
      merged.set(data.id_maquina, data);
    });

    return Array.from(merged.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, []);

  // Função para atualizar dados das estações
  const updateStationData = useCallback(() => {
    // Buscar dados do armazenamento local
    const localStations = storage.getStationsByParent(parentMachineId);
    const websocketData = convertStationData(localStations);

    // Se não há dados do WebSocket, usar fallback
    if (websocketData.length === 0) {
      const fallbackData = convertFallbackData(fallbackProductions);
      setStationData(fallbackData);
      console.log(`📊 [LocalStationData] Usando dados de fallback para máquina ${parentMachineId}:`, fallbackData.length, 'estações');
    } else {
      // Mesclar dados do WebSocket com fallback para estações não encontradas
      const fallbackData = convertFallbackData(fallbackProductions);
      const mergedData = mergeStationData(websocketData, fallbackData);
      setStationData(mergedData);
      
      console.log(`📊 [LocalStationData] Dados atualizados para máquina ${parentMachineId}:`, {
        websocket_stations: websocketData.length,
        fallback_stations: fallbackData.length,
        total_stations: mergedData.length
      });
    }

    setLastUpdate(Date.now());
  }, [parentMachineId, fallbackProductions, storage, convertStationData, convertFallbackData, mergeStationData]);

  // Atualizar dados quando as dependências mudarem
  useEffect(() => {
    updateStationData();
  }, [updateStationData]);

  // Configurar polling para verificar atualizações
  useEffect(() => {
    const interval = setInterval(() => {
      updateStationData();
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(interval);
  }, [updateStationData]);

  // Função para obter dados de uma estação específica
  const getStationData = useCallback((stationId: number): LocalStationData | null => {
    return stationData.find(station => station.id_maquina === stationId) || null;
  }, [stationData]);

  // Função para obter estatísticas
  const getStats = useCallback(() => {
    const websocketStations = stationData.filter(s => s.data_source === 'websocket');
    const fallbackStations = stationData.filter(s => s.data_source === 'fallback');
    
    return {
      total_stations: stationData.length,
      websocket_stations: websocketStations.length,
      fallback_stations: fallbackStations.length,
      last_update: lastUpdate,
      storage_stats: storage.getStats()
    };
  }, [stationData, lastUpdate, storage]);

  // Função para forçar atualização
  const refresh = useCallback(() => {
    updateStationData();
  }, [updateStationData]);

  return {
    stationData,
    getStationData,
    getStats,
    refresh,
    lastUpdate
  };
}





