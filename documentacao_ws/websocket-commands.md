# 📡 Documentação de Comandos WebSocket - Industrack IHM

## 🔌 Conexão

### Endpoint
```
ws://[SERVER_IP]:8765
```

**Exemplo de produção:**
```
ws://192.168.1.100:8765
```

**Exemplo local:**
```
ws://localhost:8765
```

### Mensagem de Conexão

Ao conectar, o servidor envia uma mensagem de boas-vindas:

```json
{
  "type": "connection",
  "status": "connected",
  "message": "Conectado ao servidor WebSocket Industrack",
  "timestamp": "2025-10-05T14:30:00.000000",
  "server_time": 1728142200
}
```

---

## 📋 Formato das Mensagens

### Requisição (Cliente → Servidor)

Todas as mensagens devem ser enviadas em formato JSON com o campo `type` indicando o comando:

```json
{
  "type": "NOME_DO_COMANDO",
  "campo1": "valor1",
  "campo2": "valor2"
}
```

### Resposta (Servidor → Cliente)

O servidor sempre responde no formato:

**Sucesso:**
```json
{
  "success": true,
  "message": "Descrição do sucesso",
  "data": {
    // Dados retornados
  },
  "timestamp": "2025-10-05T14:30:00.000000"
}
```

**Erro:**
```json
{
  "success": false,
  "error": "Descrição do erro",
  "timestamp": "2025-10-05T14:30:00.000000"
}
```

---

## 👤 Comandos de Sessão de Operador

### 1. Iniciar Sessão de Operador

Inicia uma nova sessão de operador em uma máquina.

**Comando:** `iniciar_sessao_operador`

**Requisição:**
```json
{
  "type": "iniciar_sessao_operador",
  "id_maquina": 135,
  "id_operador": 42,
  "id_turno": 23
}
```

**Campos:**
- `id_maquina` (integer, obrigatório): ID da máquina
- `id_operador` (integer, obrigatório): ID do operador
- `id_turno` (integer, obrigatório): ID do turno

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Sessão de operador iniciada com sucesso",
  "data": {
    "id_sessao": "135_42_1728142200",
    "id_maquina": 135,
    "id_operador": 42,
    "id_turno": 23,
    "inicio": 1728142200,
    "inicio_formatado": "05/10/2025 14:30:00"
  },
  "timestamp": "2025-10-05T14:30:00.000000"
}
```

**Possíveis Erros:**
- `"id_maquina é obrigatório"`
- `"id_operador é obrigatório"`
- `"id_turno é obrigatório"`
- `"Máquina {id} não encontrada"`
- `"Já existe sessão ativa para o operador {id}"`

---

### 2. Finalizar Sessão de Operador

Finaliza a sessão ativa do operador em uma máquina.

**Comando:** `finalizar_sessao_operador`

**Requisição:**
```json
{
  "type": "finalizar_sessao_operador",
  "id_maquina": 135
}
```

**Campos:**
- `id_maquina` (integer, obrigatório): ID da máquina

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Sessão de operador finalizada com sucesso",
  "data": {
    "id_sessao": "135_42_1728142200",
    "id_maquina": 135,
    "id_operador": 42,
    "id_turno": 23,
    "inicio": 1728142200,
    "fim": 1728156600,
    "tempo_decorrido_segundos": 14400,
    "sinais": 1500,
    "rejeitos": 50,
    "sinais_validos": 1450,
    "tempo_paradas_segundos": 600,
    "tempo_paradas_nao_conta_oee": 120,
    "tempo_paradas_validas": 480,
    "tempo_valido_segundos": 13800
  },
  "timestamp": "2025-10-05T18:30:00.000000"
}
```

**Possíveis Erros:**
- `"id_maquina é obrigatório"`
- `"Máquina {id} não encontrada"`
- `"Não há sessão ativa para finalizar"`

---

## 📦 Comandos de Produção Mapa

### 3. Iniciar Produção Mapa

Inicia a produção de um novo mapa de produção.

**Comando:** `iniciar_producao_mapa`

**Requisição:**
```json
{
  "type": "iniciar_producao_mapa",
  "id_maquina": 135,
  "id_mapa": 1,
  "id_item_mapa": 56,
  "id_produto": 5678,
  "id_cor": 789,
  "id_matriz": 435987,
  "qt_produzir": 500
}
```

