import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { supabase } from './supabase';

export async function getMacAddress(): Promise<string> {
  try {
    // Usa FingerprintJS para obter um identificador único do dispositivo
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error('Error getting device identifier:', error);
    throw new Error('Failed to get device identifier');
  }
}

export async function getDeviceId(): Promise<string> {
  const key = 'industrack_device_id';
  let id = localStorage.getItem(key);
  if (!id) {
    // Gera UUID
    id = crypto.randomUUID();
    // Verifica unicidade no Supabase
    const { data, error } = await supabase
      .from('device_machine')
      .select('device_id')
      .eq('device_id', id)
      .single();
    if (data) {
      // Se já existe, gera outro até ser único
      let tentativas = 0;
      while (data && tentativas < 5) {
        id = crypto.randomUUID();
        const { data: exists } = await supabase
          .from('device_machine')
          .select('device_id')
          .eq('device_id', id)
          .single();
        if (!exists) break;
        tentativas++;
      }
    }
    localStorage.setItem(key, id);
  }
  return id;
}