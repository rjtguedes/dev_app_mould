import React from 'react';
import { ChildMachineProduction } from '../types/production';
import { PlusCircle } from 'lucide-react';

interface ChildMachineGridProps {
  productions: ChildMachineProduction[];
  onAddReject: (machineId: number) => void;
  statusParada?: boolean;
  noGaps?: boolean;
  isEvaMode?: boolean; // Nova prop para modo EVA
  side?: 'left' | 'right'; // Nova prop para identificar o lado (E ou D)
  lastSignalStationId?: number | null; // ID da última estação que recebeu sinal
}

export function ChildMachineGrid({ 
  productions, 
  onAddReject, 
  statusParada, 
  noGaps = false,
  isEvaMode = false,
  side = 'left',
  lastSignalStationId = null
}: ChildMachineGridProps) {
  
  // Para modo EVA, sempre mostrar 8 linhas
  const evaStations = React.useMemo(() => {
    if (!isEvaMode) return [];
    
    // Criar array de 8 posições
    const stations = Array.from({ length: 8 }, (_, index) => {
      const stationNumber = index + 1;
      
      // Se temos produção para esta posição, usar ela
      const production = index < productions.length ? productions[index] : null;
      
      return {
        stationNumber,
        production,
        isEmpty: !production
      };
    });
    
    return stations;
  }, [productions, isEvaMode, side]);

  // Gerar identificadores EVA: apenas o número da estação
  const getEvaIdentifier = (stationNumber: number) => {
    return stationNumber.toString();
  };

  if (isEvaMode) {
    return (
             <div className="w-full text-white bg-black/20 rounded-lg border border-white/10 overflow-hidden">
        
        {/* Header para modo EVA */}
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 py-3 px-3 bg-black/30 border-b border-white/20 text-gray-300 text-xs font-semibold uppercase tracking-wide">
          <div className="text-center">Estação</div>
          <div className="text-center">Produção</div>
          <div className="text-center">Ação</div>
        </div>

        {/* Rows para modo EVA - sempre 8 linhas */}
        {evaStations.map((station, index) => (
          <div
            key={`eva-station-${side}-${station.stationNumber}`}
            className={`grid grid-cols-[1fr_1fr_1fr] gap-0 py-3 px-3 border-b border-white/5 items-center text-xs transition-colors hover:bg-white/5 ${
              station.production?.websocket_data?.highlight_until && station.production.websocket_data.highlight_until > Date.now() 
                ? 'bg-green-800/50 animate-pulse' 
                : ''
            }`}
          >
            {/* Identificador da Estação */}
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full text-sm font-bold border-2 ${
                station.isEmpty 
                  ? 'bg-gray-600/20 text-gray-400 border-gray-500/30' 
                  : station.production && station.production.machine.id_maquina === lastSignalStationId
                    ? 'bg-green-600/20 text-green-300 border-green-500 border-[3px]' 
                    : 'bg-blue-600/20 text-blue-300 border-blue-500/30'
              }`}>
                {getEvaIdentifier(station.stationNumber)}
              </div>
              <div className={`mt-1 text-xs truncate ${station.isEmpty ? 'text-gray-500' : 'text-gray-400'}`} 
                   title={station.production?.machine.nome || 'Estação não configurada'}>
                {station.production?.machine.nome || 'Estação não configurada'}
              </div>
            </div>
            
            {/* Dados de Produção */}
            <div className="text-center">
              {station.production ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="text-2xl font-bold text-green-400">
                    {station.production.websocket_data?.sessao_operador?.sinais || station.production.stats.produzido || 0} prs
                  </div>
                  <div className="text-2xl font-bold text-red-400">
                    {station.production.websocket_data?.sessao_operador?.rejeitos || station.production.stats.rejeitos || 0} prs
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Sem dados</div>
              )}
            </div>
            
            {/* Botão de Rejeitos */}
            <div className="text-center">
              {station.production ? (
                <button
                  onClick={() => onAddReject(station.production!.machine.id_maquina)}
                  className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-red-500/25 border-2 border-red-500"
                >
                  <PlusCircle className="w-4 h-4" /> 
                  Rejeito
                </button>
              ) : (
                <button
                  disabled
                  className="bg-gray-600 text-gray-400 px-4 py-2 rounded-md text-sm font-medium cursor-not-allowed border-2 border-gray-500"
                >
                  -
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Modo padrão (não EVA) - manter o comportamento original
  return (
    <div className="w-full text-white bg-black/20 rounded-lg border border-white/10 overflow-hidden">
      {/* Header */}
      <div className={`grid grid-cols-[0.5fr_1.5fr_1fr_1fr] ${noGaps ? 'gap-0' : 'gap-2'} py-3 px-3 bg-black/30 border-b border-white/20 text-gray-300 text-xs font-semibold uppercase tracking-wide`}>
        <div className="text-left">#</div>
        <div className="text-left">Estação</div>
        <div className="text-center">Produto</div>
        <div className="text-center">Produção</div>
      </div>

      {/* Rows */}
      {productions.map((production, index) => (
        <div
          key={production.machine.id_maquina}
          className={`grid grid-cols-[0.5fr_1.5fr_1fr_1fr] ${noGaps ? 'gap-0' : 'gap-2'} py-3 px-3 border-b border-white/5 items-center text-xs transition-colors hover:bg-white/5 ${
            production.websocket_data?.highlight_until && production.websocket_data.highlight_until > Date.now()
              ? 'bg-green-800/50 animate-pulse' 
              : index % 2 === 0 ? 'bg-white/5' : 'bg-transparent'
          }`}
        >
          {/* Número da Estação */}
          <div className="text-left">
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
              production.machine.id_maquina === lastSignalStationId
                ? 'bg-green-600/20 text-green-300 border border-green-500'
                : 'bg-blue-600/20 text-blue-300'
            }`}>
              {production.machine.numero_estacao}
            </span>
          </div>
          
          {/* Nome da Estação */}
          <div className="text-left">
            <div className="font-medium text-white truncate" title={production.machine.nome}>
              {production.machine.nome}
            </div>
          </div>
          
          {/* Produto */}
          <div className="text-center">
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700/50 rounded-md">
              <span className="text-gray-300 text-xs">
                {production.produto?.referencia || production.parameters.produto?.referencia || 'Sem produção'}
              </span>
            </div>
          </div>
          
          {/* Produção */}
          <div className="text-center">
            <div className="flex flex-col items-center gap-1">
              <span className="font-bold text-lg text-green-400">
                {production.websocket_data?.sessao_operador?.sinais || production.stats.produzido || 0}
              </span>
              <span className="text-gray-400 text-xs">
                Rej: {production.websocket_data?.sessao_operador?.rejeitos || production.stats.rejeitos || 0}
              </span>
              {/* Botão de Rejeitos */}
              <button
                onClick={() => onAddReject(production.machine.id_maquina)}
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-red-500/25 mt-1"
              >
                <PlusCircle className="w-3 h-3" /> 
                Rejeitos
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 