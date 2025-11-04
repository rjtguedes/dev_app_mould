import FingerprintJS from '@fingerprintjs/fingerprintjs';
// ✅ REMOVIDO: import { supabase } from './supabase'; - não mais necessário

// 🔧 Polyfill para crypto.randomUUID() - compatível com navegadores antigos
function generateUUID(): string {
  // Tenta usar a API nativa primeiro
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: gera UUID v4 manualmente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

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
    id = generateUUID();
    localStorage.setItem(key, id);
    console.log('📱 Novo Device ID gerado:', id.substring(0, 8) + '...');
  }
  return id;
}