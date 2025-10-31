import FingerprintJS from '@fingerprintjs/fingerprintjs';
// ✅ REMOVIDO: import { supabase } from './supabase'; - não mais necessário

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
    // ✅ NOVO: Gera UUID simples sem verificar Supabase
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
    console.log('📱 Novo Device ID gerado:', id.substring(0, 8) + '...');
  }
  return id;
}