import React, { useState } from 'react';
import { ArrowLeft, Box, Clock, AlertCircle, CheckCircle2, Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { startProduction } from '../lib/production';
import type { WeekMachine, WeekMachineGrade } from '../types/production';
import type { Machine } from '../types/machine';

interface MatrixMapProps {
  weekMachine: WeekMachine;
  machine: Machine;
  onBack: () => void;
  grades: WeekMachineGrade[];
  onMatrixConfirm: (stationNumber: number, matrixId: number) => void;
  selectedMatrices: Record<number, number>;
  onStartSetup: () => Promise<void>;
  isStarting: boolean;
  setupConfirmed: boolean;
  onSetupComplete: (selectedGradeIds: number[]) => void;
}

export function MatrixMap({ 
  weekMachine, 
  machine, 
  onBack,
  grades,
  onMatrixConfirm,
  selectedMatrices,
  onStartSetup,
  isStarting,
  setupConfirmed,
  onSetupComplete
}: MatrixMapProps) {
  const [completedSetups, setCompletedSetups] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetupComplete = (gradeId: number) => {
    setCompletedSetups(prev => {
      const newSet = new Set(prev);
      if (prev.has(gradeId)) {
        newSet.delete(gradeId);
      } else {
        newSet.add(gradeId);
      }
      
      onSetupComplete(Array.from(newSet));
      
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-xl font-bold text-white">Mapa de Matrizes</h1>
          </div>
          <div className="flex items-center gap-2 text-blue-200">
            <Box className="w-5 h-5" />
            <span>{machine.nome}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4">
        {/* Production Info */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/10 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {weekMachine.produto?.referencia || 'Sem referência'}
              </h2>
              <p className="text-blue-200 mb-4">{weekMachine.produto?.descricao || 'Sem descrição'}</p>
              <div className="flex gap-3">
                <span className="px-3 py-1 bg-green-500/20 rounded-full text-green-200 text-sm border border-green-500/30">
                  {weekMachine.quantidade_produzida}/{weekMachine.quantidade}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-blue-200">
              <Clock className="w-5 h-5" />
              <span>Tempo estimado: {weekMachine.minutos_estimado ? `${Math.floor(weekMachine.minutos_estimado / 60)}h ${weekMachine.minutos_estimado % 60}min` : 'Não definido'}</span>
            </div>
          </div>
          
          <div className="absolute right-6 bottom-6">
            <button
              onClick={onStartSetup}
              disabled={isStarting}
              className={`
                px-6 py-3 rounded-xl text-white font-medium
                flex items-center gap-2 shadow-lg
                transition-all duration-200
                ${isStarting
                  ? 'bg-blue-500/50 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600 hover:scale-105'
                }
              `}
            >
              {isStarting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Iniciar Produção
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 mb-6 text-white">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium mb-1">Instruções de Setup</h3>
              <p className="text-sm text-blue-200">
                Selecione as estações que deseja iniciar a produção marcando o checkbox ao lado de cada uma. 
                Apenas as estações selecionadas serão configuradas para produção.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h2 className="font-semibold">Erro ao carregar grades</h2>
            </div>
            <p>{error}</p>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="py-2 px-3 text-blue-200 text-xs font-medium text-center">Setup</th>
                  <th className="py-2 px-3 text-blue-200 text-xs font-medium">Est.</th>
                  <th className="py-2 px-3 text-blue-200 text-xs font-medium">Tam.</th>
                  <th className="py-2 px-3 text-blue-200 text-xs font-medium">Matriz</th>
                  <th className="py-2 px-3 text-blue-200 text-xs font-medium text-center">Qtd.</th>
                  <th className="py-2 px-3 text-blue-200 text-xs font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grade) => (
                  <tr 
                    key={grade.id} 
                    className={`border-b border-white/10 transition-colors duration-200
                      ${completedSetups.has(grade.id) 
                        ? 'bg-gradient-to-r from-green-500/30 to-green-600/20 border-l-4 border-l-green-500' 
                        : 'hover:bg-white/5'}`}
                  >
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleSetupComplete(grade.id)}
                        className={`p-1.5 rounded-lg transition-colors duration-200
                          ${completedSetups.has(grade.id) 
                            ? 'bg-green-500/30 text-green-300 hover:bg-green-500/40 ring-2 ring-green-500/50' 
                            : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:ring-2 hover:ring-blue-500/30'
                          }
                        `}
                        title={completedSetups.has(grade.id) ? "Estação selecionada para produção" : "Clique para selecionar esta estação para produção"}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${completedSetups.has(grade.id) ? 'animate-pulse' : ''}`} />
                      </button>
                    </td>
                    <td className={`py-2 px-3 font-medium ${completedSetups.has(grade.id) ? 'text-green-300' : 'text-white'}`}>
                      {grade.numero_estacao}
                    </td>
                    <td className={`py-2 px-3 ${completedSetups.has(grade.id) ? 'text-green-300' : 'text-white'}`}>
                      {grade.tamanho}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`${completedSetups.has(grade.id) 
                          ? 'text-green-300 line-through decoration-2' 
                          : 'text-white'}`}>
                          {grade.matriz?.identificador || '-'}
                        </span>
                        {grade.matriz?.tamanho && (
                          <span className={`text-xs ${completedSetups.has(grade.id) ? 'text-green-400/70' : 'text-blue-200'}`}>
                            ({grade.matriz.tamanho})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-white">{grade.quantidade}</span>
                        <span className="text-green-300 text-xs">({grade.quantidade_produzida || 0})</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`
                        px-2 py-0.5 rounded-full text-xs
                        ${grade.status === 'pendente' 
                          ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30'
                          : grade.status === 'em_producao'
                          ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                          : 'bg-green-500/20 text-green-200 border border-green-500/30'
                        }
                      `}>
                        {grade.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}