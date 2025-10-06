import React from 'react';
import { ProductionFinishButton } from './ProductionFinishButton';
import { CheckCircle2 } from 'lucide-react';
import type { WeekMachine, WeekMachineGrade } from '../types/production';

interface ProductionGradesTableProps {
  grades: WeekMachineGrade[];
  selectedGrades: Set<number>;
  operatorId: number | null;
  onSelectGrade: (gradeId: number) => void;
  onSelectAll: () => void;
  onFinishProduction: () => Promise<void>;
}

export function ProductionGradesTable({
  grades,
  selectedGrades,
  onSelectGrade,
  onSelectAll
}: ProductionGradesTableProps) {
  const selectableGrades = grades.filter(grade => grade.status !== 'concluido');
  const allSelected = selectableGrades.length > 0 && 
    selectableGrades.every(grade => selectedGrades.has(grade.id));
  const someSelected = selectableGrades.some(grade => selectedGrades.has(grade.id));

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="p-4 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                ref={input => {
                  if (input) {
                    input.indeterminate = someSelected && !allSelected;
                  }
                }}
                onChange={onSelectAll}
                className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
              />
            </th>
            <th className="p-4 text-left text-sm font-medium text-white/60">Estação</th>
            <th className="p-4 text-left text-sm font-medium text-white/60">Matriz</th>
            <th className="p-4 text-left text-sm font-medium text-white/60">Tamanho</th>
            <th className="p-4 text-right text-sm font-medium text-white/60">Produzido</th>
            <th className="p-4 text-right text-sm font-medium text-white/60">Meta</th>
            <th className="p-4 text-right text-sm font-medium text-white/60">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {grades.map(grade => (
            <tr key={grade.id}>
              <td className="p-4">
                <input
                  type="checkbox"
                  checked={selectedGrades.has(grade.id)}
                  onChange={() => onSelectGrade(grade.id)}
                  className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                />
              </td>
              <td className="p-4 text-white">{grade.numero_estacao}</td>
              <td className="p-4 text-white">{grade.matriz?.identificador}</td>
              <td className="p-4 text-white">{grade.tamanho}</td>
              <td className="p-4 text-right text-white">{grade.quantidade_produzida || 0}</td>
              <td className="p-4 text-right text-white">{grade.quantidade}</td>
              <td className="p-4 text-right">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                  ${grade.status === 'concluido' 
                    ? 'bg-green-500/20 text-green-400' 
                    : grade.status === 'em_producao'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-white/10 text-white/60'
                  }`}
                >
                  {grade.status === 'concluido' 
                    ? 'Concluído'
                    : grade.status === 'em_producao'
                    ? 'Em Produção'
                    : 'Pendente'
                  }
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}