**Campos:**
- `id_maquina` (integer, obrigatório): ID da máquina
- `id_mapa` (integer, obrigatório): ID do mapa de produção
- `id_item_mapa` (integer, opcional): ID do item no mapa
- `id_produto` (integer, obrigatório): ID do produto
- `id_cor` (integer, opcional): ID da cor
- `id_matriz` (integer, opcional): ID da matriz
- `qt_produzir` (integer, opcional): Quantidade a produzir (padrão: 0)

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Produção mapa iniciada com sucesso",
  "data": {
    "id_mapa": 1,
    "id_maquina": 135,
    "id_produto": 5678,
    "qt_produzir": 500,
    "inicio": 1728142200,
    "inicio_formatado": "05/10/2025 14:30:00"
  },
  "timestamp": "2025-10-05T14:30:00.000000"
}
```

**Possíveis Erros:**
- `"id_maquina é obrigatório"`
- `"id_mapa é obrigatório"`
- `"id_produto é obrigatório"`
- `"Máquina {id} não encontrada"`
- `"Já existe produção mapa ativa (ID: {id})"`

---

### 4. Finalizar Produção Mapa Parcial

Finaliza parcialmente a produção do mapa (pausa a produção, mas mantém o registro ativo).

**Comando:** `finalizar_producao_mapa_parcial`

**Requisição:**
```json
{
  "type": "finalizar_producao_mapa_parcial",
  "id_maquina": 135
}
```

**Campos:**
- `id_maquina` (integer, obrigatório): ID da máquina

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Produção mapa finalizada parcialmente com sucesso",
  "data": {
    "id_mapa": 1,
    "id_item_mapa": 56,
    "id_produto": 5678,
    "id_cor": 789,
    "id_matriz": 435987,
    "qt_produzir": 500,
    "sinais": 350,
    "rejeitos": 15,
    "sinais_validos": 335,
    "saldo_a_produzir": 165,
    "inicio": 1728142200,
    "fim": 1728156600,
    "tempo_decorrido_segundos": 14400,
    "finalizado_parcial": true
  },
  "timestamp": "2025-10-05T18:30:00.000000"
}
```

**Possíveis Erros:**
- `"id_maquina é obrigatório"`
- `"Máquina {id} não encontrada"`
- `"Não há produção mapa ativa para finalizar"`

---

### 5. Finalizar Produção Mapa Completa

Finaliza completamente a produção do mapa (encerra definitivamente).

**Comando:** `finalizar_producao_mapa_completa`

**Requisição:**
```json
{
  "type": "finalizar_producao_mapa_completa",
  "id_maquina": 135
}
```

**Campos:**
- `id_maquina` (integer, obrigatório): ID da máquina

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Produção mapa finalizada completamente com sucesso",
  "data": {
    "id_mapa": 1,
    "id_item_mapa": 56,
    "id_produto": 5678,
    "id_cor": 789,
    "id_matriz": 435987,
    "qt_produzir": 500,
    "sinais": 500,
    "rejeitos": 20,
    "sinais_validos": 480,
    "saldo_a_produzir": 20,
    "inicio": 1728142200,
    "fim": 1728163800,
    "tempo_decorrido_segundos": 21600,
    "finalizado_completo": true
  },
  "timestamp": "2025-10-05T20:30:00.000000"
}
```

**Possíveis Erros:**
- `"id_maquina é obrigatório"`
- `"Máquina {id} não encontrada"`
- `"Não há produção mapa ativa para finalizar"`

---

## 🚫 Comandos de Rejeitos

### 6. Adicionar Rejeitos

Adiciona um rejeito e incrementa os contadores de rejeitos na sessão, turno e mapa. Também cria registro na tabela `rejeitos` do Supabase.

**Comando:** `adicionar_rejeitos`

**Requisição:**
```json
{
  "type": "adicionar_rejeitos",
  "id_maquina": 135
}
```

**Campos:**
- `id_maquina` (integer, obrigatório): ID da máquina

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Rejeito adicionado com sucesso",
  "data": {
    "id_rejeito": 1234,
    "id_maquina": 135,
    "rejeitos_total": 11,
    "sinais_validos": 89,
    "timestamp": 1728142200,
    "timestamp_formatado": "05/10/2025 14:30:00"
  },
  "timestamp": "2025-10-05T14:30:00.000000"
}
```

