import React from 'react';
import { SingleMachineViewNew } from '../components/SingleMachineView-new';
import { exampleMachineData } from '../examples/websocket-data-example';

export function TestNewInterface() {
  const handleAddReject = async (gradeId: number) => {
    console.log('Adicionar rejeito para grade:', gradeId);
  };

  const handleAddRejeito = async () => {
    console.log('Adicionar rejeito via WebSocket');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">
          Teste da Nova Interface
        </h1>
        
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <SingleMachineViewNew 
            machineData={exampleMachineData}
            onAddReject={handleAddReject}
            onAddRejeito={handleAddRejeito}
            statusParada={false}
          />
        </div>
      </div>
    </div>
  );
}
