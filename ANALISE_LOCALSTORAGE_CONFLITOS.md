# 🔍 Análise de Conflitos - LocalStorage vs SSE/API

## 📊 Dados Armazenados Localmente

### 1. **`industrack_active_session`** 
- **Onde:** `useAuth.ts`, `useSSEManager.ts`, `App.tsx`, `Sidebar.tsx`
- **O que salva:** `{ id_sessao, id_operador, id_maquina, timestamp }`
- **Quando salva:** 
  - Login via API REST
  - Recebimento de contexto via SSE
- **⚠️ CONFLITO POTENCIAL:**
  - Pode ter `id_sessao` diferente do backend
  - Se sessão for finalizada no backend mas localStorage não limpar, app fica "logado" localmente

### 2. **`industrack_current_production`**
- **Onde:** `OperatorDashboard.tsx`, `ProductionCommandsModal.tsx`
- **O que salva:** `{ id_maquina, id_mapa, taloes: [...], timestamp }`
- **Quando salva:**
  - Ao iniciar produção
  - Ao finalizar talão (remove da lista)
- **⚠️ CONFLITO POTENCIAL:**
  - Produção pode ter sido finalizada no backend mas localStorage ainda tem
  - Talões podem estar em estados diferentes (local vs backend)
  - **NÃO valida com backend se produção ainda está ativa**

### 3. **`industrack_current_machine`**
- **Onde:** `machineStorage.ts`, `App.tsx`
- **O que salva:** Objeto `Machine` completo
- **Quando salva:** Ao selecionar máquina
- **✅ SEM CONFLITO:** Apenas preferência do usuário

### 4. **`industrack_machines_list`** + **`industrack_machines_last_update`**
- **Onde:** `machineStorage.ts`
- **O que salva:** Lista completa de máquinas + timestamp
- **Cache:** 5 minutos
- **✅ SEM CONFLITO:** Apenas cache com TTL

### 5. **`industrack_device_id`** (não usado mais)
- **Onde:** `device.ts`
- **⚠️ Obsoleto** - função não é mais chamada

### 6. **`industrack_auth`** (Supabase)
- **Onde:** `supabase.ts`
- **O que salva:** Sessão Supabase Auth
- **⚠️ CONFLITO:** Só deveria existir para modo admin

### 7. **`industrack_session`** (legado)
- **Onde:** `session.ts`, `MachineSelection.tsx`
- **⚠️ CONFLITO:** ID de sessão antigo, pode conflitar com `industrack_active_session`

---

## 🚨 Conflitos Identificados

### **CONFLITO 1: Duas chaves de sessão**
```
industrack_active_session  (novo - API REST)
industrack_session         (antigo - Supabase)
```
**Problema:** Código pode estar lendo a chave errada

### **CONFLITO 2: Produção local vs Backend**
```javascript
// localStorage diz: Talão #123 em produção
storedProduction = { taloes: [{ id_talao: 123 }] }

// Backend SSE diz: Talão #123 já foi finalizado
producao_mapa = null
```
**Problema:** UI mostra dados desatualizados

### **CONFLITO 3: Sessão finalizada remotamente**
```
// Backend: Sessão foi finalizada
GET /api/contexto → sessao_operador = null

// localStorage: Sessão ainda ativa
industrack_active_session = { id_sessao: 1671 }

// Resultado: App acha que está logado mas backend não reconhece
```

---

## ✅ Soluções Propostas

### **1. Limpar dados obsoletos ao iniciar**
```typescript
// Remover keys antigas não mais usadas
localStorage.removeItem('industrack_session');
localStorage.removeItem('industrack_device_id');
```

### **2. Validar produção local com backend**
```typescript
// Ao carregar storedProduction, validar com contexto SSE
if (storedProduction && !machineData.contexto.producao_mapa) {
  console.warn('⚠️ Produção local existe mas backend não tem - limpando');
  localStorage.removeItem('industrack_current_production');
  setStoredProduction(null);
}
```

### **3. Detectar sessão finalizada remotamente**
```typescript
// Se SSE diz que não há sessão mas localStorage tem, limpar tudo
if (machineData.contexto && !machineData.contexto.sessao_operador && savedSession) {
  console.warn('⚠️ Backend não tem sessão ativa - limpando dados locais');
  clearAllLocalData();
}
```

### **4. Priorizar sempre dados do SSE/API**
```typescript
// REGRA: SSE/API sempre tem razão, localStorage é apenas cache
// Se houver conflito, SSE/API ganha
```

---

## 🎯 Recomendações

### **Alto Risco de Conflito:**
- ❌ `industrack_current_production` - não valida com backend
- ❌ `industrack_session` - key legada duplicada

### **Médio Risco:**
- ⚠️ `industrack_active_session` - valida idade mas não valida com backend

### **Baixo Risco:**
- ✅ `industrack_current_machine` - apenas preferência
- ✅ `industrack_machines_list` - cache com TTL

---

Quer que eu implemente as correções?


