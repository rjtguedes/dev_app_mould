import React from 'react';
import { 
  X, Info, AlertCircle, Clock, Wrench, Settings, Zap, Droplets, Package, Truck, Users, Coffee, Utensils,
  WifiOff, Cpu, Thermometer, Battery, Hammer, Wifi, HardDrive, Activity, TrendingDown, Bolt, Cog,
  PowerOff, Power, AlertTriangle
} from 'lucide-react';
import type { StopReason } from '../types/stops';

interface StopReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectReason: (reasonId: number, description: string) => void;
  stopReasons: StopReason[];
}

// Mapeamento dinâmico de ícones do Lucide
const iconMap: Record<string, React.ReactElement> = {
  'WifiOff': <WifiOff className="w-5 h-5" />,
  'Cpu': <Cpu className="w-5 h-5" />,
  'Clock': <Clock className="w-5 h-5" />,
  'Thermometer': <Thermometer className="w-5 h-5" />,
  'Battery': <Battery className="w-5 h-5" />,
  'Hammer': <Hammer className="w-5 h-5" />,
  'Wifi': <Wifi className="w-5 h-5" />,
  'HardDrive': <HardDrive className="w-5 h-5" />,
  'Activity': <Activity className="w-5 h-5" />,
  'TrendingDown': <TrendingDown className="w-5 h-5" />,
  'Bolt': <Bolt className="w-5 h-5" />,
  'Cog': <Cog className="w-5 h-5" />,
  'PowerOff': <PowerOff className="w-5 h-5" />,
  'Power': <Power className="w-5 h-5" />,
  'AlertTriangle': <AlertTriangle className="w-5 h-5" />,
  'Zap': <Zap className="w-5 h-5" />,
  'Wrench': <Wrench className="w-5 h-5" />,
  'Settings': <Settings className="w-5 h-5" />,
  'Droplets': <Droplets className="w-5 h-5" />,
  'Package': <Package className="w-5 h-5" />,
  'Truck': <Truck className="w-5 h-5" />,
  'Users': <Users className="w-5 h-5" />,
  'Coffee': <Coffee className="w-5 h-5" />,
  'Utensils': <Utensils className="w-5 h-5" />,
  'AlertCircle': <AlertCircle className="w-5 h-5" />
};

// Mapeamento de ícones por descrição (fallback)
const getIconByDescription = (descricao: string) => {
  const lowerDesc = descricao.toLowerCase();
  
  if (lowerDesc.includes('manutenção') || lowerDesc.includes('manutencao')) return iconMap['Wrench'];
  if (lowerDesc.includes('tempo') || lowerDesc.includes('pausa')) return iconMap['Clock'];
  if (lowerDesc.includes('energia') || lowerDesc.includes('elétrica')) return iconMap['Zap'];
  if (lowerDesc.includes('temperatura') || lowerDesc.includes('aquecimento')) return iconMap['Thermometer'];
  if (lowerDesc.includes('bateria') || lowerDesc.includes('energia')) return iconMap['Battery'];
  if (lowerDesc.includes('rede') || lowerDesc.includes('conexão')) return iconMap['Wifi'];
  if (lowerDesc.includes('disco') || lowerDesc.includes('armazenamento')) return iconMap['HardDrive'];
  if (lowerDesc.includes('atividade') || lowerDesc.includes('processo')) return iconMap['Activity'];
  if (lowerDesc.includes('tendência') || lowerDesc.includes('declínio')) return iconMap['TrendingDown'];
  if (lowerDesc.includes('parafuso') || lowerDesc.includes('fixação')) return iconMap['Bolt'];
  if (lowerDesc.includes('configuração') || lowerDesc.includes('ajuste')) return iconMap['Cog'];
  if (lowerDesc.includes('desligar') || lowerDesc.includes('desligamento')) return iconMap['PowerOff'];
  if (lowerDesc.includes('ligar') || lowerDesc.includes('ligamento')) return iconMap['Power'];
  if (lowerDesc.includes('alerta') || lowerDesc.includes('aviso')) return iconMap['AlertTriangle'];
  if (lowerDesc.includes('configuração') || lowerDesc.includes('config')) return iconMap['Settings'];
  if (lowerDesc.includes('água') || lowerDesc.includes('líquido')) return iconMap['Droplets'];
  if (lowerDesc.includes('pacote') || lowerDesc.includes('embalagem')) return iconMap['Package'];
  if (lowerDesc.includes('caminhão') || lowerDesc.includes('transporte')) return iconMap['Truck'];
  if (lowerDesc.includes('usuário') || lowerDesc.includes('pessoa')) return iconMap['Users'];
  if (lowerDesc.includes('café') || lowerDesc.includes('pausa')) return iconMap['Coffee'];
  if (lowerDesc.includes('utensílio') || lowerDesc.includes('ferramenta')) return iconMap['Utensils'];
  
  return iconMap['AlertCircle']; // Ícone padrão
};

export function StopReasonModal({ 
  isOpen, 
  onClose, 
  onSelectReason, 
  stopReasons 
}: StopReasonModalProps) {
  if (!isOpen) return null;

  const handleReasonSelect = (reason: StopReason) => {
    onSelectReason(reason.id, reason.descricao);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Parada Manual
              </h2>
              <p className="text-sm text-gray-600">
                Selecione o motivo da parada forçada
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {stopReasons.map((reason) => (
              <button
                key={reason.id}
                onClick={() => handleReasonSelect(reason)}
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all duration-200 text-left group"
              >
                <div className="flex-shrink-0 p-2 bg-gray-100 group-hover:bg-red-100 rounded-lg transition-colors">
                  {iconMap[reason.icone] || getIconByDescription(reason.descricao)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 group-hover:text-red-900">
                    {reason.descricao}
                  </p>
                  {reason.detalhes && (
                    <p className="text-sm text-gray-500 group-hover:text-red-700 mt-1">
                      {reason.detalhes}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
