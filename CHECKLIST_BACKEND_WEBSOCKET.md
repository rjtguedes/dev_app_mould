# ✅ Checklist - Verificar Backend WebSocket para Sinais

## 🔍 O que verificar no backend quando NÃO recebe sinais

### 1. ✅ Servidor WebSocket está rodando?

```bash
# Verificar se o processo está ativo
ps aux | grep websocket

# Verificar se a porta 8765 está escutando
netstat -tulpn | grep 8765
# ou
ss -tulpn | grep 8765

# Testar conexão
telnet 10.200.0.184 8765
```

---

### 2. ✅ Inscrição (Subscribe) está funcionando?

**O tablet precisa se inscrever na máquina primeiro!**

**Verificar nos logs do backend:**
```
✅ Deve aparecer algo como:
"Cliente [ID] inscrito na máquina 75"
ou
"Subscriber added for machine 75"
```

**Verificar no frontend (Console do navegador):**
```javascript
// Deve aparecer:
"🔔 WebSocketManager: Inscrito na máquina 75"
```

**Se NÃO aparecer:**
- O comando `subscribe` não está sendo enviado
- Verificar linha 217-218 do useWebSocketSingleton.ts
- Deve ter um setTimeout de 300ms após conexão

---

### 3. ✅ Backend está enviando eventos de sinal?

**Logs que DEVEM aparecer no backend quando processa um sinal:**

```python
# Quando máquina processa sinal
"Processando sinal da máquina 75"
"Sinal incrementado: total agora é X"

# Quando envia broadcast
"Enviando machine_update (sinal) para subscribers da máquina 75"
"Broadcasting para N clientes inscritos"
```

**Estrutura do evento que o backend DEVE enviar:**
```json
{
  "type": "machine_update",
  "update_type": "sinal",
  "target_machine_id": 75,
  "source_machine_id": 75,
  "is_child_update": false,
  "machine_data": {
    "id": 75,
    "nome": "Horizontal 17",
    "sessao_operador": {
      "sinais": 150,
      "rejeitos": 5,
      "sinais_validos": 145
    }
  },
  "additional_data": {
    "sinais": 150,
    "rejeitos": 5,
    "sinais_validos": 145
  },
  "timestamp": 1759959251,
  "timestamp_formatted": "2025-10-08 18:34:11 -03"
}
```

---

### 4. ✅ Verificar lista de subscribers

**Backend deve manter lista de quem está inscrito:**

```python
# No código do backend, verificar:
self.subscriptions = {
    75: [websocket_client_1, websocket_client_2, ...]
}

# Ou similar, dependendo da implementação
```

**Teste manual no backend:**
```python
# Adicionar log temporário
print(f"Subscribers da máquina 75: {len(self.subscriptions.get(75, []))}")
print(f"WebSocket clients conectados: {len(self.connections)}")
```

---

### 5. ✅ Redis/Memória está atualizando os sinais?

**Verificar se os sinais estão sendo incrementados:**

```bash
# Se usar Redis
redis-cli
> GET sessao_operador:75
> HGET maquina:75 sinais

# Deve retornar dados atualizados
```

**Logs importantes:**
```
"Incrementando contador de sinais: 149 -> 150"
"Salvando no Redis: sessao_operador:75"
```

---

### 6. ✅ Máquina tem sessão ativa?

**Backend só deve processar sinais se houver sessão ativa:**

```python
# Verificar no log
"Sessão ativa encontrada para máquina 75: sessao_id_xxx"
```

**Se aparecer:**
```
"Erro: Não há sessão ativa para máquina 75"
"Sinal ignorado: máquina sem sessão"
```

**Então:**
- Frontend precisa enviar `iniciar_sessao_operador` primeiro
- Verificar se sessão foi criada com sucesso

---

### 7. ✅ Formato do broadcast está correto?

**O backend DEVE enviar para todos os subscribers:**