**O que acontece:**
1. ✅ Valida se há sessão ativa na máquina
2. ✅ Cria registro na tabela `rejeitos` do Supabase com:
   - `id_maquina_raiz` e `id_maquina_filha` (hierarquia de máquinas)
   - `id_produto`, `id_cor`, `id_matriz` (da produção mapa ativa)
   - `timestamp` do rejeito
3. ✅ Incrementa contador `rejeitos` (+1) em:
   - `sessao_operador`
   - `producao_turno`
   - `producao_mapa`
4. ✅ Recalcula `sinais_validos` (sinais - rejeitos)
5. ✅ Atualiza `saldo_a_produzir` (se houver meta)
6. ✅ Sincroniza com Supabase (tabelas `sessao_operador` e `producao_mapa`)
7. ✅ Envia broadcast via WebSocket para subscribers da máquina

**Possíveis Erros:**
- `"id_maquina é obrigatório"`
- `"Máquina {id} não encontrada"`
- `"Não há sessão ativa para adicionar rejeitos"`
- `"Erro ao criar registro de rejeito no Supabase"`

**Exemplo de Uso:**
```javascript
// Operador detectou peça com defeito no tablet
ws.send(JSON.stringify({
  type: 'adicionar_rejeitos',
  id_maquina: 135
}));

// Resposta do servidor
{
  "success": true,
  "message": "Rejeito adicionado com sucesso",
  "data": {
    "id_rejeito": 1234,
    "rejeitos_total": 11,
    "sinais_validos": 89
  }
}
```

**Broadcast Enviado:**
```json
{
  "type": "machine_update",
  "update_type": "rejeito",
  "target_machine_id": 135,
  "source_machine_id": 135,
  "machine_data": {
    "sessao_operador": {
      "rejeitos": 11,
      "sinais_validos": 89
    }
  },
  "additional_data": {
    "rejeitos": 11,
    "sinais_validos": 89,
    "rejeito_id": 1234
  }
}
```

---

## 🔔 Comandos de Subscription (Inscrição)

### 7. Subscribe (Inscrever-se em Máquina)

Inscreve o tablet para receber atualizações em tempo real de uma máquina.

**Comando:** `subscribe`

**Requisição:**
```json
{
  "type": "subscribe",
  "id_maquina": 147
}
```

**Campos:**
- `id_maquina` (integer, obrigatório): ID da máquina para se inscrever

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

**Comportamento Especial - Multipostos:**
- Se a máquina for multipostos (máquina PAI), você receberá updates das máquinas FILHAS
- Exemplo: Se inscrever na máquina 147 (pai) → Recebe updates das máquinas 148, 149, 150 (filhas)

**Possíveis Erros:**
- `"id_maquina é obrigatório"`

---

### 8. Unsubscribe (Desinscrever-se de Máquina)

Remove a inscrição do tablet em uma máquina.

**Comando:** `unsubscribe`

**Requisição:**
```json
{
  "type": "unsubscribe",
  "id_maquina": 147
}
```

**Campos:**
- `id_maquina` (integer, obrigatório): ID da máquina para desinscrever

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

**Possíveis Erros:**
- `"id_maquina é obrigatório"`

---

## 🔍 Comandos de Consulta

### 9. Consultar Máquina

Retorna informações completas da máquina.

**Comando:** `consultar_maquina`

**Requisição:**
```json
{
  "type": "consultar_maquina",
  "id_maquina": 135
}
```

