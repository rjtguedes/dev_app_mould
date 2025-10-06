import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { finishProduction } from '../lib/production';
import type { WeekMachineGrade, ProductionFinishType } from '../types/production';

interface ProductionControlProps {
  grade: WeekMachineGrade;
  productionId: number;
  operatorId: number;
  onFinish: () => Promise<void>;
}

export function ProductionControl({ 
  grade, 
  productionId, 
  operatorId, 
  onFinish
}: ProductionControlProps) {
  const [isFinishing, setIsFinishing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const handleFinish = async () => {
    try {
      setIsFinishing(true);
      setError(null);
      const now = new Date().toISOString();
      
      await finishProduction(productionId, operatorId, {
        id: productionId,
        quantidade_produzida: grade.quantidade_produzida || 0,
        quantidade_rejeitada: 0,
        data_inicio: now
      });
      
      await onFinish();
    } catch (err) {
      setError('Erro ao finalizar produção');
      console.error(err);
    } finally {
      setIsFinishing(false);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-red-400 text-sm">{error}</span>
      )}
      
      <button
        onClick={handleFinish}
        disabled={isFinishing}
        className={`
          px-3 py-1.5 rounded-lg flex items-center gap-2 
          ${isFinishing
            ? 'bg-green-500/30 cursor-not-allowed'
            : 'bg-green-500/20 hover:bg-green-500/30'
          }
          transition-colors duration-200
        `}
      >
        <CheckCircle2 className="w-4 h-4 text-green-400" />
        <span className="text-green-300 text-sm">Finalizar</span>
      </button>
    </div>
  );
}