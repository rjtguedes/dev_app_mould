// Polyfill para resolver problemas de compatibilidade do MQTT no navegador
// Este arquivo deve ser importado antes de qualquer uso do MQTT

// Polyfill para process.env no navegador
if (typeof window !== 'undefined') {
  // Garantir que process existe
  if (typeof (window as any).process === 'undefined') {
    (window as any).process = {
      env: {
        NODE_ENV: import.meta.env.MODE || 'development',
        VITE_MQTT_HOST: import.meta.env.VITE_MQTT_HOST || 'localhost',
        VITE_MQTT_PORT: import.meta.env.VITE_MQTT_PORT || '9001',
        VITE_MQTT_USERNAME: import.meta.env.VITE_MQTT_USERNAME || '',
        VITE_MQTT_PASSWORD: import.meta.env.VITE_MQTT_PASSWORD || '',
      }
    };
  }
  
  // Garantir que process existe globalmente também
  if (typeof globalThis.process === 'undefined') {
    (globalThis as any).process = (window as any).process;
  }
}

// Polyfill para Buffer se necessário
if (typeof window !== 'undefined' && typeof Buffer === 'undefined') {
  // Usar TextEncoder/TextDecoder como fallback para Buffer
  (window as any).Buffer = {
    from: (data: string | ArrayBuffer) => {
      if (typeof data === 'string') {
        return new TextEncoder().encode(data);
      }
      return new Uint8Array(data);
    },
    isBuffer: (obj: any) => obj instanceof Uint8Array,
    concat: (arrays: Uint8Array[]) => {
      const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
      }
      return result;
    }
  };
}

// Polyfill para global se necessário
if (typeof window !== 'undefined' && typeof global === 'undefined') {
  (window as any).global = globalThis;
}

export {};
