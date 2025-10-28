# ⚡ API REST + SSE - Cheat Sheet

## 🌐 Base URL

```
http://10.200.0.184:8000
```

## 📚 Documentação Interativa

```
http://10.200.0.184:8000/docs
```

---

## 🔥 Comandos Rápidos

### 1. Iniciar Sessão

```bash
curl -X POST http://10.200.0.184:8000/api/sessao/iniciar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135,"id_operador":1,"id_turno":3}'
```

**Kotlin:**
```kotlin
api.iniciarSessao(IniciarSessaoRequest(135, 1, 3))
```

---

### 2. Finalizar Sessão

```bash
curl -X POST http://10.200.0.184:8000/api/sessao/finalizar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135}'
```

**Kotlin:**
```kotlin
api.finalizarSessao(FinalizarSessaoRequest(135))
```

---

### 3. Iniciar Produção

```bash
curl -X POST http://10.200.0.184:8000/api/producao/iniciar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135,"id_mapa":1,"tempo_ciclo":15}'
```

**Kotlin:**
```kotlin
api.iniciarProducao(IniciarProducaoRequest(135, 1, 15))
```

---

### 4. Pausar Produção

```bash
curl -X POST http://10.200.0.184:8000/api/producao/pausar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135}'
```

**Kotlin:**
```kotlin
api.pausarProducao(PausarProducaoRequest(135))
```

---

### 5. Retomar Produção

```bash
curl -X POST http://10.200.0.184:8000/api/producao/retomar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135}'
```

**Kotlin:**
```kotlin
api.retomarProducao(RetomarProducaoRequest(135))
```

---

### 6. Finalizar Produção

```bash
curl -X POST http://10.200.0.184:8000/api/producao/finalizar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135}'
```

**Kotlin:**
```kotlin
api.finalizarProducao(FinalizarProducaoRequest(135))
```

---

### 7. Adicionar Rejeitos

```bash
curl -X POST http://10.200.0.184:8000/api/rejeitos/adicionar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135,"quantidade":5,"id_motivo_rejeito":1}'
```

**Kotlin:**
```kotlin
api.adicionarRejeitos(AdicionarRejeitosRequest(135, 5, 1))
```

---

### 8. Forçar Parada

```bash
curl -X POST http://10.200.0.184:8000/api/parada/forcar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135,"id_motivo":15}'
```

**Kotlin:**
```kotlin
api.forcarParada(ForcarParadaRequest(135, 15))
```

---

### 9. Consultar Contexto

```bash
curl http://10.200.0.184:8000/api/maquina/135/contexto
```

**Kotlin:**
```kotlin
api.consultarContexto(135)
```

---

### 10. SSE - Receber Updates

```bash
curl -N http://10.200.0.184:8000/api/sse/updates/135
```

**Kotlin:**
```kotlin
val eventSource = EventSource.Factory(client)
    .newEventSource(
        Request.Builder()
            .url("http://10.200.0.184:8000/api/sse/updates/135")
            .build(),
        listener
    )
```

---

## 📋 Request Bodies Completos

### IniciarSessaoRequest
```json
{
  "id_maquina": 135,
  "id_operador": 1,
  "id_turno": 3
}
```

### FinalizarSessaoRequest
```json
{
  "id_maquina": 135
}
```

### IniciarProducaoRequest
```json
{
  "id_maquina": 135,
  "id_mapa": 1,
  "tempo_ciclo": 15
}
```

### PausarProducaoRequest
```json
{
  "id_maquina": 135
}
```

### RetomarProducaoRequest
```json
{
  "id_maquina": 135
}
```

### FinalizarProducaoRequest
```json
{
  "id_maquina": 135
}
```

### AdicionarRejeitosRequest
```json
{
  "id_maquina": 135,
  "quantidade": 5,
  "id_motivo_rejeito": 1
}
```

### ForcarParadaRequest
```json
{
  "id_maquina": 135,
  "id_motivo": 15
}
```

---

## 🎯 Fluxo Típico de Uso

```bash
# 1. Consultar contexto inicial
curl http://10.200.0.184:8000/api/maquina/135/contexto

# 2. Conectar SSE (em background)
curl -N http://10.200.0.184:8000/api/sse/updates/135 &

# 3. Iniciar sessão
curl -X POST http://10.200.0.184:8000/api/sessao/iniciar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135,"id_operador":1,"id_turno":3}'

# 4. Iniciar produção
curl -X POST http://10.200.0.184:8000/api/producao/iniciar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135,"id_mapa":1,"tempo_ciclo":15}'

# 5. Durante produção: adicionar rejeitos se necessário
curl -X POST http://10.200.0.184:8000/api/rejeitos/adicionar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135,"quantidade":2,"id_motivo_rejeito":1}'

# 6. Finalizar produção
curl -X POST http://10.200.0.184:8000/api/producao/finalizar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135}'

# 7. Finalizar sessão
curl -X POST http://10.200.0.184:8000/api/sessao/finalizar \
  -H "Content-Type: application/json" \
  -d '{"id_maquina":135}'
```

---

## 📊 Tabela Completa

| Endpoint | Método | Body | Descrição |
|----------|--------|------|-----------|
| `/api/sessao/iniciar` | POST | `{"id_maquina":135,"id_operador":1,"id_turno":3}` | Iniciar sessão |
| `/api/sessao/finalizar` | POST | `{"id_maquina":135}` | Finalizar sessão |
| `/api/producao/iniciar` | POST | `{"id_maquina":135,"id_mapa":1,"tempo_ciclo":15}` | Iniciar produção |
| `/api/producao/pausar` | POST | `{"id_maquina":135}` | Pausar produção |
| `/api/producao/retomar` | POST | `{"id_maquina":135}` | Retomar produção |
| `/api/producao/finalizar` | POST | `{"id_maquina":135}` | Finalizar produção |
| `/api/rejeitos/adicionar` | POST | `{"id_maquina":135,"quantidade":5,"id_motivo_rejeito":1}` | Adicionar rejeitos |
| `/api/parada/forcar` | POST | `{"id_maquina":135,"id_motivo":15}` | Forçar parada |
| `/api/maquina/135/contexto` | GET | - | Consultar contexto |
| `/api/sse/updates/135` | GET | - | Receber updates (SSE) |

---

## ✅ Respostas Padrão

### Sucesso
```json
{
  "success": true,
  "message": "Mensagem de sucesso",
  "data": { ... }
}
```

### Erro
```json
{
  "success": false,
  "error": "Descrição do erro",
  "timestamp": "2025-10-15T10:30:00"
}
```

---

**📄 Docs:** http://10.200.0.184:8000/docs

