# 📡 Configuração MQTT - IHM Mould

Este documento descreve como configurar e usar o sistema MQTT no aplicativo IHM Mould.

## 🚀 Instalação

A biblioteca MQTT.js já foi instalada automaticamente:

```bash
npm install mqtt
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Configurações do MQTT
VITE_MQTT_HOST=localhost
VITE_MQTT_PORT=9001
VITE_MQTT_USERNAME=
VITE_MQTT_PASSWORD=
```

### 2. Configuração do Broker Mosquitto

O broker Mosquitto deve estar configurado para aceitar conexões WebSocket na porta 9001.

**Exemplo de configuração do Mosquitto (`mosquitto.conf`):**

```conf
# Porta WebSocket
listener 9001
protocol websockets

# Porta MQTT padrão
port 1883

# Configurações de segurança (opcional)
allow_anonymous true
```

## 🔧 Uso no Código

### 1. Cliente MQTT Básico

```typescript
import { mqttClient, MQTTCommands } from './lib/mqtt';

// Conectar
await mqttClient.connect();

// Enviar comando
const response = await mqttClient.sendCommand(
  MQTTCommands.startProduction(123, { operator: 'João' })
);
```

### 2. Hook React

```typescript
import { useMQTT } from './lib/mqtt';

function MyComponent({ machineId }) {
  const { isConnected, lastResponse, sendCommand } = useMQTT(machineId);
  
  const handleStart = () => {
    sendCommand(MQTTCommands.startProduction(machineId, {}));
  };
  
  return (
    <div>
      <p>Status: {isConnected ? 'Conectado' : 'Desconectado'}</p>
      <button onClick={handleStart}>Iniciar Produção</button>
    </div>
  );
}
```

## 📋 Comandos Disponíveis

### Controle de Produção
- `start_production` - Iniciar produção
- `stop_production` - Parar produção
- `pause_production` - Pausar produção
- `resume_production` - Retomar produção

### Controle de Máquina
- `start_machine` - Ligar máquina
- `stop_machine` - Desligar máquina
- `pause_machine` - Pausar máquina
- `resume_machine` - Retomar máquina

### Configurações
- `set_speed` - Ajustar velocidade
- `set_parameters` - Configurar parâmetros
- `reset_counters` - Resetar contadores

### Monitoramento
- `get_status` - Obter status da máquina
- `get_telemetry` - Obter dados de telemetria
- `ping` - Teste de conectividade

## 🌐 Tópicos MQTT

### Estrutura de Tópicos

```
ihm/
├── commands/{machineId}     # Comandos enviados para o backend
├── responses/{machineId}    # Respostas recebidas do backend
├── status/{machineId}       # Status geral das máquinas
├── telemetry/{machineId}    # Dados de telemetria
└── alerts/{machineId}       # Alertas e notificações
```

### Exemplo de Comando

```json
{
  "command": "start_production",
  "machineId": 123,
  "data": {
    "operator": "João Silva",
    "product": "Produto A",
    "quantity": 1000
  },
  "timestamp": 1640995200000
}
```

### Exemplo de Resposta

```json
{
  "success": true,
  "message": "Produção iniciada com sucesso",
  "data": {
    "productionId": 456,
    "startTime": "2023-12-31T10:00:00Z"
  },
  "timestamp": 1640995201000
}
```

## 🔒 Segurança

### Autenticação
- Configure `VITE_MQTT_USERNAME` e `VITE_MQTT_PASSWORD` se necessário
- O broker Mosquitto deve estar configurado com autenticação adequada

### Validação
- Todos os comandos são validados antes do envio
- Apenas comandos válidos são aceitos
- Timestamps são verificados para evitar comandos duplicados

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de Conexão**
   - Verifique se o broker Mosquitto está rodando
   - Confirme a porta WebSocket (9001)
   - Verifique as configurações de firewall

2. **Comandos Não Enviados**
   - Verifique se o cliente está conectado
   - Confirme se o comando é válido
   - Verifique os logs do console

3. **Respostas Não Recebidas**
   - Verifique se o backend está escutando os tópicos
   - Confirme se o backend está publicando respostas
   - Verifique a configuração de QoS

### Logs

O sistema gera logs detalhados no console do navegador:

```
🔌 Conectando ao broker MQTT...
✅ Conectado ao broker MQTT
📤 Comando MQTT enviado: {command: "start_production", ...}
📥 Resposta MQTT recebida: {success: true, ...}
```

## 📚 Recursos Adicionais

- [Documentação MQTT.js](https://github.com/mqttjs/MQTT.js)
- [Documentação Mosquitto](https://mosquitto.org/documentation/)
- [Especificação MQTT](https://mqtt.org/mqtt-specification/)

