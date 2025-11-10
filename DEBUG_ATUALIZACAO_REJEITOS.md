# 🔍 **DEBUG: ATUALIZAÇÃO INSTANTÂNEA DE REJEITOS**

Data: 10 de novembro de 2025

## 🎯 **Objetivo**

Identificar por que a atualização instantânea de rejeitos não está funcionando quando o servidor retorna:

```json
{
  "success": true,
  "message": "1 rejeito(s) adicionado(s) com sucesso",
  "data": {
    "id_maquina": 174,
    "quantidade": 1,
    "id_motivo_rejeito": 1,
    "contadores": {
      "sessao_rejeitos": 0,
      "turno_rejeitos": 4,
      "mapa_rejeitos": 0
    },
    "timestamp": 1762802318
  }
}
```

---

## 🔍 **Logs de Debug Implementados**

### **Passo 1: Resposta do Servidor**

```javascript
console.log('📥 Resposta completa do servidor (adicionarRejeitos):', response);
```

**Deve mostrar:**
```javascript
{
  success: true,
  message: "1 rejeito(s) adicionado(s) com sucesso",
  data: {
    id_maquina: 174,
    contadores: { sessao_rejeitos: 0, turno_rejeitos: 4, ... }
  }
}
```

### **Passo 2: Extração do Payload**

```javascript
const payload: any = response.data || {};
console.log('📦 Payload extraído de response.data:', payload);
```

**Deve mostrar:**
```javascript
{
  id_maquina: 174,
  quantidade: 1,
  id_motivo_rejeito: 1,
  contadores: { ... },
  timestamp: 1762802318
}
```

### **Passo 3: ID da Máquina Alvo**

```javascript
const targetId: number = payload.id_maquina ?? machineId;
console.log('🎯 ID da máquina alvo:', targetId, '(machineId principal:', machineId, ')');
```

**Deve mostrar:**
```javascript
🎯 ID da máquina alvo: 174 (machineId principal: 164)
```

**Esperado:** `targetId !== machineId` (é uma estação filha)

### **Passo 4: Objeto Contadores**

```javascript
const counters: any = payload.contadores || {};
console.log('🔢 Objeto contadores:', counters);
```

**Deve mostrar:**
```javascript
{
  sessao_rejeitos: 0,
  turno_rejeitos: 4,
  mapa_rejeitos: 0
}
```

### **Passo 5: Contadores Extraídos**

```javascript
console.log('✅ Contadores extraídos:', {
  sessao_rejeitos: sessaoRej,
  turno_rejeitos: turnoRej,
  mapa_rejeitos: mapaRej,
  todos_undefined: sessaoRej === undefined && turnoRej === undefined && mapaRej === undefined
});
```

**Deve mostrar:**
```javascript
{
  sessao_rejeitos: 0,
  turno_rejeitos: 4,  ✅
  mapa_rejeitos: 0,
  todos_undefined: false  ✅ Deve ser FALSE
}
```

### **Passo 6: Verificação do childMachinesData**

```javascript
console.log('📋 childMachinesData antes da atualização:', {
  tamanho: prev.size,
  ids: Array.from(prev.keys()),
  tem_estacao_alvo: prev.has(targetId)
});
```

**Deve mostrar:**
```javascript
{
  tamanho: 16,
  ids: [165, 166, 167, ..., 174, ...],
  tem_estacao_alvo: true  ✅ CRÍTICO - Deve ser TRUE
}
```

### **Passo 7: Dados Antes da Atualização**

```javascript
console.log('📊 Dados ANTES da atualização - Estação 174:', {
  nome: child.nome,
  sessao_rejeitos_antes: child.sessao_operador?.rejeitos,
  turno_rejeitos_antes: child.producao_turno?.rejeitos,
  mapa_rejeitos_antes: child.producao_mapa?.rejeitos
});
```

**Deve mostrar:**
```javascript
{
  nome: "Posto 5 - MATRIZ DIREITA",
  sessao_rejeitos_antes: 0,
  turno_rejeitos_antes: 3,  ← Valor anterior
  mapa_rejeitos_antes: 0
}
```

### **Passo 8: Dados Depois da Atualização**

```javascript
console.log('✅ Estação 174 ATUALIZADA instantaneamente:', {
  nome: updatedChild.nome,
  sessao_rejeitos_depois: updatedChild.sessao_operador?.rejeitos,
  turno_rejeitos_depois: updatedChild.producao_turno?.rejeitos,
  mapa_rejeitos_depois: updatedChild.producao_mapa?.rejeitos,
  rejeitos_raiz_depois: updatedChild.rejeitos
});
```

**Deve mostrar:**
```javascript
{
  nome: "Posto 5 - MATRIZ DIREITA",
  sessao_rejeitos_depois: 0,
  turno_rejeitos_depois: 4,  ✅ Novo valor!
  mapa_rejeitos_depois: 0,
  rejeitos_raiz_depois: 4
}
```

---

## 🚨 **Possíveis Problemas e Soluções**

### **Problema 1: Estação não encontrada**

**Log esperado:**
```
❌ CRÍTICO: Estação 174 NÃO encontrada no childMachinesData!
```

**Causa:** ID da estação não está no Map

**Solução:** Verificar se `context_update` processou todas as estações

### **Problema 2: Contadores undefined**

**Log esperado:**
```
todos_undefined: true  ❌
```

**Causa:** `payload.contadores` está vazio ou null

**Solução:** Verificar estrutura de `response.data.contadores`

### **Problema 3: Map não está atualizando**

**Log esperado:**
```
✅ Estação 174 ATUALIZADA instantaneamente
(mas UI não atualiza)
```

**Causa:** React não detecta mudança no Map

**Solução:** Criar novo Map ao invés de mutar

---

## 🧪 **Como Testar**

1. **Abrir console** (F12)
2. **Limpar logs** (Ctrl+L)
3. **Clicar "+ Rejeito"** em Posto 5 DIREITA (ID 174)
4. **Procurar sequência de logs:**
   ```
   📥 Resposta completa do servidor...
   📦 Payload extraído...
   🎯 ID da máquina alvo: 174
   🔢 Objeto contadores: { turno_rejeitos: 4, ... }
   ✅ Contadores extraídos: { turno_rejeitos: 4, ... }
   🔄 Atualizando rejeitos da estação 174...
   📋 childMachinesData antes...
   📊 Dados ANTES...
   ✅ Estação 174 ATUALIZADA...
   📋 childMachinesData DEPOIS...
   ```

5. **Verificar se contador na UI aumentou**

---

## ✅ **Estrutura Esperada do Servidor**

```json
{
  "success": true,
  "message": "1 rejeito(s) adicionado(s) com sucesso",
  "data": {
    "id_maquina": 174,           ← ID da estação (não da máquina principal)
    "quantidade": 1,
    "id_motivo_rejeito": 1,
    "contadores": {              ← Objeto com contadores atualizados
      "sessao_rejeitos": 0,
      "turno_rejeitos": 4,       ← Valor NOVO
      "mapa_rejeitos": 0
    },
    "timestamp": 1762802318
  }
}
```

**Validações:**
- ✅ `response.success === true`
- ✅ `response.data.id_maquina` existe e é número
- ✅ `response.data.contadores` existe
- ✅ Contadores são números (não undefined)

---

**Por favor, teste e me envie os logs do console!** 🔍

Com os logs, vou identificar exatamente onde está falhando e corrigir.

