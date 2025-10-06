import React from 'react';
import { Clock, AlertCircle, Gauge, Trash2, Info } from 'lucide-react';
import type { ChildMachineProduction } from '../types/production';

interface ChildMachineCardProps {
  production: ChildMachineProduction;
  onAddReject: (gradeId: number) => Promise<void>;
}

export function ChildMachineCard({ production, onAddReject }: ChildMachineCardProps) {
  const { machine, stats, parameters, produto, grade } = production;
  const isActive = parameters?.producao_ativa || false;
  
  // Verificar se a estação está vazia (sem grade alocada)
  const isEmpty = !grade;

  // Calcular progresso
  const progress = grade ? 
    Math.min(100, Math.round((stats.produzido / grade.quantidade) * 100)) : 0;
  
  // Calcular tempo decorrido: usar minutos_disponivel se > 0, senão calcular baseado no último sinal
  let tempoDecorrido = stats.minutos_disponivel || 0;
  if (tempoDecorrido === 0 && stats.ultimo_sinal) {
    const agora = Math.floor(Date.now() / 1000);
    const tempoDecorridoSegundos = agora - stats.ultimo_sinal;
    tempoDecorrido = Math.floor(tempoDecorridoSegundos / 60); // Converter para minutos
  }
  
  const tempoEstimadoTotal = grade?.minutos_estimado || 0;
  const tempoRestante = Math.max(0, tempoEstimadoTotal - tempoDecorrido);

  return (
    <div className={`
      bg-black/20 backdrop-blur-sm rounded-xl border 
      ${isActive ? 'border-blue-400/40' : 'border-white/30 opacity-80'}
      transition-all duration-200
    `}>
      {/* Cabeçalho */}
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-white drop-shadow-sm">#{machine.numero_estacao}</span>
            {isEmpty ? (
              <div className="flex items-center text-white/90">
                <Info className="w-4 h-4 mr-2" />
                <span className="font-medium">Sem produção alocada</span>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-white drop-shadow-sm">{produto?.referencia || '-'}</h3>
                <p className="text-sm text-white/90 font-medium">{produto?.descricao}</p>
              </div>
            )}
          </div>
          {grade && onAddReject && (
            <button
              onClick={() => onAddReject(grade.id)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white 
                        rounded-lg transition-all duration-200 text-sm font-bold
                        flex items-center gap-2 border border-red-500
                        shadow-lg hover:shadow-xl drop-shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              Rejeito
            </button>
          )}
        </div>

        {/* Tamanho e Progresso */}
        {!isEmpty && (
          <div className="mb-3">
            {grade && (
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white font-bold">Tamanho: <span className="text-blue-200 drop-shadow-sm">{grade.tamanho}</span></span>
                <span className="text-sm text-white font-bold">
                  {stats.produzido} / {grade.quantidade} ({progress}%)
                </span>
              </div>
            )}
            <div className="w-full bg-white/30 rounded-full h-2 border border-white/20">
              <div 
                className="bg-blue-300 h-2 rounded-full drop-shadow-sm" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Status e Métricas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-3 border border-white/20 backdrop-blur-sm">
            <div className="text-sm text-white font-bold mb-1">Velocidade</div>
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-300" />
              <span className="text-lg font-bold text-white drop-shadow-sm">{stats.velocidade} RPM</span>
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-3 border border-white/20 backdrop-blur-sm">
            <div className="text-sm text-white font-bold mb-1">Produzido</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-white drop-shadow-sm">{stats.produzido}</span>
              {grade && (
                <span className="text-sm text-white/90 font-medium">/ {grade.quantidade}</span>
              )}
            </div>
          </div>

          <div className="bg-black/30 rounded-lg p-3 border border-white/20 backdrop-blur-sm">
            <div className="text-sm text-white font-bold mb-1">Rejeitos</div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-red-300 drop-shadow-sm">{stats.rejeitos}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Informações de Tempo */}
      <div className="p-4 flex items-center justify-between">
        {isEmpty ? (
          <div className="text-sm text-white/90 italic font-medium">
            Configure uma produção para esta estação
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm text-white font-bold mb-1">Tempo Decorrido</div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-300" />
                <span className="text-white font-bold drop-shadow-sm">{tempoDecorrido} min</span>
              </div>
            </div>
            <div>
              <div className="text-sm text-white font-bold mb-1">Tempo Restante</div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-300" />
                <span className="text-white font-bold drop-shadow-sm">{tempoRestante} min</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 