**Campos:**
- `id_maquina` (integer, obrigatório): ID da máquina

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "id": 135,
    "nome": "Máquina 1",
    "multipostos": false,
    "velocidade": 100,
    "maquina_pai": null,
    "id_empresa": 5,
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
      "id_sessao": "135_42_1728142200",
      "id_maquina": 135,
      "id_operador": 42,
      "inicio": 1728142200,
      "turno": 23,
      "sinais": 100,
      "rejeitos": 5,
      "sinais_validos": 95,
      "tempo_decorrido_segundos": 3600,
      "tempo_paradas_segundos": 300,
      "tempo_paradas_nao_conta_oee": 60,
      "tempo_paradas_validas": 240,
      "tempo_valido_segundos": 3300
    },
    "producao_turno": {...},
    "producao_mapa": {...}
  },
  "timestamp": "2025-10-05T14:30:00.000000"
}
```

---

### 10. Consultar Sessão

Retorna informações da sessão ativa de uma máquina.

**Comando:** `consultar_sessao`

**Requisição:**
```json
{
  "type": "consultar_sessao",
  "id_maquina": 135
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "has_active_session": true,
    "sessao": {
      "id_sessao": "135_42_1728142200",
      "id_maquina": 135,
      "id_operador": 42,
      "inicio": 1728142200,
      "turno": 23,
      "sinais": 100,
      "rejeitos": 5,
      "sinais_validos": 95
    }
  },
  "timestamp": "2025-10-05T14:30:00.000000"
}
```

---

### 11. Consultar Produção Mapa

Retorna informações da produção mapa ativa de uma máquina.

**Comando:** `consultar_producao_mapa`

**Requisição:**
```json
{
  "type": "consultar_producao_mapa",
  "id_maquina": 135
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "has_active_production": true,
    "producao_mapa": {
      "id_mapa": 1,
      "id_item_mapa": 56,
      "id_produto": 5678,
      "id_cor": 789,
      "id_matriz": 435987,
      "qt_produzir": 500,
      "sinais": 350,
      "rejeitos": 15,
      "sinais_validos": 335,
      "saldo_a_produzir": 165,
      "inicio": 1728142200
    }
  },
  "timestamp": "2025-10-05T14:30:00.000000"
}
```

---

## 📨 Updates em Tempo Real (Subscriptions)

Após se inscrever em uma máquina usando `subscribe`, você receberá automaticamente updates quando houver mudanças.

### Machine Update

Enviado quando há atualização na máquina (sinal, parada, retomada, velocidade):

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
    "status": true,
    "velocidade": 100,
    "sessao_operador": {...},
    "producao_turno": {...},
    "producao_mapa": {...}
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

**Campos:**
- `update_type`: Tipo de update (`sinal`, `parada`, `retomada`, `velocidade`)
- `target_machine_id`: Máquina onde você está inscrito
- `source_machine_id`: Máquina que realmente mudou
- `is_child_update`: `true` se for update de máquina filha
- `machine_data`: Contexto completo da máquina
- `additional_data`: Dados específicos do update

### Production Alert

Enviado quando metas de produção são atingidas:

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
- `meta_atingida`: 100% da meta alcançada
- `proximo_meta`: >= 90% da meta alcançada (próximo de finalizar)

---

## 📱 Exemplos de Implementação

### JavaScript (Web)

```javascript
// Conectar ao WebSocket
const ws = new WebSocket('ws://192.168.1.100:8765');

// Evento de conexão
ws.onopen = () => {
  console.log('Conectado ao servidor WebSocket');
  
  // Inscrever-se na máquina ao conectar
  ws.send(JSON.stringify({
    type: 'subscribe',
    id_maquina: 147
  }));
};

// Receber mensagens
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  // Processar respostas de comandos
  if (data.success !== undefined) {
    if (data.success) {
      console.log('Sucesso:', data.message);
    } else {
      console.error('Erro:', data.error);
    }
  }
  
  // Processar updates em tempo real
  if (data.type === 'machine_update') {
    console.log(`Update: ${data.update_type} na máquina ${data.source_machine_id}`);
    updateMachineDisplay(data.machine_data);
  }
  
  // Processar alertas
  if (data.type === 'production_alert') {
    console.log(`Alerta: ${data.alert_type}`);
    showAlert(data.alert_data.message);
  }
};

// Enviar comando para iniciar sessão
function iniciarSessao(idMaquina, idOperador, idTurno) {
  ws.send(JSON.stringify({
    type: 'iniciar_sessao_operador',
    id_maquina: idMaquina,
    id_operador: idOperador,
    id_turno: idTurno
  }));
}

// Inscrever em máquina
function subscribe(idMaquina) {
  ws.send(JSON.stringify({
    type: 'subscribe',
    id_maquina: idMaquina
  }));
}
```

### Python

```python
import websocket
import json

def on_message(ws, message):
    data = json.loads(message)
    print(f"Mensagem recebida: {data}")
    
    if data.get('success'):
        print(f"Sucesso: {data.get('message')}")
    else:
        print(f"Erro: {data.get('error')}")

def on_open(ws):
    print("Conectado ao servidor WebSocket")
    
    # Iniciar sessão
    command = {
        "type": "iniciar_sessao_operador",
        "id_maquina": 135,
        "id_operador": 42,
        "id_turno": 23
    }
    ws.send(json.dumps(command))

