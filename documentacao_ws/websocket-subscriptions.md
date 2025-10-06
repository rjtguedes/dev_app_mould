# 🔔 WebSocket - Sistema de Inscrições e Updates em Tempo Real

## 📋 Visão Geral

O sistema de WebSocket do Industrack possui um poderoso sistema de **subscriptions (inscrições)** que permite que tablets IHM recebam atualizações em tempo real das máquinas.

### Principais Características

✅ **Inscrição por Máquina** - Tablet se inscreve em máquinas específicas  
✅ **Suporte a Multipostos** - Lógica inteligente para máquinas pai/filhas  
✅ **Updates Automáticos** - Receba mudanças em tempo real  
✅ **Alertas de Produção** - Notificações de metas atingidas  
✅ **Broadcast Eficiente** - Apenas subscribers relevantes recebem updates  

---

## 🌐 Endereço do WebSocket

### Configuração do Servidor

O servidor WebSocket está configurado no Docker com:
- **Porta**: `8765`
- **Host**: `0.0.0.0` (escuta em todas as interfaces de rede)

### Endereços de Conexão

**Escolha o endereço apropriado dependendo de onde o tablet está:**

#### 1. 🏠 Desenvolvimento Local (mesma máquina)
```
ws://localhost:8765
```

#### 2. 🏢 Rede Local (LAN)
```
ws://192.168.1.XXX:8765
```
*Substituir `XXX` pelo IP do servidor na rede local*

**Como descobrir o IP:**
```bash
# No servidor Docker
hostname -I
# ou
ip addr show | grep inet
```

#### 3. 🔐 VPN (como MQTT externo)
```
ws://10.200.0.XXX:8765
```
*Substituir `XXX` pelo IP VPN do servidor*

#### 4. 🌍 Produção (Internet)
```
ws://seu-dominio.com:8765
# ou com SSL/TLS (recomendado)
wss://seu-dominio.com:8765
```

### ⚠️ Importante

- **Porta 8765** deve estar aberta no firewall
- Para produção, recomenda-se usar **WSS** (WebSocket Secure) com certificado SSL
- O IP/domínio deve ser acessível pela rede onde o tablet está

### 🧪 Testar Conexão

```bash
# Testar se porta está acessível
telnet <IP_SERVIDOR> 8765

# Ou com nc (netcat)
nc -zv <IP_SERVIDOR> 8765
```

---

## 🔄 Como Funciona

### 1. Máquinas Normais (Não-Multipostos)

```
Tablet → Subscribe(máquina_135) → Recebe updates da máquina_135
```

**Fluxo:**
1. Tablet se inscreve na máquina 135
2. Qualquer mudança na máquina 135 → Tablet recebe update
3. Tipos de update: sinal, parada, retomada, velocidade

### 2. Máquinas Multipostos (Pai/Filhas)

```
Máquina 147 (PAI)
├── Máquina 148 (FILHA - Estação 1)
├── Máquina 149 (FILHA - Estação 2)
└── Máquina 150 (FILHA - Estação 3)

Tablet → Subscribe(máquina_147) → Recebe updates das filhas 148, 149, 150
```

**Fluxo:**
1. Tablet se inscreve na máquina PAI (147)
2. Máquina filha 148 processa sinal → Tablet recebe update identificando que foi a 148
3. Máquina filha 149 para → Tablet recebe update identificando que foi a 149
4. Sistema identifica automaticamente a hierarquia

**Benefício:** Tablet mostra uma única tela para a máquina multipostos, mas recebe informações detalhadas de cada estação.

---

## 📡 Comandos de Subscription

### 1. Subscribe (Inscrever-se)

**Comando:** `subscribe`

**Requisição:**
```json
{
  "type": "subscribe",
  "id_maquina": 147
}
```

**Campos:**
- `id_maquina` (integer, obrigatório): ID da máquina a se inscrever

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Inscrito na máquina 147",
  "data": {
    "id_maquina": 147
  },
  "timestamp": "2025-10-05T14:30:00.000000"
}
```

**Exemplo JavaScript:**
```javascript
ws.send(JSON.stringify({
  type: 'subscribe',
  id_maquina: 147
}));
```

---

### 2. Unsubscribe (Desinscrever-se)

**Comando:** `unsubscribe`

**Requisição:**
```json
{
  "type": "unsubscribe",
  "id_maquina": 147
}
```

**Campos:**
- `id_maquina` (integer, obrigatório): ID da máquina a desinscrever

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Desinscrito da máquina 147",
  "data": {
    "id_maquina": 147
  },
  "timestamp": "2025-10-05T14:30:00.000000"
}
```

**Exemplo JavaScript:**
```javascript
ws.send(JSON.stringify({
  type: 'unsubscribe',
  id_maquina: 147
}));
```

---

## 📨 Tipos de Updates Recebidos

### 1. Machine Update (Atualização de Máquina)

Enviado automaticamente quando há mudanças na máquina.

