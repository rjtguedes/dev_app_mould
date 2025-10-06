import React from 'react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import type { WeekMachine } from '../types/production';

interface ProductionCardProps {
  production: WeekMachine;
  selectedGrades: Set<number>;
  onSelectGrade: (gradeId: number) => void;
  onSelectAllGrades: (production: WeekMachine) => void;
  onFinishBatch: (type: 'partial' | 'complete') => void;
  onFinishProduction: (productionId: number) => Promise<void>;
  isFinishingBatch: boolean;
  onAddReject: (gradeId: number) => void;
}

export function ProductionCard({ 
  production,
  selectedGrades,
  onSelectGrade,
  onSelectAllGrades,
  onFinishBatch,
  isFinishingBatch,
  onAddReject
}: ProductionCardProps) {
  // Ordenar grades por número da estação
  const sortedGrades = React.useMemo(() => {
    return [...(production.grade_semana_maquina || [])].sort(
      (a, b) => a.numero_estacao - b.numero_estacao
    );
  }, [production.grade_semana_maquina]);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-white/5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {production.produto?.referencia || 'Sem referência'}
            </h3>
            <p className="text-blue-200 text-sm">{production.produto?.descricao}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-500/20 rounded-full text-green-200 text-sm border border-green-500/30">
                {production.quantidade_produzida}/{production.quantidade}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedGrades.size === sortedGrades.length}
                  onChange={() => onSelectAllGrades(production)}
                  className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                />
              </th>
              <th className="p-4 text-left text-sm font-medium text-white/60">Estação</th>
              <th className="p-4 text-left text-sm font-medium text-white/60">Matriz</th>
              <th className="p-4 text-left text-sm font-medium text-white/60">Tamanho</th>
              <th className="p-4 text-right text-sm font-medium text-white/60">Meta</th>
              <th className="p-4 text-right text-sm font-medium text-white/60">Produzido</th>
              <th className="p-4 text-right text-sm font-medium text-white/60">Saldo</th>
              <th className="p-4 text-center text-sm font-medium text-white/60">Status</th>
              <th className="p-4 text-right text-sm font-medium text-white/60">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {sortedGrades.map(grade => {
              const isComplete = grade.status === 'concluido';
              const isInProgress = grade.status === 'em_producao';
              const isDisabled = !grade.ativo;

              return (
                <tr key={grade.id} 
                    className={`transition-colors
                      ${isDisabled ? 'opacity-50 bg-gray-900/40' : 
                        isComplete ? 'bg-green-900/20' : 
                        'hover:bg-white/5'}`}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedGrades.has(grade.id)}
                      onChange={() => onSelectGrade(grade.id)}
                      disabled={isDisabled}
                      className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500
                               disabled:opacity-50"
                    />
                  </td>
                  <td className="p-4 text-white font-medium">{grade.numero_estacao}</td>
                  <td className="p-4 text-white">{grade.matriz?.identificador}</td>
                  <td className="p-4 text-white">{grade.tamanho}</td>
                  <td className="p-4 text-right text-white">{grade.quantidade}</td>
                  <td className="p-4 text-right text-green-300">{grade.quantidade_produzida || 0}</td>
                  <td className="p-4 text-right text-blue-300">{grade.saldo || grade.quantidade}</td>
                  <td className="p-4">
                    <div className="flex justify-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium min-w-[90px] text-center
                        ${isComplete 
                          ? 'bg-green-500/20 text-green-200 border border-green-500/30'
                          : isInProgress
                          ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                          : 'bg-white/10 text-white/60 border border-white/20'
                        }`}
                      >
                        {grade.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-end">
                      {!isDisabled && !isComplete && (
                        <button
                          onClick={() => onAddReject(grade.id)}
                          className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 
                                    rounded-lg transition-all duration-200 text-sm font-medium
                                    flex items-center gap-1 border border-red-500/30"
                        >
                          <Trash2 className="w-3 h-3" />
                          Rejeito
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}