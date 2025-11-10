import React from 'react';
import { 
  X, Info, AlertCircle, Clock, Wrench, Settings, Zap, Droplets, Package, Truck, Users, Coffee, Utensils,
  WifiOff, Cpu, Thermometer, Battery, Hammer, Wifi, HardDrive, Activity, TrendingDown, Bolt, Cog,
  PowerOff, Power, AlertTriangle
} from 'lucide-react';
import type { StopReason } from '../types/stops';
import type { MachineGroup } from '../types/machine';

interface JustifyStopModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJustify: (reasonId: number) => Promise<void>;
  stopReasons: StopReason[];
  machineGroup?: MachineGroup | null;
  isPreJustificationMode?: boolean;
  isManualStop?: boolean; // Novo: indica se é uma parada manual
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

// ✅ Memoizar modal para evitar re-renders desnecessários
export const JustifyStopModal = React.memo(function JustifyStopModal({
  isOpen,
  onClose,
  onJustify,
  stopReasons,
  machineGroup,
  isPreJustificationMode = false,
  isManualStop = false
}: JustifyStopModalProps) {

// Mapeamento de ícones por descrição (fallback)
const getIconByDescription = (descricao: string) => {
  const lowerDesc = descricao.toLowerCase();
  
  if (lowerDesc.includes('troca')) return <Wrench className="w-5 h-5" />;
  if (lowerDesc.includes('ajuste')) return <Settings className="w-5 h-5" />;
  if (lowerDesc.includes('limpeza')) return <Droplets className="w-5 h-5" />;
  if (lowerDesc.includes('manutenção')) return <Wrench className="w-5 h-5" />;
  if (lowerDesc.includes('energia') || lowerDesc.includes('elétrico')) return <Zap className="w-5 h-5" />;
  if (lowerDesc.includes('material') || lowerDesc.includes('bobina') || lowerDesc.includes('etiqueta')) return <Package className="w-5 h-5" />;
  if (lowerDesc.includes('transporte')) return <Truck className="w-5 h-5" />;
  if (lowerDesc.includes('operador') || lowerDesc.includes('reunião')) return <Users className="w-5 h-5" />;
  if (lowerDesc.includes('café')) return <Coffee className="w-5 h-5" />;
  if (lowerDesc.includes('almoço')) return <Utensils className="w-5 h-5" />;
  if (lowerDesc.includes('qualidade')) return <AlertCircle className="w-5 h-5" />;
  
  return <Clock className="w-5 h-5" />;
};

// Função para renderizar ícone
const renderIcon = (reason: StopReason) => {
  if (reason.icone && iconMap[reason.icone]) {
    return iconMap[reason.icone];
  }
  return getIconByDescription(reason.descricao);
};

// Função para calcular a cor de contraste (para texto branco ou preto)
const getContrastColor = (hexColor: string) => {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

// ✅ Função já declarada acima com React.memo (linha 50)
// Removida declaração duplicada

if (!isOpen) return null;

  // ✅ CORRIGIDO: Separar motivos por grupo da máquina atual
  // Se machineGroup é null, mostrar TODOS os motivos
  const groupedReasons = stopReasons.reduce((acc, reason) => {
    // Se a máquina tem um grupo específico, filtrar apenas motivos desse grupo
    if (machineGroup) {
      // Apenas motivos específicos do grupo da máquina atual
      if (reason.grupo_maquina === machineGroup.id) {
        if (!acc.specific) acc.specific = [];
        acc.specific.push(reason);
      }
      // Ignorar motivos de outros grupos
    } else {
      // ✅ CORRIGIDO: Se a máquina não tem grupo, mostrar TODOS os motivos
      if (!acc.specific) acc.specific = [];
      acc.specific.push(reason);
    }
    return acc;
  }, {} as Record<string, StopReason[]>);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-none max-h-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isManualStop 
                ? 'Parada Manual' 
                : isPreJustificationMode 
                  ? 'Sucesso - Motivo Pré-selecionado' 
                  : 'Justificar Parada'
              }
            </h2>
            {machineGroup && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <Info className="w-4 h-4" />
                <span>Máquina do grupo: <strong>{machineGroup.descriçao || 'Sem descrição'}</strong></span>
              </div>
            )}
            {isManualStop && (
              <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span>Selecione o motivo da parada forçada</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-200 rounded-full transition-all duration-200 hover:rotate-90"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-8">
            {/* Motivos específicos do grupo */}
            {groupedReasons.specific && groupedReasons.specific.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-6 flex items-center gap-3">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  Motivos de Parada
                  {machineGroup && (
                    <span className="text-sm font-normal text-gray-500 bg-blue-100 px-3 py-1 rounded-full">
                      {machineGroup.descriçao || 'Sem descrição'}
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {groupedReasons.specific.map((reason) => (
                    <button
                      key={reason.id}
                      onClick={() => onJustify(reason.id)}
                      className={`
                        p-6 rounded-xl text-left transition-all duration-200 group hover:scale-[1.02] 
                        shadow-lg hover:shadow-xl min-h-[140px] flex flex-col justify-between
                        border-2 hover:border-opacity-80
                      `}
                      style={reason.cor ? { 
                        background: reason.cor,
                        borderColor: reason.cor,
                        color: getContrastColor(reason.cor)
                      } : {
                        background: '#3B82F6',
                        borderColor: '#3B82F6',
                        color: 'white'
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div 
                            style={reason.cor ? { color: getContrastColor(reason.cor) } : { color: 'white' }} 
                            className="text-2xl"
                          >
                            {renderIcon(reason)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-bold group-hover:translate-x-0.5 transition-transform leading-tight">
                            {reason.descricao}
                          </h4>
                        </div>
                      </div>
                      <div className="mt-4">
                        <span 
                          className="px-3 py-2 rounded-full text-sm font-semibold"
                          style={{
                            background: reason.cor ? `${getContrastColor(reason.cor)}20` : 'rgba(255,255,255,0.2)',
                            color: reason.cor ? getContrastColor(reason.cor) : 'white'
                          }}
                        >
                          {reason.contabiliza_oee ? 'Afeta OEE' : 'Não afeta OEE'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Estado vazio */}
            {(!groupedReasons.specific || groupedReasons.specific.length === 0) && (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhum motivo configurado</h3>
                <p className="text-gray-500">
                  Não há motivos de parada configurados para esta máquina.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Afeta OEE</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Não afeta OEE</span>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Total: {groupedReasons.specific?.length || 0} motivos
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}); // ✅ Fechar React.memo