**Formato Completo:**
```json
{
  "type": "machine_update",
  "update_type": "sinal",
  "target_machine_id": 147,
  "source_machine_id": 148,
  "is_child_update": true,
  "machine_data": {
    "id": 148,
    "nome": "Estação 1",
    "multipostos": false,
    "velocidade": 100,
    "maquina_pai": 147,
    "id_empresa": 1,
    "status": true,
    "last_updated": 1728142200,
    "turnos": {
      "id": 23,
      "nome": "Diurno",
      "hora_inicio": "07:30",
      "hora_fim": "17:18",
      "dias_semana": [1, 2, 3, 4, 5]
    },
    "sessao_operador": {
      "id_sessao": 15,
      "id_maquina": 148,
      "id_operador": 42,
      "inicio": 1728135600,
      "turno": 23,
      "sinais": 1500,
      "rejeitos": 50,
      "sinais_validos": 1450,
      "tempo_decorrido_segundos": 5000,
      "tempo_paradas_segundos": 500,
      "tempo_paradas_nao_conta_oee": 120,
      "tempo_paradas_validas": 380,
      "tempo_valido_segundos": 4500
    },
    "producao_turno": {
      "id_turno": 23,
      "id_maquina": 148,
      "id_operador": 42,
      "inicio": 1728135600,
      "turno": 23,
      "sinais": 3200,
      "rejeitos": 105,
      "sinais_validos": 3095,
      "tempo_decorrido_segundos": 12000,
      "tempo_paradas_segundos": 1200,
      "tempo_paradas_nao_conta_oee": 300,
      "tempo_paradas_validas": 900,
      "tempo_valido_segundos": 10800
    },
    "producao_mapa": {
      "id_mapa": 789,
      "id_item_mapa": 56,
      "id_produto": 5678,
      "id_cor": 789,
      "id_matriz": 435987,
      "qt_produzir": 5000,
      "sinais": 1500,
      "rejeitos": 50,
      "sinais_validos": 1450,
      "saldo_a_produzir": 3550,
      "inicio": 1728135600,
      "sessoes": [12, 13, 14, 15],
      "tempo_decorrido_segundos": 50000,
      "tempo_paradas_segundos": 5000,
      "tempo_paradas_nao_conta_oee": 1200,
      "tempo_paradas_validas": 3800,
      "tempo_valido_segundos": 45000
    }
  },
  "additional_data": {
    "sinais": 1500,
    "rejeitos": 50,
    "sinais_validos": 1450
  },
  "timestamp": 1728142200,
  "timestamp_formatted": "05/10/2025 14:30:00"
}
```

**Campos Importantes:**
- `update_type` - Tipo de atualização: `sinal`, `parada`, `retomada`, `velocidade`
- `target_machine_id` - Máquina onde tablet está inscrito (pai se multipostos)
- `source_machine_id` - Máquina que realmente mudou (filha se multipostos)
- `is_child_update` - `true` se for update de máquina filha
- `machine_data` - Contexto completo da máquina que mudou
- `additional_data` - Dados específicos do tipo de update

---

#### 📦 Estrutura de `machine_data`

##### Campos Principais da Máquina
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | integer | ID único da máquina |
| `nome` | string | Nome descritivo da máquina |
| `multipostos` | boolean | Se a máquina é multipostos (pai) |
| `velocidade` | integer | Velocidade atual em ciclos/hora |
| `maquina_pai` | integer | ID da máquina pai (se for filha) |
| `id_empresa` | integer | ID da empresa dona da máquina |
| `status` | boolean | `true` = EM PRODUÇÃO, `false` = PARADA |
| `last_updated` | integer | Timestamp Unix da última atualização |

##### Objeto `turnos`
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | integer | ID do turno ativo |
| `nome` | string | Nome do turno (ex: "Diurno", "Noturno") |
| `hora_inicio` | string | Hora de início (formato "HH:MM") |
| `hora_fim` | string | Hora de fim (formato "HH:MM") |
| `dias_semana` | array | Dias da semana (1=Seg, 7=Dom) |

##### Objeto `sessao_operador`
Representa a sessão atual do operador na máquina.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id_sessao` | integer | ID único da sessão |
| `id_maquina` | integer | ID da máquina |
| `id_operador` | integer | ID do operador logado |
| `inicio` | integer | Timestamp Unix do início da sessão |
| `turno` | integer | ID do turno da sessão |
| `sinais` | integer | Total de sinais recebidos |
| `rejeitos` | integer | Total de rejeitos |
| `sinais_validos` | integer | Sinais válidos (sinais - rejeitos) |
| `tempo_decorrido_segundos` | integer | Tempo total desde o início (segundos) |
| `tempo_paradas_segundos` | integer | Tempo total de paradas (segundos) |
| `tempo_paradas_nao_conta_oee` | integer | Tempo de paradas que não contam no OEE |
| `tempo_paradas_validas` | integer | Paradas que contam (paradas_segundos - nao_conta_oee) |
| `tempo_valido_segundos` | integer | Tempo produtivo (decorrido - paradas) |

##### Objeto `producao_turno`
Acumula produção de todos os operadores no turno atual.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id_turno` | integer | ID do turno |
| `id_maquina` | integer | ID da máquina |
| `id_operador` | integer | ID do operador atual |
| `inicio` | integer | Timestamp Unix do início do turno |
| `turno` | integer | ID do turno |
| `sinais` | integer | Total de sinais do turno |
| `rejeitos` | integer | Total de rejeitos do turno |
| `sinais_validos` | integer | Sinais válidos do turno |
| `tempo_decorrido_segundos` | integer | Tempo total do turno (segundos) |
| `tempo_paradas_segundos` | integer | Tempo de paradas do turno |
| `tempo_paradas_nao_conta_oee` | integer | Paradas que não contam no OEE |
| `tempo_paradas_validas` | integer | Paradas válidas do turno |
| `tempo_valido_segundos` | integer | Tempo produtivo do turno |

