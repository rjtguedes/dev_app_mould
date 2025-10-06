import React, { useState, useEffect } from 'react';
import { Clock, ArrowLeft, Box, AlertCircle, Play, X, Plus, Trash2, Check, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MatrixMap } from './MatrixMap';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import type { Machine } from '../types/machine';
import type { WeekMachine, WeekMachineGrade } from '../types/production';
import { addReject, startProduction, setupProduction } from '../lib/production';

interface MachineSetupProps {
  machine: Machine;
  onBack: () => void;
  operadorId: number;
  sessionId: number;
}

export function MachineSetup({ machine, onBack, operadorId, sessionId }: MachineSetupProps) {
  const [productions, setProductions] = useState<WeekMachine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduction, setSelectedProduction] = useState<WeekMachine | null>(null);
  const [grades, setGrades] = useState<WeekMachineGrade[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [showMatrixMap, setShowMatrixMap] = useState(false);
  const [setupConfirmed, setSetupConfirmed] = useState(false);
  const [selectedMatrices, setSelectedMatrices] = useState<Record<number, number>>({});
  const [startingProduction, setStartingProduction] = useState(false);
  const [selectedGradeIds, setSelectedGradeIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchProductions = async () => {
      try {
        const { data, error } = await supabase
          .from('semana_maquina')
          .select(`
            *,
            produto(*),
            cor(*),
            grades:grade_semana_maquina(status)
          `)
          .eq('id_maquina', machine.id_maquina)
          .order('semana', { ascending: true });

        if (error) throw error;

        const filteredProductions = (data || []).filter(prod => 
          prod.grades.some((g: any) => g.status === 'pendente')
        );

        setProductions(filteredProductions);
      } catch (err) {
        console.error('Erro ao buscar produções:', err);
        setError('Falha ao carregar produções planejadas.');
      } finally {
        setLoading(false);
      }
    };

    fetchProductions();
  }, [machine.id_maquina]);

  const handleProductionSelect = async (production: WeekMachine) => {
    setSelectedProduction(production);
    setLoadingGrades(true);
    
    try {
      const { data, error } = await supabase
        .from('grade_semana_maquina')
        .select(`
          *,
          matriz:matrizes(*)
        `)
        .eq('id_semana_maquina', production.id)
        .order('numero_estacao', { ascending: true });

      if (error) throw error;
      setGrades(data || []);
    } catch (err) {
      console.error('Erro ao buscar grades:', err);
    } finally {
      setLoadingGrades(false);
    }
  };

  const handleStartProduction = () => {
    if (!selectedProduction) return;
    console.log("Iniciando produção, abrindo mapa de matrizes");
    setShowMatrixMap(true);
  };

  const handleMatrixConfirm = (stationNumber: number, matrixId: number) => {
    setSelectedMatrices(prev => ({
      ...prev,
      [stationNumber]: matrixId
    }));
  };

  const handleSetupComplete = (selectedIds: number[]) => {
    setSelectedGradeIds(selectedIds);
  };

  const handleStartSetup = async () => {
    if (!selectedProduction) return;
    
    try {
      setStartingProduction(true);
      
      const selectedGrades = grades.filter(grade => selectedGradeIds.includes(grade.id));
      
      if (selectedGrades.length === 0) {
        throw new Error("Selecione pelo menos uma estação para iniciar a produção");
      }
      
      const stationSetups = selectedGrades.map(grade => ({
        stationNumber: grade.numero_estacao,
        gradeId: grade.id,
        matrixId: selectedMatrices[grade.numero_estacao] || grade.id_matriz,
        machineId: grade.id_maquina
      }));
      
      await setupProduction({
        semanaId: selectedProduction.id,
        machineId: machine.id_maquina,
        operadorId: parseInt(operadorId),
        sessionId,
        stationSetups
      });
      
      setSetupConfirmed(true);
    } catch (err) {
      console.error('Erro ao iniciar setup:', err);
      setError(err instanceof Error ? err.message : 'Erro ao iniciar setup');
    } finally {
      setStartingProduction(false);
    }
  };

  const handleAddProduction = (stationNumber: number) => {
    console.log(`Adicionar produção para estação ${stationNumber}`);
    // Implementar lógica para adicionar produção
  };

  const handleAddReject = async (gradeId: number) => {
    try {
      const grade = grades.find(g => g.id === gradeId);
      if (!grade) return;

      await addReject({
        quantidade_rejeitada: 1,
        id_grade_semana_maquina: gradeId,
        id_semana_maquina: grade.id_semana_maquina,
        id_maquina: machine.id_maquina
      });
    } catch (err) {
      console.error('Erro ao adicionar rejeito:', err);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  if (showMatrixMap && selectedProduction) {
    return (
      <MatrixMap
        weekMachine={selectedProduction}
        machine={machine}
        onBack={() => setShowMatrixMap(false)}
        grades={grades}
        onMatrixConfirm={handleMatrixConfirm}
        selectedMatrices={selectedMatrices}
        onStartSetup={handleStartSetup}
        isStarting={startingProduction}
        setupConfirmed={setupConfirmed}
        onSetupComplete={handleSetupComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Header fixo */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-xl font-bold text-white ml-4">Setup de Produção</h1>
        </div>
      </div>

      {/* Container principal - agora ocupando toda a largura */}
      <div className="h-[calc(100vh-4rem)]">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-medium text-white">Produções Planejadas</h2>
        </div>
        <div className="h-[calc(100%-4rem)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : error ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-white m-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5" />
                <h2 className="font-semibold">Erro</h2>
              </div>
              <p>{error}</p>
            </div>
          ) : productions.length === 0 ? (
            <div className="p-4 text-white/60 text-center">
              Nenhuma produção planejada
            </div>
          ) : (
            <div className="p-4">
              <div className="overflow-hidden bg-white/5 rounded-xl border border-white/10">
                <table className="w-full divide-y divide-white/10">
                  <thead>
                    <tr className="bg-white/5">
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider w-12">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Referência</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Cor</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Quantidade</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Tempo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Semana</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {productions.map((production, index) => (
                      <tr 
                        key={production.id}
                        onClick={() => handleProductionSelect(production)}
                        className={`cursor-pointer transition-colors
                          ${selectedProduction?.id === production.id 
                            ? 'bg-white/15' 
                            : 'hover:bg-white/10'}`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-white/80">{index + 1}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-white">
                              {production.produto?.referencia}
                            </div>
                            <div className="text-sm text-white/60">
                              {production.produto?.descricao || 'Não especificada'}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                          {production.cor?.descricao || 'Não especificada'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <span className="text-white font-medium">{production.quantidade_produzida || 0}</span>
                          <span className="text-white/40 mx-1">/</span>
                          <span className="text-white/80">{production.quantidade}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-white/40" />
                            {formatDuration(production.minutos_estimado)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-white">
                          {production.semana}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <span className={`
                            px-3 py-1 rounded-full text-xs
                            ${production.status === 'pendente' 
                              ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30'
                              : production.status === 'em_producao'
                              ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                              : 'bg-green-500/20 text-green-200 border border-green-500/30'
                            }
                          `}>
                            {production.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProductionSelect(production);
                            }}
                            className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 
                                      text-white rounded-lg transition-all duration-200 text-sm font-medium
                                      flex items-center gap-2 ml-auto"
                          >
                            <Info className="w-4 h-4" />
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drawer para Grade de Produção */}
      <div className={`fixed inset-y-0 right-0 w-[900px] bg-gradient-to-l from-blue-900 via-blue-800 to-indigo-900 
                    backdrop-blur-xl transform transition-transform duration-300 ease-in-out 
                    shadow-2xl border-l border-white/10
                    ${selectedProduction ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          {/* Header do Drawer */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
            <div>
              <h2 className="text-xl font-medium text-white mb-2">Grade de Produção</h2>
              <div className="flex items-center gap-6">
                <p className="text-sm text-white/60">
                  Ref: <span className="text-white font-medium">{selectedProduction?.produto?.referencia}</span>
                </p>
                <p className="text-sm text-white/60">
                  Semana: <span className="text-white font-medium">{selectedProduction?.semana}</span>
                </p>
              </div>
            </div>
            
            {/* Adicionar botão de iniciar produção aqui */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleStartProduction}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white 
                          rounded-lg transition-all duration-200 text-sm font-medium
                          flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Iniciar Produção
              </button>
              <button
                onClick={() => setSelectedProduction(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white/60 hover:text-white" />
              </button>
            </div>
          </div>
          
          {/* Conteúdo do Drawer */}
          <div className="flex-1 overflow-y-auto p-6">
            {loadingGrades ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
              </div>
            ) : (
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden backdrop-blur-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/10 border-b border-white/10">
                      <th className="px-4 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider w-20">Estação</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider w-24">Tamanho</th>
                      <th className="px-4 py-4 text-left text-xs font-medium text-white/60 uppercase tracking-wider w-48">Matriz</th>
                      <th className="px-4 py-4 text-right text-xs font-medium text-white/60 uppercase tracking-wider w-24">Qtd</th>
                      <th className="px-4 py-4 text-right text-xs font-medium text-white/60 uppercase tracking-wider w-24">Produzido</th>
                      <th className="px-4 py-4 text-right text-xs font-medium text-white/60 uppercase tracking-wider w-24">Saldo</th>
                      <th className="px-4 py-4 text-center text-xs font-medium text-white/60 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-4 text-center text-xs font-medium text-white/60 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {grades.map((grade) => (
                      <tr key={grade.id} className="hover:bg-white/10 transition-colors">
                        <td className="px-4 py-4 text-white font-medium">
                          {grade.numero_estacao}
                        </td>
                        <td className="px-4 py-4 text-white whitespace-nowrap">
                          {grade.tamanho}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white">{grade.matrizes?.identificador || '-'}</span>
                            {grade.matrizes?.tamanho && (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-200 border border-blue-500/30">
                                {grade.matrizes.tamanho}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right text-white">
                          {grade.quantidade}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-green-300 font-medium">{grade.quantidade_produzida || 0}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-blue-300">{grade.saldo || grade.quantidade}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center">
                            <span className={`
                              px-3 py-1 rounded-full text-xs font-medium min-w-[90px] text-center
                              ${grade.status === 'pendente' 
                                ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/30'
                                : grade.status === 'em_producao'
                                ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                                : 'bg-green-500/20 text-green-200 border border-green-500/30'
                              }
                            `}>
                              {grade.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            {grade.status === 'concluido' ? (
                              <button
                                onClick={() => handleAddProduction(grade.numero_estacao)}
                                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white 
                                          rounded-lg transition-all duration-200 text-sm font-medium
                                          flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Nova Produção
                              </button>
                            ) : (
                              <span className="text-white/40 text-sm">Sem ações disponíveis</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}