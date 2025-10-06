import React from 'react';
import { X, Clock, AlertCircle, Calendar, Timer } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { JustifyStopModal } from './JustifyStopModal';
import { MachineStop, StopReason } from '../types/stops';

interface StopsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onJustify: (stopId: number) => void;
  machineId: number;
}

export function StopsSidebar({ isOpen, onClose, onJustify, machineId }: StopsSidebarProps) {
  const [stops, setStops] = React.useState<MachineStop[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const formatDateTime = (unix: number) => {
    const date = new Date(unix * 1000);
    return {
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  React.useEffect(() => {
    async function loadStops() {
      try {
        const { data, error } = await supabase
          .from('paradas')
          .select(`
            id,
            data_inicio_unix,
            data_fim_unix,
            tempo_parada_minutos,
            motivo_parada
          `)
          .is('motivo_parada', null)
          .gt('tempo_parada_minutos', 0)
          .eq('id_maquina', machineId)
          .order('data_inicio_unix', { ascending: false })
          .limit(50);

        if (error) throw error;
        setStops(data || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar paradas');
        setLoading(false);
      }
    }

    if (isOpen) {
      loadStops();
    }
  }, [isOpen, machineId]);

  React.useEffect(() => {
    const subscription = supabase
      .channel('paradas_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'paradas',
          filter: `id_maquina=eq.${machineId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && !payload.new.motivo_parada) {
            setStops(prev => [payload.new as MachineStop, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setStops(prev => prev.filter(stop => stop.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [machineId]);

  return (
    <div className={`
      fixed right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50
      ${isOpen ? 'translate-x-0' : 'translate-x-full'} overflow-hidden
    `}>
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-800">Paradas da Máquina</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto h-[calc(100vh-64px)] bg-gray-100">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            {error}
          </div>
        ) : stops.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma parada registrada
          </div>
        ) : (
          stops.map((stop) => (
            <div
              key={stop.id}
              className="bg-white rounded-lg p-4 space-y-3 shadow-sm border border-gray-200"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDateTime(stop.data_inicio_unix).date}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <span className="font-medium">
                      {formatDateTime(stop.data_inicio_unix).time}
                      {stop.data_fim_unix ? (
                        <> - {formatDateTime(stop.data_fim_unix).time}</>
                      ) : (
                        <span className="text-orange-500 ml-2">(Em andamento)</span>
                      )}
                    </span>
                  </div>
                </div>
                
                {stop.tempo_parada_minutos !== null && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <Timer className="w-4 h-4" />
                    {formatDuration(stop.tempo_parada_minutos)}
                  </div>
                )}
              </div>

              {!stop.motivo_parada && (
                <button
                  onClick={() => onJustify(stop.id)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-50 text-blue-700 
                           rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <AlertCircle className="w-4 h-4" />
                  Justificar Parada
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}