##### Objeto `producao_mapa`
Representa a produção do mapa de produção atual.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id_mapa` | integer | ID do mapa de produção |
| `id_item_mapa` | integer | ID do item dentro do mapa |
| `id_produto` | integer | ID do produto sendo produzido |
| `id_cor` | integer | ID da cor do produto |
| `id_matriz` | integer | ID da matriz/molde usado |
| `qt_produzir` | integer | Quantidade planejada a produzir |
| `sinais` | integer | Total de sinais do mapa |
| `rejeitos` | integer | Total de rejeitos do mapa |
| `sinais_validos` | integer | Sinais válidos (sinais - rejeitos) |
| `saldo_a_produzir` | integer | Quantidade restante (qt_produzir - sinais_validos) |
| `inicio` | integer | Timestamp Unix do início do mapa |
| `sessoes` | array | IDs das sessões envolvidas neste mapa |
| `tempo_decorrido_segundos` | integer | Tempo total desde início do mapa |
| `tempo_paradas_segundos` | integer | Tempo de paradas do mapa |
| `tempo_paradas_nao_conta_oee` | integer | Paradas que não contam |
| `tempo_paradas_validas` | integer | Paradas válidas do mapa |
| `tempo_valido_segundos` | integer | Tempo produtivo do mapa |

---

#### 📊 Campos Calculados Importantes

**Tempos:**
- `tempo_paradas_validas` = `tempo_paradas_segundos` - `tempo_paradas_nao_conta_oee`
- `tempo_valido_segundos` = `tempo_decorrido_segundos` - `tempo_paradas_segundos`

**Produção:**
- `sinais_validos` = `sinais` - `rejeitos`
- `saldo_a_produzir` = `qt_produzir` - `sinais_validos` (apenas em producao_mapa)

**Percentual de Conclusão (Mapa):**
```javascript
const percentual = (producao_mapa.sinais_validos / producao_mapa.qt_produzir) * 100;
```

**Taxa de Rejeito:**
```javascript
const taxaRejeito = (sessao_operador.rejeitos / sessao_operador.sinais) * 100;
```

### 2. Production Alert (Alerta de Produção)

Enviado quando metas de produção são atingidas ou próximas.

**Formato:**
```json
{
  "type": "production_alert",
  "alert_type": "meta_atingida",
  "target_machine_id": 147,
  "source_machine_id": 148,
  "is_child_alert": true,
  "alert_data": {
    "sinais_validos": 500,
    "qt_produzir": 500,
    "percentual": 100.0,
    "message": "Meta de produção atingida! 500/500"
  },
  "timestamp": 1728142200,
  "timestamp_formatted": "05/10/2025 14:30:00"
}
```

**Tipos de Alerta:**
- `meta_atingida` - 100% da meta alcançada
- `proximo_meta` - >= 90% da meta alcançada

---

## 💻 Como Acessar os Dados no Código

### JavaScript - Acessando Campos da Atualização

```javascript
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  
  if (update.type === 'machine_update') {
    // Informações da atualização
    const updateType = update.update_type; // "sinal", "parada", "retomada", "velocidade"
    const targetMachine = update.target_machine_id; // Máquina inscrita
    const sourceMachine = update.source_machine_id; // Máquina que mudou
    const isChild = update.is_child_update; // true se for filha
    
    // Dados da máquina
    const machine = update.machine_data;
    const machineId = machine.id;
    const machineName = machine.nome;
    const velocity = machine.velocidade;
    const isProducing = machine.status; // true = produzindo, false = parada
    
    // Sessão do operador atual
    const session = machine.sessao_operador;
    if (session) {
      const operatorId = session.id_operador;
      const signals = session.sinais;
      const rejects = session.rejeitos;
      const validSignals = session.sinais_validos;
      const elapsedTime = session.tempo_decorrido_segundos;
      const stopTime = session.tempo_paradas_segundos;
      const productiveTime = session.tempo_valido_segundos;
    }
    
    // Produção do turno
    const shift = machine.producao_turno;
    if (shift) {
      const shiftSignals = shift.sinais;
      const shiftRejects = shift.rejeitos;
      const shiftValidSignals = shift.sinais_validos;
    }
    
    // Produção do mapa (ordem de produção)
    const map = machine.producao_mapa;
    if (map) {
      const productId = map.id_produto;
      const colorId = map.id_cor;
      const matrixId = map.id_matriz;
      const targetQty = map.qt_produzir;
      const producedQty = map.sinais_validos;
      const remaining = map.saldo_a_produzir;
      
      // Calcular progresso
      const progress = (producedQty / targetQty) * 100;
      console.log(`Progresso: ${progress.toFixed(1)}%`);
    }
  }
};
```

### TypeScript - Interfaces Completas

```typescript
interface MachineUpdate {
  type: 'machine_update';
  update_type: 'sinal' | 'parada' | 'retomada' | 'velocidade';
  target_machine_id: number;
  source_machine_id: number;
  is_child_update: boolean;
  machine_data: MachineData;
  additional_data: Record<string, any>;
  timestamp: number;
  timestamp_formatted: string;
}

