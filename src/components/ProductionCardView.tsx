import React from 'react';
import { CheckCircle2, Trash2 } from 'lucide-react';
import type { WeekMachine, WeekMachineGrade } from '../types/production';

interface ProductionCardViewProps {
  production: WeekMachine;
  selectedGrades: Set<number>;
  operatorId: number | null;
  isFinishingBatch: boolean;
  onSelectGrade: (gradeId: number) => void;
  onFinishBatch: (type: 'partial' | 'complete') => void;
  onAddReject: (gradeId: number) => void;
}

export function ProductionCardView({
  production,
  selectedGrades,
  isFinishingBatch,
  onSelectGrade,
  onFinishBatch,
  onAddReject
}: ProductionCardViewProps) {
  // Barra de ações global
  const GlobalActions = () => (
    <div className="flex items-center gap-3 bg-blue-900/40 backdrop-blur-sm px-4 py-3 rounded-xl mb-6">
      <div className="text-white">
        Estações Selecionadas: <span className="font-medium">{selectedGrades.size}</span>
      </div>
      <button
        onClick={() => onFinishBatch('partial')}
        disabled={isFinishingBatch || selectedGrades.size === 0}
        className="ml-auto px-6 py-2 bg-blue-500/80 hover:bg-blue-500 disabled:opacity-50 
                 text-white rounded-lg transition-all duration-200"
      >
        Finalizar Selecionadas
      </button>
    </div>
  );

  // Card de estação
  const StationCard = ({ grade }: { grade: WeekMachineGrade }) => {
    const isComplete = grade.status === 'concluido';
    const isInProgress = grade.status === 'em_producao';
    const isDisabled = !grade.ativo;
    const progress = Math.min(((grade.quantidade_produzida || 0) / grade.quantidade) * 100, 100);

    return (
      <div 
        onClick={() => onSelectGrade(grade.id)}
        className={`relative cursor-pointer h-[200px] flex flex-col
                   ${isDisabled ? 'opacity-50 bg-gray-900/40' : 
                     isComplete ? 'bg-green-900/20 border-green-500/30' : 
                     'bg-blue-900/40 border-white/10'}
                   backdrop-blur-sm rounded-xl border
                   ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {/* Barra lateral de status */}
        <div className={`absolute left-0 top-0 w-1 h-full rounded-l-xl
                      ${isDisabled ? 'bg-gray-500' :
                        isComplete ? 'bg-green-500' : 
                        isInProgress ? 'bg-blue-500' : 
                        'bg-white/20'}`}
        />

        {/* Cabeçalho */}
        <div className="flex-none p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-medium text-white">{grade.numero_estacao}</span>
              <span className="text-sm text-white/60">{grade.matriz?.identificador}</span>
            </div>
            {!isDisabled && !isComplete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddReject(grade.id);
                }}
                className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 
                          rounded-lg transition-all duration-200 text-xs font-medium
                          flex items-center gap-1 border border-red-500/30"
              >
                <Trash2 className="w-3 h-3" />
                Rejeito
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo - Flex para ocupar espaço restante */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          {/* Seção Superior */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm text-white/60">Tamanho</div>
                <div className="text-xl font-medium text-white">{grade.tamanho}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white/60">Matriz</div>
                <div className="text-sm text-white">{grade.matriz?.identificador}</div>
              </div>
            </div>
          </div>

          {/* Seção Inferior */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl font-medium text-white">
                {grade.quantidade_produzida || 0}/{grade.quantidade}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm
                            ${isComplete ? 'bg-green-500/20 text-green-400' : 
                              isInProgress ? 'bg-blue-500/20 text-blue-400' : 
                              'bg-white/10 text-white/60'}`}>
                {isComplete ? 'Concluído' : isInProgress ? 'Em Produção' : 'Pendente'}
              </span>
            </div>

            {/* Barra de Progresso */}
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className={`h-full rounded-full transition-all duration-300
                         ${isComplete ? 'bg-green-500' : isInProgress ? 'bg-blue-500' : 'bg-white/20'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Ordenar grades por número da estação
  const sortedGrades = React.useMemo(() => {
    return [...(production.grade_semana_maquina || [])].sort(
      (a, b) => a.numero_estacao - b.numero_estacao
    );
  }, [production.grade_semana_maquina]);

  return (
    <div className="flex-1 w-full min-h-0">
      <GlobalActions />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {sortedGrades.map(grade => (
          <StationCard 
            key={grade.id} 
            grade={grade}
            onAddReject={onAddReject}
          />
        ))}
      </div>
    </div>
  );
} 