```python
async def broadcast_machine_update(self, machine_id, update_type, machine_data, additional_data):
    """Envia update para todos os inscritos na máquina"""
    
    # Pegar lista de subscribers
    subscribers = self.subscriptions.get(machine_id, [])
    
    if not subscribers:
        print(f"⚠️ Nenhum subscriber inscrito na máquina {machine_id}")
        return
    
    # Montar mensagem
    message = {
        "type": "machine_update",
        "update_type": update_type,  # "sinal", "parada", "retomada"
        "target_machine_id": machine_id,
        "source_machine_id": machine_id,
        "is_child_update": False,
        "machine_data": machine_data,
        "additional_data": additional_data,
        "timestamp": int(time.time()),
        "timestamp_formatted": datetime.now().strftime("%Y-%m-%d %H:%M:%S %z")
    }
    
    # Enviar para todos
    for websocket in subscribers:
        try:
            await websocket.send(json.dumps(message))
            print(f"✅ Enviado para cliente: {websocket.remote_address}")
        except Exception as e:
            print(f"❌ Erro ao enviar: {e}")
```

---

### 8. ✅ Logs do Frontend (Console do Navegador)

**O que DEVE aparecer se tudo estiver OK:**

```
1. Conexão:
🔌 WebSocketManager: Conectando a ws://10.200.0.184:8765
✅ WebSocketManager: Conectado com sucesso ao servidor 10.200.0.184:8765

2. Inscrição:
🔔 WebSocketManager: Inscrito na máquina 75

3. Recebimento de sinais:
📥 WebSocketManager: Mensagem recebida: {type: "machine_update", update_type: "sinal", ...}
📨 WebSocket machine_update recebido para máquina: 75
📊 [NOVA] Evento de SINAL detectado para máquina principal: {sinais: 150, ...}
📊 WebSocket - Sinal recebido detalhado: {id_maquina: 75, ...}
```

**Se NÃO aparece "machine_update":**
- Backend não está enviando
- Verificar passos 3, 4 e 7

---

### 9. ✅ Teste Rápido - Enviar Sinal Manual

**Backend - Enviar teste via Python:**
```python
# No servidor WebSocket, adicionar endpoint de teste:
async def test_send_signal(machine_id):
    await broadcast_machine_update(
        machine_id=machine_id,
        update_type="sinal",
        machine_data={
            "id": machine_id,
            "nome": "Teste",
            "sessao_operador": {
                "sinais": 999,
                "rejeitos": 0,
                "sinais_validos": 999
            }
        },
        additional_data={
            "sinais": 999,
            "rejeitos": 0,
            "sinais_validos": 999
        }
    )
```

---

### 10. ✅ Comandos úteis para Debug

```bash
# Ver conexões WebSocket ativas
lsof -i :8765

# Monitorar logs em tempo real (Docker)
docker logs -f industrack-websocket

# Ver tráfego WebSocket (tcpdump)
sudo tcpdump -i any -A 'tcp port 8765'

# Testar com websocat (ferramenta CLI WebSocket)
websocat ws://10.200.0.184:8765
# Enviar manualmente:
{"type": "subscribe", "id_maquina": 75}
```

---

## 📋 Resumo - Ordem de Verificação

1. ✅ Servidor rodando e porta aberta
2. ✅ Tablet conectado ao WebSocket
3. ✅ Tablet inscrito na máquina (subscribe)
4. ✅ Máquina tem sessão ativa
5. ✅ Backend incrementa contadores no Redis/memória
6. ✅ Backend busca lista de subscribers
7. ✅ Backend monta mensagem machine_update
8. ✅ Backend envia broadcast
9. ✅ Tablet recebe mensagem
10. ✅ Frontend processa e atualiza UI

---

## 🚨 Problemas Comuns

### ❌ "Nenhum subscriber inscrito"
**Causa:** Tablet não enviou `subscribe` ou perdeu conexão
**Solução:** Verificar passo 2 e logs de inscrição

### ❌ "Sessão não encontrada"
**Causa:** Operador não iniciou sessão
**Solução:** Enviar `iniciar_sessao_operador` primeiro

### ❌ Sinais não incrementando
**Causa:** Redis não está atualizando ou sessão não está salvando
**Solução:** Verificar integração com Redis/BD

### ❌ Broadcast não envia
**Causa:** Lista de subscribers vazia ou erro no envio
**Solução:** Adicionar try/catch e logs detalhados

---

## 📊 Frontend está PRONTO ✅

O frontend agora:
- ✅ Trata eventos de `sinal` para máquinas principais
- ✅ Trata eventos de `sinal` para máquinas filhas (multipostos)
- ✅ Trata eventos de `parada`, `retomada` e `velocidade`
- ✅ Logs detalhados em todas as etapas
- ✅ Compatibilidade com formato antigo e novo

**Problema está no BACKEND se:**
- Frontend conecta ✅
- Frontend se inscreve ✅
- Mas não recebe eventos ❌