interface MachineData {
  id: number;
  nome: string;
  multipostos: boolean;
  velocidade: number;
  maquina_pai: number;
  id_empresa: number;
  status: boolean;
  last_updated: number;
  turnos: ShiftInfo;
  sessao_operador: OperatorSession;
  producao_turno: ShiftProduction;
  producao_mapa: ProductionMap;
}

interface ShiftInfo {
  id: number;
  nome: string;
  hora_inicio: string;
  hora_fim: string;
  dias_semana: number[];
}

interface OperatorSession {
  id_sessao: number;
  id_maquina: number;
  id_operador: number;
  inicio: number;
  turno: number;
  sinais: number;
  rejeitos: number;
  sinais_validos: number;
  tempo_decorrido_segundos: number;
  tempo_paradas_segundos: number;
  tempo_paradas_nao_conta_oee: number;
  tempo_paradas_validas: number;
  tempo_valido_segundos: number;
}

interface ShiftProduction {
  id_turno: number;
  id_maquina: number;
  id_operador: number;
  inicio: number;
  turno: number;
  sinais: number;
  rejeitos: number;
  sinais_validos: number;
  tempo_decorrido_segundos: number;
  tempo_paradas_segundos: number;
  tempo_paradas_nao_conta_oee: number;
  tempo_paradas_validas: number;
  tempo_valido_segundos: number;
}

interface ProductionMap {
  id_mapa: number;
  id_item_mapa: number;
  id_produto: number;
  id_cor: number;
  id_matriz: number;
  qt_produzir: number;
  sinais: number;
  rejeitos: number;
  sinais_validos: number;
  saldo_a_produzir: number;
  inicio: number;
  sessoes: number[];
  tempo_decorrido_segundos: number;
  tempo_paradas_segundos: number;
  tempo_paradas_nao_conta_oee: number;
  tempo_paradas_validas: number;
  tempo_valido_segundos: number;
}

interface ProductionAlert {
  type: 'production_alert';
  alert_type: 'meta_atingida' | 'proximo_meta';
  target_machine_id: number;
  source_machine_id: number;
  is_child_alert: boolean;
  alert_data: {
    sinais_validos: number;
    qt_produzir: number;
    percentual: number;
    saldo?: number;
    message: string;
  };
  timestamp: number;
  timestamp_formatted: string;
}
```

### React Native - Hook Customizado

```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseMachineWebSocketProps {
  machineId: number;
  wsUrl: string;
}

export const useMachineWebSocket = ({ machineId, wsUrl }: UseMachineWebSocketProps) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [machineData, setMachineData] = useState<MachineData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  useEffect(() => {
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setIsConnected(true);
      // Inscrever na máquina
      websocket.send(JSON.stringify({
        type: 'subscribe',
        id_maquina: machineId
      }));
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'machine_update') {
        setMachineData(data.machine_data);
        setLastUpdate(data.timestamp_formatted);
      }
      
      if (data.type === 'production_alert') {
        // Mostrar notificação
        Alert.alert('Alerta de Produção', data.alert_data.message);
      }
    };

    websocket.onclose = () => {
      setIsConnected(false);
    };

    setWs(websocket);

    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'unsubscribe',
          id_maquina: machineId
        }));
        websocket.close();
      }
    };
  }, [machineId, wsUrl]);

  return {
    machineData,
    isConnected,
    lastUpdate,
    ws
  };
};

