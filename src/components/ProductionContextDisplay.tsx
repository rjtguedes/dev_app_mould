import React from 'react';
import { Package, User, Clock, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import type { OperatorSession, ProductionMap } from '../types/websocket-new';

interface ProductionContextDisplayProps {
  type: 'session' | 'production_map';
  data: OperatorSession | ProductionMap | null;
  machineName: string;
}

export function ProductionContextDisplay({ type, data, machineName }: ProductionContextDisplayProps) {
  if (!data) {
    return (
      <div className="bg-white/5 rounded-lg border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          {type === 'session' ? (
            <>
              <User className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-blue-400">Sessão Operador</span>
            </>
          ) : (
            <>
              <Package className="w-5 h-5 text-green-400" />
              <span className="font-semibold text-green-400">Produção Mapa</span>
            </>
          )}
        </div>
        <div className="text-center py-4">
          <p className="text-white/60 text-sm">
            {type === 'session' ? 'Nenhuma sessão ativa' : 'Nenhuma ordem de produção ativa'}
          </p>
        </div>
      </div>
    );
  }

  const isProductionMap = type === 'production_map';
  const sessionData = data as OperatorSession;
  const productionData = data as ProductionMap;

  // Dados comuns
  const sinais = isProductionMap ? productionData.sinais : sessionData.sinais;
  const rejeitos = isProductionMap ? productionData.rejeitos : sessionData.rejeitos;
  const sinaisValidos = isProductionMap ? productionData.sinais_validos : sessionData.sinais_validos;
  
  // Dados específicos do ProductionMap
  const saldoAProduzir = isProductionMap ? productionData.saldo_a_produzir : null;
  const qtProduzir = isProductionMap ? productionData.qt_produzir : null;
  const progresso = qtProduzir ? Math.round((sinaisValidos / qtProduzir) * 100) : 0;

  // Tempo decorrido
  const tempoDecorrido = isProductionMap ? productionData.tempo_decorrido_segundos : sessionData.tempo_decorrido_segundos;
  const tempoFormatado = formatarTempo(tempoDecorrido);

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {type === 'session' ? (
            <>
              <User className="w-5 h-5 text-blue-400" />
              <span className="font-semibold text-blue-400">Sessão Operador</span>
            </>
          ) : (
            <>
              <Package className="w-5 h-5 text-green-400" />
              <span className="font-semibold text-green-400">Produção Mapa</span>
            </>
          )}
        </div>
        
        {isProductionMap && qtProduzir && (
          <div className="flex items-center gap-1 text-xs text-white/70">
            <Target className="w-4 h-4" />
            <span>Meta: {qtProduzir}</span>
          </div>
        )}
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Sinais Válidos */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-xs text-white/70">Válidos</span>
          </div>
          <div className="text-lg font-bold text-green-400">{sinaisValidos}</div>
        </div>

        {/* Rejeitos */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-white/70">Rejeitos</span>
          </div>
          <div className="text-lg font-bold text-red-400">{rejeitos}</div>
        </div>

        {/* Total de Sinais */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Package className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-white/70">Total</span>
          </div>
          <div className="text-lg font-bold text-blue-400">{sinais}</div>
        </div>
      </div>

      {/* Informações específicas do ProductionMap */}
      {isProductionMap && (
        <div className="border-t border-white/10 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Saldo a Produzir</span>
            <span className="font-semibold text-orange-400">{saldoAProduzir}</span>
          </div>
          
          {qtProduzir && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/70">Progresso</span>
                <span className="text-xs text-white/70">{progresso}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, progresso)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tempo decorrido */}
      <div className="border-t border-white/10 pt-3">
        <div className="flex items-center justify-center gap-2">
          <Clock className="w-4 h-4 text-white/70" />
          <span className="text-sm text-white/70">Tempo decorrido:</span>
          <span className="text-sm font-semibold text-white">{tempoFormatado}</span>
        </div>
      </div>
    </div>
  );
}

// Função auxiliar para formatar tempo
function formatarTempo(segundos: number): string {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const segs = segundos % 60;

  if (horas > 0) {
    return `${horas}h ${minutos}m`;
  } else if (minutos > 0) {
    return `${minutos}m ${segs}s`;
  } else {
    return `${segs}s`;
  }
}
