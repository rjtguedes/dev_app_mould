// Declarações de tipos globais para compatibilidade com bibliotecas Node.js no navegador

declare global {
  interface Window {
    process?: {
      env: {
        NODE_ENV?: string;
        VITE_MQTT_HOST?: string;
        VITE_MQTT_PORT?: string;
        VITE_MQTT_USERNAME?: string;
        VITE_MQTT_PASSWORD?: string;
        [key: string]: string | undefined;
      };
    };
    Buffer?: any;
  }

  var process: {
    env: {
      NODE_ENV?: string;
      VITE_MQTT_HOST?: string;
      VITE_MQTT_PORT?: string;
      VITE_MQTT_USERNAME?: string;
      VITE_MQTT_PASSWORD?: string;
      [key: string]: string | undefined;
    };
  } | undefined;

  var Buffer: any;
}

export {};