// Uso no componente
const MachineScreen = ({ machineId }) => {
  // Configurar URL baseado no ambiente
  const WS_URL = __DEV__ 
    ? 'ws://localhost:8765'  // Desenvolvimento
    : 'ws://192.168.1.100:8765'; // Produção (ajustar IP)
    
  const { machineData, isConnected, lastUpdate } = useMachineWebSocket({
    machineId,
    wsUrl: WS_URL
  });

  if (!machineData) return <Loading />;

  return (
    <View>
      <Text>Máquina: {machineData.nome}</Text>
      <Text>Status: {machineData.status ? '🟢 Produzindo' : '🔴 Parada'}</Text>
      <Text>Velocidade: {machineData.velocidade} ciclos/h</Text>
      
      {machineData.sessao_operador && (
        <View>
          <Text>Sinais: {machineData.sessao_operador.sinais}</Text>
          <Text>Rejeitos: {machineData.sessao_operador.rejeitos}</Text>
          <Text>Válidos: {machineData.sessao_operador.sinais_validos}</Text>
        </View>
      )}
      
      {machineData.producao_mapa && (
        <View>
          <Text>Meta: {machineData.producao_mapa.qt_produzir}</Text>
          <Text>Produzido: {machineData.producao_mapa.sinais_validos}</Text>
          <Text>Saldo: {machineData.producao_mapa.saldo_a_produzir}</Text>
          <ProgressBar 
            progress={machineData.producao_mapa.sinais_validos / machineData.producao_mapa.qt_produzir}
          />
        </View>
      )}
      
      <Text>Última atualização: {lastUpdate}</Text>
      <Text>Conexão: {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}</Text>
    </View>
  );
};
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Máquina Normal

```javascript
// Usar o endereço apropriado para seu ambiente
const WS_URL = 'ws://192.168.1.100:8765'; // Rede local
// const WS_URL = 'ws://10.200.0.184:8765'; // VPN
// const WS_URL = 'ws://localhost:8765'; // Desenvolvimento local

const ws = new WebSocket(WS_URL);

ws.onopen = () => {
  // Inscrever-se na máquina 135
  ws.send(JSON.stringify({
    type: 'subscribe',
    id_maquina: 135
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'machine_update') {
    console.log(`Update: ${data.update_type}`);
    console.log(`Máquina ${data.source_machine_id}`);
    console.log('Dados:', data.machine_data);
    
    // Atualizar UI
    updateMachineDisplay(data.machine_data);
  }
  
  if (data.type === 'production_alert') {
    console.log(`Alerta: ${data.alert_type}`);
    console.log(data.alert_data.message);
    
    // Mostrar notificação
    showAlert(data.alert_data);
  }
};
```

---

### Exemplo 2: Máquina Multipostos

```javascript
const WS_URL = 'ws://192.168.1.100:8765'; // Ajustar conforme seu ambiente
const ws = new WebSocket(WS_URL);

ws.onopen = () => {
  // Inscrever-se na máquina PAI (147)
  ws.send(JSON.stringify({
    type: 'subscribe',
    id_maquina: 147
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'machine_update') {
    const isPai = data.target_machine_id === data.source_machine_id;
    
    if (isPai) {
      // Update da máquina pai
      console.log('Update da máquina principal');
      updateMainMachine(data.machine_data);
    } else {
      // Update de máquina filha (estação)
      console.log(`Update da Estação ${data.source_machine_id}`);
      updateStation(data.source_machine_id, data.machine_data);
    }
  }
};
```

---

### Exemplo 3: Múltiplas Máquinas

```javascript
const WS_URL = 'ws://192.168.1.100:8765'; // Ajustar conforme seu ambiente
const ws = new WebSocket(WS_URL);
const machines = [135, 147, 152]; // Máquinas a monitorar

ws.onopen = () => {
  // Inscrever-se em múltiplas máquinas
  machines.forEach(machineId => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      id_maquina: machineId
    }));
  });
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'machine_update') {
    // Identificar qual máquina teve update
    const targetMachine = data.target_machine_id;
    
    console.log(`Update na máquina ${targetMachine}`);
    
    // Atualizar UI específica
    updateMachineInList(targetMachine, data);
  }
};
```

---

### Exemplo 4: React Native Component

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';

const MachineMonitor = ({ machineId }) => {
  const [ws, setWs] = useState(null);
  const [machineData, setMachineData] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket(wsUrl);
    
    websocket.onopen = () => {
      // Inscrever-se na máquina
      websocket.send(JSON.stringify({
        type: 'subscribe',
        id_maquina: machineId
      }));
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'machine_update') {
        // Atualizar estado
        setMachineData(data.machine_data);
      }
      
      if (data.type === 'production_alert') {
        // Mostrar alerta nativo
        Alert.alert(
          'Alerta de Produção',
          data.alert_data.message
        );
      }
    };
    
    setWs(websocket);
    
    return () => {
      // Desinscrever ao desmontar
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'unsubscribe',
          id_maquina: machineId
        }));
        websocket.close();
      }
    };
  }, [machineId]);

  return (
    <View>
      <Text>Máquina {machineId}</Text>
      {machineData && (
        <>
          <Text>Status: {machineData.status ? 'Produzindo' : 'Parada'}</Text>
          <Text>Velocidade: {machineData.velocidade}</Text>
          <Text>Sinais: {machineData.sessao_operador.sinais}</Text>
        </>
      )}
    </View>
  );
};
```

---

## 🎯 Casos de Uso

### 1. Dashboard em Tempo Real

```javascript
// Inscrever em todas as máquinas do chão de fábrica
const allMachines = [135, 147, 148, 149, 150, 152];

