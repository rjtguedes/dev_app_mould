# Correção do Erro MQTT - process is not defined

## Problema
O erro `Uncaught ReferenceError: process is not defined` ocorre porque a biblioteca `mqtt.js` tenta acessar o objeto `process` que é específico do Node.js e não está disponível no navegador.

## Soluções Implementadas

### 1. Configuração do Vite
Atualizado o `vite.config.ts` com:
```typescript
define: {
  global: 'globalThis',
  'process.env': 'import.meta.env',
},
optimizeDeps: {
  include: ['mqtt'],
}
```

### 2. Polyfill para process
Criado `src/lib/mqtt-polyfill.ts` que define o objeto `process` no navegador.

### 3. Versão Simplificada
Criado `src/lib/mqtt-simple.ts` que usa WebSocket diretamente, evitando dependências problemáticas.

### 4. Tipos Globais
Criado `src/types/global.d.ts` com declarações de tipos para `process` e `Buffer`.

## Como Usar

### Opção 1: Usar a versão original (com polyfill)
```typescript
import { useMQTT, MQTTCommands } from '../lib/mqtt';
```

### Opção 2: Usar a versão simplificada (recomendada)
```typescript
import { useMQTT, MQTTCommands } from '../lib/mqtt-simple';
```

## Configuração de Ambiente

Crie um arquivo `.env` na raiz do projeto com:
```
VITE_MQTT_HOST=localhost
VITE_MQTT_PORT=9001
VITE_MQTT_USERNAME=
VITE_MQTT_PASSWORD=
```

## Teste

Para testar se a correção funcionou:
1. Execute `npm run dev`
2. Abra o console do navegador
3. Verifique se não há erros relacionados ao `process`

## Notas

- A versão simplificada (`mqtt-simple.ts`) é mais compatível com navegadores
- O polyfill garante compatibilidade com a biblioteca original
- As configurações do Vite resolvem problemas de build