ws = websocket.WebSocketApp(
    "ws://192.168.1.100:8765",
    on_message=on_message,
    on_open=on_open
)

ws.run_forever()
```

### React Native / Expo

```javascript
import React, { useEffect, useState } from 'react';

const WebSocketClient = () => {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const websocket = new WebSocket('ws://192.168.1.100:8765');
    
    websocket.onopen = () => {
      console.log('Conectado');
      setConnected(true);
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Mensagem:', data);
    };
    
    websocket.onerror = (error) => {
      console.error('Erro:', error);
    };
    
    websocket.onclose = () => {
      console.log('Desconectado');
      setConnected(false);
    };
    
    setWs(websocket);
    
    return () => {
      websocket.close();
    };
  }, []);

  const iniciarSessao = (idMaquina, idOperador, idTurno) => {
    if (ws && connected) {
      const command = {
        type: 'iniciar_sessao_operador',
        id_maquina: idMaquina,
        id_operador: idOperador,
        id_turno: idTurno
      };
      ws.send(JSON.stringify(command));
    }
  };

  return (
    // Sua UI aqui
  );
};
```

---

## 🛠️ Testes

### Usando websocat (linha de comando)

```bash
# Instalar websocat
# macOS: brew install websocat
# Linux: cargo install websocat

# Conectar ao servidor
websocat ws://localhost:8765

# Enviar comando (colar JSON e pressionar Enter)
{"type":"iniciar_sessao_operador","id_maquina":135,"id_operador":42,"id_turno":23}
```

### Usando Python (script de teste)

```python
import websocket
import json
import time

def test_commands():
    ws = websocket.WebSocket()
    ws.connect("ws://localhost:8765")
    
    # Receber mensagem de boas-vindas
    welcome = json.loads(ws.recv())
    print("Boas-vindas:", welcome)
    
    # Teste 1: Iniciar sessão
    ws.send(json.dumps({
        "type": "iniciar_sessao_operador",
        "id_maquina": 135,
        "id_operador": 42,
        "id_turno": 23
    }))
    response = json.loads(ws.recv())
    print("Iniciar sessão:", response)
    
    time.sleep(1)
    
    # Teste 2: Iniciar produção mapa
    ws.send(json.dumps({
        "type": "iniciar_producao_mapa",
        "id_maquina": 135,
        "id_mapa": 1,
        "id_produto": 5678,
        "qt_produzir": 500
    }))
    response = json.loads(ws.recv())
    print("Iniciar produção:", response)
    
    time.sleep(1)
    
    # Teste 3: Consultar máquina
    ws.send(json.dumps({
        "type": "consultar_maquina",
        "id_maquina": 135
    }))
    response = json.loads(ws.recv())
    print("Consultar máquina:", response)
    
    ws.close()

if __name__ == "__main__":
    test_commands()
```

---

## 🔒 Segurança

### Recomendações

1. **Autenticação**: Implementar token de autenticação antes de aceitar comandos
2. **Validação**: Todos os dados são validados no servidor
3. **Rate Limiting**: Implementar limite de requisições por cliente
4. **SSL/TLS**: Em produção, usar WSS (WebSocket Secure)
5. **Firewall**: Restringir acesso apenas à rede interna

---

## 📊 Monitoramento

### Logs do Servidor

O servidor registra todas as operações:

```
✅ Cliente conectado: 192.168.1.50:54321
📨 Comando recebido: iniciar_sessao_operador
📄 Dados: {...}
🎬 Iniciando sessão: Máquina 135, Operador 42, Turno 23
✅ Sessão iniciada: 135_42_1728142200
```

### Visualizar Logs

```bash
# Docker
docker logs websocket_server -f

# Filtrar por tipo de comando
docker logs websocket_server | grep "iniciar_sessao"
```

---

## 🚀 Deploy

### Iniciar Servidor

```bash
# Com docker-compose
docker-compose up websocket

# Rebuild se necessário
docker-compose up --build websocket
```

### Verificar Status

```bash
# Verificar se está rodando
docker ps | grep websocket_server

# Verificar porta
netstat -an | grep 8765
```

---

## 📞 Suporte

Para dúvidas ou problemas:
- Verificar logs do servidor
- Testar conexão com `websocat` ou script Python
- Validar formato JSON das mensagens
- Confirmar que a máquina existe no sistema

---

**Versão:** 1.0  
**Data:** Outubro 2025  
**Industrack Backend - WebSocket Commands**
