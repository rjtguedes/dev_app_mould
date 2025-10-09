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
    <div className="bg-white/5 rounded-2xl border-2 border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {type === 'session' ? (
            <>
              <User className="w-6 h-6 text-blue-400" />
              <span className="text-xl font-bold text-blue-400">Sessão Operador</span>
            </>
          ) : (
            <>
              <Package className="w-6 h-6 text-green-400" />
              <span className="text-xl font-bold text-green-400">Produção Mapa</span>
            </>
          )}
        </div>
        
        {isProductionMap && qtProduzir && (
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Target className="w-5 h-5" />
            <span className="font-semibold">Meta: {qtProduzir}</span>
          </div>
        )}
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Sinais Válidos */}
        <div className="text-center p-3 rounded-xl bg-green-500/10 border border-green-500/30">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-base font-semibold text-white/80">Válidos</span>
          </div>
          <div className="text-6xl leading-none font-black text-green-300">{sinaisValidos}</div>
        </div>

        {/* Rejeitos */}
        <div className="text-center p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <span className="text-base font-semibold text-white/80">Rejeitos</span>
          </div>
          <div className="text-6xl leading-none font-black text-red-300">{rejeitos}</div>
        </div>

        {/* Total de Sinais */}
        <div className="text-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-400" />
            <span className="text-base font-semibold text-white/80">Total</span>
          </div>
          <div className="text-6xl leading-none font-black text-blue-300">{sinais}</div>
        </div>
      </div>

      {/* Informações específicas do ProductionMap */}
      {isProductionMap && (
        <div className="border-t border-white/10 pt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-semibold text-white/80">Saldo a Produzir</span>
            <span className="text-3xl font-black text-orange-300">{saldoAProduzir}</span>
          </div>
          
          {qtProduzir && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/80">Progresso</span>
                <span className="text-sm font-semibold text-white/80">{progresso}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-green-400 to-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, progresso)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tempo decorrido */}
      <div className="border-t border-white/10 pt-4">
        <div className="flex items-center justify-center gap-3">
          <Clock className="w-5 h-5 text-white/70" />
          <span className="text-base text-white/80">Tempo decorrido:</span>
          <span className="text-xl font-bold text-white">{tempoFormatado}</span>
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