allMachines.forEach(id => {
  ws.send(JSON.stringify({type: 'subscribe', id_maquina: id}));
});

// Receber updates e atualizar dashboard
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'machine_update') {
    updateDashboard(data);
  }
};
```

### 2. Tela de Operador (Single Machine)

```javascript
// Operador trabalhando na máquina 135
ws.send(JSON.stringify({type: 'subscribe', id_maquina: 135}));

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Atualizar contadores em tempo real
  updateCounters({
    sinais: data.machine_data.sessao_operador.sinais,
    rejeitos: data.machine_data.sessao_operador.rejeitos,
    tempo: data.machine_data.sessao_operador.tempo_decorrido_segundos
  });
};
```

### 3. Notificações de Meta

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'production_alert') {
    if (data.alert_type === 'meta_atingida') {
      // Meta atingida - celebrar!
      showSuccessNotification(data.alert_data.message);
      playSuccessSound();
    } else if (data.alert_type === 'proximo_meta') {
      // Próximo da meta - avisar
      showWarningNotification(data.alert_data.message);
    }
  }
};
```

---

## 🛠️ Boas Práticas

### 1. Reconexão Automática

```javascript
let ws;
let reconnectInterval;
const WS_URL = 'ws://192.168.1.100:8765'; // Ajustar conforme seu ambiente

function connect() {
  ws = new WebSocket(WS_URL);
  
  ws.onopen = () => {
    console.log('Conectado');
    clearInterval(reconnectInterval);
    
    // Reinscrever em máquinas
    subscribedMachines.forEach(id => {
      ws.send(JSON.stringify({type: 'subscribe', id_maquina: id}));
    });
  };
  
  ws.onclose = () => {
    console.log('Desconectado - Tentando reconectar...');
    reconnectInterval = setInterval(connect, 5000);
  };
}

connect();
```

### 2. Gerenciamento de Subscriptions

```javascript
const subscriptions = new Set();

function subscribe(machineId) {
  if (!subscriptions.has(machineId)) {
    ws.send(JSON.stringify({type: 'subscribe', id_maquina: machineId}));
    subscriptions.add(machineId);
  }
}

function unsubscribe(machineId) {
  if (subscriptions.has(machineId)) {
    ws.send(JSON.stringify({type: 'unsubscribe', id_maquina: machineId}));
    subscriptions.delete(machineId);
  }
}

function unsubscribeAll() {
  subscriptions.forEach(id => unsubscribe(id));
}
```

### 3. Filtrar Updates por Tipo

```javascript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'machine_update':
      handleMachineUpdate(data);
      break;
    case 'production_alert':
      handleProductionAlert(data);
      break;
    case 'connection':
      console.log('Conectado ao servidor');
      break;
  }
};

function handleMachineUpdate(data) {
  switch(data.update_type) {
    case 'sinal':
      updateCounters(data);
      break;
    case 'parada':
      showMachineStop(data);
      break;
    case 'retomada':
      showMachineResume(data);
      break;
    case 'velocidade':
      updateVelocity(data);
      break;
  }
}
```

---

## 📊 Monitoramento

### Ver Subscriptions Ativas

```bash
# Logs do servidor mostram inscr ições
docker logs websocket_server | grep "inscrito"

# Exemplo de output:
# 🔔 Cliente 192.168.1.50:54321 inscrito na máquina 147
# 📊 Total de inscritos na máquina 147: 2
```

### Debug de Updates

```javascript
// Logar todos os updates recebidos
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update recebido:', {
    type: data.type,
    update_type: data.update_type,
    machine: data.source_machine_id,
    timestamp: data.timestamp_formatted
  });
};
```

---

## 🚨 Alertas de Produção

### Meta Atingida (100%)

```json
{
  "type": "production_alert",
  "alert_type": "meta_atingida",
  "alert_data": {
    "sinais_validos": 500,
    "qt_produzir": 500,
    "percentual": 100.0,
    "message": "Meta de produção atingida! 500/500"
  }
}
```

### Próximo da Meta (>= 90%)

```json
{
  "type": "production_alert",
  "alert_type": "proximo_meta",
  "alert_data": {
    "sinais_validos": 475,
    "qt_produzir": 500,
    "percentual": 95.0,
    "saldo": 25,
    "message": "Próximo de finalizar! 475/500 (95.0%)"
  }
}
```

---

## ⚠️ Observações Importantes

### Valores Nulos ou Ausentes

**Alguns campos podem ser `null` ou não existir dependendo do estado da máquina:**

1. **`sessao_operador`** - Será `null` se não houver operador logado
2. **`producao_mapa`** - Será `null` se não houver mapa de produção ativo
3. **`producao_turno`** - Sempre presente durante horário de turno

**Exemplo de verificação:**

