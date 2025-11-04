import React, { useState } from 'react';
import { SingleMachineViewNew } from './SingleMachineView-new';
import { SingleMachineCardNew } from './SingleMachineCard-new';
import { 
  exampleMachineData, 
  exampleMachineDataNoSession, 
  exampleMachineDataNoProduction,
  exampleMachineDataEmpty 
} from '../examples/websocket-data-example';

export function NewInterfacePreview() {
  const [selectedExample, setSelectedExample] = useState<keyof typeof examples>('fullData');
  const [viewMode, setViewMode] = useState<'view' | 'card'>('view');

  const examples = {
    fullData: { data: exampleMachineData, label: 'Dados Completos' },
    noSession: { data: exampleMachineDataNoSession, label: 'Sem Sessão' },
    noProduction: { data: exampleMachineDataNoProduction, label: 'Sem Ordem' },
    empty: { data: exampleMachineDataEmpty, label: 'Vazio' }
  };

  const handleAddReject = async (gradeId: number) => {
    console.log('Adicionar rejeito para grade:', gradeId);
  };

  const handleAddRejeito = async () => {
    console.log('Adicionar rejeito via WebSocket');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">
            Preview da Nova Interface - Máquinas Simples
          </h1>
          
          {/* Controles */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <label className="text-white/70">Exemplo:</label>
              <select 
                value={selectedExample}
                onChange={(e) => setSelectedExample(e.target.value as keyof typeof examples)}
                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white"
              >
                {Object.entries(examples).map(([key, example]) => (
                  <option key={key} value={key} className="bg-gray-800">
                    {example.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-white/70">Modo:</label>
              <select 
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'view' | 'card')}
                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-white"
              >
                <option value="view" className="bg-gray-800">View Completa</option>
                <option value="card" className="bg-gray-800">Card Compacto</option>
              </select>
            </div>
          </div>

          {/* Informações do exemplo selecionado */}
          <div className="bg-white/5 rounded-lg border border-white/10 p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">
              {examples[selectedExample].label}
            </h3>
            <div className="text-sm text-white/70 space-y-1">
              <p>Sessão Operador: {examples[selectedExample].data.sessao_operador ? 'Ativa' : 'Inativa'}</p>
              <p>Ordem Produção: {examples[selectedExample].data.producao_mapa ? 'Ativa' : 'Inativa'}</p>
              <p>Status: {examples[selectedExample].data.status ? 'EM PRODUÇÃO' : 'PARADA'}</p>
              <p>Velocidade: {examples[selectedExample].data.velocidade}%</p>
            </div>
          </div>
        </div>

        {/* Preview do componente */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">
            Preview: {viewMode === 'view' ? 'SingleMachineViewNew' : 'SingleMachineCardNew'}
          </h2>
          
          {viewMode === 'view' ? (
            <SingleMachineViewNew 
              machineData={examples[selectedExample].data}
              onAddReject={handleAddReject}
              onAddRejeito={handleAddRejeito}
              statusParada={!examples[selectedExample].data.status}
            />
          ) : (
            <SingleMachineCardNew 
              machineData={examples[selectedExample].data}
              onAddReject={handleAddReject}
              onAddRejeito={handleAddRejeito}
              statusParada={!examples[selectedExample].data.status}
            />
          )}
        </div>

        {/* Informações sobre a nova interface */}
        <div className="mt-8 bg-white/5 rounded-lg border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Sobre a Nova Interface
          </h3>
          <div className="text-white/70 space-y-2">
            <p>✅ <strong>Produção Mapa:</strong> Exibe sinais válidos, rejeitos e saldo a produzir da ordem atual</p>
            <p>✅ <strong>Sessão Operador:</strong> Exibe sinais válidos e rejeitos da sessão do operador</p>
            <p>✅ <strong>Progresso Visual:</strong> Barra de progresso para ordens de produção</p>
            <p>✅ <strong>Tempo Decorrido:</strong> Tempo formatado para cada contexto</p>
            <p>✅ <strong>Status da Máquina:</strong> Indicador visual de produção/parada</p>
            <p>✅ <strong>Velocidade:</strong> Barra de progresso da velocidade atual</p>
          </div>
        </div>
      </div>
    </div>
  );
}









