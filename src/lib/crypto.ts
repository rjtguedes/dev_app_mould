import CryptoJS from 'crypto-js';
import { supabase } from './supabase';

interface EncryptedData {
  iv: string;
  content: string;
}

interface FastAccessCredentials {
  email: string;
  password: string;
}

export async function decryptCredentials(pin: string): Promise<FastAccessCredentials> {
  try {
    const { data: operatorAccess, error } = await supabase
      .from('operator_fast_acess')
      .select('encrypted_acess, PIN, operador')
      .eq('PIN', parseInt(pin))
      .single();

    if (error) {
      console.error('Erro ao buscar PIN:', error);
      throw new Error('PIN inválido');
    }

    if (!operatorAccess?.encrypted_acess) {
      throw new Error('PIN inválido');
    }

    const encrypted: EncryptedData = JSON.parse(operatorAccess.encrypted_acess);
    const key = CryptoJS.SHA256(pin).toString();
    const keyBytes = CryptoJS.enc.Hex.parse(key);

    const decrypted = CryptoJS.AES.decrypt(
      encrypted.content,
      keyBytes,
      {
        iv: CryptoJS.enc.Base64.parse(encrypted.iv),
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedStr) {
      throw new Error('Falha na descriptografia');
    }

    const credentials: FastAccessCredentials = JSON.parse(decryptedStr);

    if (!credentials.email || !credentials.password) {
      throw new Error('Formato inválido das credenciais');
    }

    return credentials;
  } catch (error) {
    console.error('Erro na descriptografia:', error);
    throw new Error('PIN inválido');
  }
}