```javascript
ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  
  if (update.type === 'machine_update') {
    const machine = update.machine_data;
    
    // ✅ Verificar antes de usar
    if (machine.sessao_operador) {
      console.log('Operador logado:', machine.sessao_operador.id_operador);
      console.log('Sinais:', machine.sessao_operador.sinais);
    } else {
      console.log('Nenhum operador logado');
    }
    
    // ✅ Verificar mapa de produção
    if (machine.producao_mapa) {
      console.log('Produzindo:', machine.producao_mapa.id_produto);
      console.log('Meta:', machine.producao_mapa.qt_produzir);
    } else {
      console.log('Nenhuma ordem de produção ativa');
    }
  }
};
```

### TypeScript - Campos Opcionais

```typescript
interface MachineData {
  id: number;
  nome: string;
  multipostos: boolean;
  velocidade: number;
  maquina_pai: number;
  id_empresa: number;
  status: boolean;
  last_updated: number;
  turnos: ShiftInfo;
  sessao_operador: OperatorSession | null; // ⚠️ Pode ser null
  producao_turno: ShiftProduction;
  producao_mapa: ProductionMap | null; // ⚠️ Pode ser null
}
```

### Tratamento de Erros

```typescript
const getMachineProgress = (machine: MachineData): number => {
  // Verificar se existe mapa de produção
  if (!machine.producao_mapa) {
    return 0;
  }
  
  // Verificar se meta é maior que zero
  if (machine.producao_mapa.qt_produzir <= 0) {
    return 0;
  }
  
  // Calcular progresso
  const progress = (machine.producao_mapa.sinais_validos / machine.producao_mapa.qt_produzir) * 100;
  
  // Garantir que está entre 0 e 100
  return Math.min(Math.max(progress, 0), 100);
};
```

---

## 📊 Diferenças Entre Sessão, Turno e Mapa

### Sessão de Operador
- **Duração**: Início do login até logout do operador
- **Escopo**: Individual por operador
- **Uso**: Acompanhar performance individual

### Produção de Turno
- **Duração**: Do início ao fim do turno (ex: 07:30 às 17:18)
- **Escopo**: Todos operadores que trabalharam no turno
- **Uso**: Totalização de produção do turno

### Produção Mapa
- **Duração**: Do início ao fim da ordem de produção
- **Escopo**: Pode durar múltiplos turnos e sessões
- **Uso**: Acompanhar progresso de uma ordem específica

**Exemplo Visual:**

```
┌─────────────────────────────────────────────────────────┐
│                    TURNO DIURNO                         │
│                   (07:30 - 17:18)                       │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  SESSÃO 1    │  │  SESSÃO 2    │  │  SESSÃO 3    │ │
│  │ Operador A   │  │ Operador B   │  │ Operador A   │ │
│  │ 07:30-11:30  │  │ 11:30-14:30  │  │ 14:30-17:18  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │          MAPA DE PRODUÇÃO #789                  │   │
│  │   Produto #5678 - Meta: 5.000 peças             │   │
│  │   (pode continuar nos próximos turnos)          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**Relações:**
- Uma **sessão** sempre pertence a um **turno**
- Um **turno** pode ter múltiplas **sessões**
- Um **mapa** pode ter múltiplas **sessões** e **turnos**
- `producao_mapa.sessoes` = array com IDs de todas as sessões envolvidas

---

## 🔄 Tipos de Update e Campos `additional_data`

### Update Type: `sinal`
```json
{
  "update_type": "sinal",
  "additional_data": {
    "sinais": 1501,        // Novo total
    "rejeitos": 50,        // Total de rejeitos
    "sinais_validos": 1451 // Novo total válido
  }
}
```

### Update Type: `parada`
```json
{
  "update_type": "parada",
  "additional_data": {
    "parada_id": 456,      // ID da parada criada
    "motivo_id": 12,       // ID do motivo da parada
    "operador_id": 42      // ID do operador
  }
}
```

### Update Type: `retomada`
```json
{
  "update_type": "retomada",
  "additional_data": {
    "parada_id": 456,      // ID da parada finalizada
    "duracao": 300,        // Duração em segundos
    "velocidade": 100      // Velocidade ao retomar
  }
}
```

### Update Type: `velocidade`
```json
{
  "update_type": "velocidade",
  "additional_data": {
    "velocidade": 95       // Nova velocidade
  }
}
```

---

## 🎯 Casos de Uso Específicos

### 1. Exibir Progresso da Produção

```javascript
const displayProgress = (machine) => {
  if (!machine.producao_mapa) {
    return "Sem ordem de produção ativa";
  }
  
  const { sinais_validos, qt_produzir, saldo_a_produzir } = machine.producao_mapa;
  const percentual = (sinais_validos / qt_produzir) * 100;
  
  return {
    produzido: sinais_validos,
    meta: qt_produzir,
    saldo: saldo_a_produzir,
    percentual: percentual.toFixed(1),
    status: percentual >= 100 ? 'Concluído' : percentual >= 90 ? 'Próximo do fim' : 'Em andamento'
  };
};
```

### 2. Calcular Taxa de Rejeito

```javascript
const calcularTaxaRejeito = (machine) => {
  if (!machine.sessao_operador) {
    return 0;
  }
  
  const { sinais, rejeitos } = machine.sessao_operador;
  
  if (sinais === 0) {
    return 0;
  }
  
  return ((rejeitos / sinais) * 100).toFixed(2);
};
```

### 3. Calcular Eficiência (OEE Simplificado)

```javascript
const calcularEficiencia = (machine) => {
  if (!machine.sessao_operador) {
    return 0;
  }
  
  const {
    tempo_decorrido_segundos,
    tempo_valido_segundos,
    sinais,
    sinais_validos
  } = machine.sessao_operador;
  
  // Disponibilidade: tempo produtivo / tempo total
  const disponibilidade = (tempo_valido_segundos / tempo_decorrido_segundos) * 100;
  
  // Qualidade: peças boas / peças totais
  const qualidade = sinais > 0 ? (sinais_validos / sinais) * 100 : 0;
  
  return {
    disponibilidade: disponibilidade.toFixed(1),
    qualidade: qualidade.toFixed(1),
    oee_simplificado: ((disponibilidade * qualidade) / 100).toFixed(1)
  };
};
```

### 4. Formatar Tempo Decorrido

```javascript
const formatarTempo = (segundos) => {
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  const secs = segundos % 60;
  
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Uso
console.log(formatarTempo(machine.sessao_operador.tempo_decorrido_segundos));
// Output: "01:23:20"
```

### 5. Verificar se Máquina é Multipostos

```javascript
const handleMachineUpdate = (update) => {
  const machine = update.machine_data;
  
  if (machine.multipostos) {
    // Esta é uma máquina PAI
    console.log('Máquina Multipostos:', machine.nome);
    
    // Verificar se update veio de filha
    if (update.is_child_update) {
      console.log(`Update da estação ${update.source_machine_id}`);
    }
  } else {
    // Máquina normal
    console.log('Máquina Individual:', machine.nome);
  }
};
```

---

## ✅ Checklist de Implementação

### Básico
- [ ] Conectar ao WebSocket
- [ ] Implementar inscrição na máquina ao abrir tela
- [ ] Implementar desinscrição ao fechar tela
- [ ] Processar updates de `machine_update`
- [ ] Processar alertas de `production_alert`

### Interface
- [ ] Exibir status da máquina (produzindo/parada)
- [ ] Exibir velocidade atual
- [ ] Exibir contadores (sinais, rejeitos, válidos)
- [ ] Exibir progresso do mapa de produção
- [ ] Exibir tempo decorrido
- [ ] Exibir tempo de paradas

### Tratamento de Estados
- [ ] Verificar se `sessao_operador` existe antes de usar
- [ ] Verificar se `producao_mapa` existe antes de usar
- [ ] Tratar divisão por zero em cálculos
- [ ] Validar tipos com TypeScript (opcional)

### UX
- [ ] Implementar reconexão automática
- [ ] Tratar erros de conexão
- [ ] Adicionar indicadores visuais de conexão
- [ ] Mostrar feedback visual em updates
- [ ] Adicionar som/vibração em alertas

### Avançado
- [ ] Testar com máquinas multipostos
- [ ] Implementar cache local dos dados
- [ ] Adicionar logs de debug
- [ ] Testar reconexão após perda de rede
- [ ] Implementar retry logic

---

## 📞 Suporte ao Desenvolvedor

### JSON Schema Completo

Para validação, você pode usar este JSON Schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "type": { "enum": ["machine_update", "production_alert"] },
    "update_type": { "enum": ["sinal", "parada", "retomada", "velocidade"] },
    "target_machine_id": { "type": "integer" },
    "source_machine_id": { "type": "integer" },
    "is_child_update": { "type": "boolean" },
    "machine_data": {
      "type": "object",
      "required": ["id", "nome", "status"]
    },
    "timestamp": { "type": "integer" },
    "timestamp_formatted": { "type": "string" }
  },
  "required": ["type", "timestamp"]
}
```

### Ferramenta de Debug

```javascript
// Helper para logar updates de forma legível
const debugMachineUpdate = (update) => {
  console.group(`📨 Update: ${update.update_type}`);
  console.log('Timestamp:', update.timestamp_formatted);
  console.log('Target Machine:', update.target_machine_id);
  console.log('Source Machine:', update.source_machine_id);
  console.log('Is Child:', update.is_child_update);
  
  if (update.machine_data.sessao_operador) {
    console.log('Sessão:', {
      operador: update.machine_data.sessao_operador.id_operador,
      sinais: update.machine_data.sessao_operador.sinais,
      rejeitos: update.machine_data.sessao_operador.rejeitos
    });
  }
  
  if (update.machine_data.producao_mapa) {
    console.log('Mapa:', {
      produto: update.machine_data.producao_mapa.id_produto,
      produzido: update.machine_data.producao_mapa.sinais_validos,
      meta: update.machine_data.producao_mapa.qt_produzir
    });
  }
  
  console.groupEnd();
};
```

---

**Documentação completa!** 🚀

Agora o desenvolvedor do IHM tem todas as informações necessárias para implementar a integração WebSocket com total clareza sobre a estrutura de dados recebida.
