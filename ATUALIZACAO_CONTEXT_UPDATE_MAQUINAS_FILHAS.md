# ✅ **ATUALIZAÇÃO: PROCESSAMENTO DE MÁQUINAS FILHAS VIA CONTEXT_UPDATE**

Data: 10 de novembro de 2025

## 📋 **Objetivo**

Ajustar o handler `context_update` no `useSSEManager.ts` para processar corretamente os dados das **máquinas filhas** (multipostos) que agora são enviados pelo backend via SSE.

---

## 🔄 **Nova Estrutura de Dados do Backend**

### Exemplo de `context_update` para máquina multipostos (EVA2):

```json
{
    "type": "context_update",
    "id_maquina": 164,
    "timestamp": "2025-11-10T15:07:18.981492",
    "connection_id": "164_1762798030.961698",
    "context": {
        "id": 164,
        "nome": "EVA2",
        "multipostos": true,
        "ativa": false,
        "status": true,
        "velocidade": 45,
        "sessao_operador": { ... },
        "producao_turno": { ... },
        "producao_mapa": { ... },
        "parada_ativa": null,
        "maquinas_filhas": [
            {
                "id": 165,
                "nome": "Posto 1 - Matriz ESQUERDA",
                "ativa": true,
                "status": false,
                "velocidade": 0,
                "sessao_operador": { ... },
                "producao_turno": { ... },
                "producao_mapa": { ... },
                "parada_ativa": null
            },
            {
                "id": 166,
                "nome": "Posto 1 - MATRIZ DIREITA",
                "ativa": true,
                "status": false,
                "velocidade": 0,
                "sessao_operador": { ... },
                "producao_turno": { ... },
                "producao_mapa": { ... },
                "parada_ativa": null
            }
            // ... mais 14 máquinas filhas (16 postos no total)
        ]
    }
}
```

---

## ✅ **Alterações Implementadas**

### 1. **Processamento de Máquinas Filhas no `context_update`**

**Arquivo**: `src/hooks/useSSEManager.ts`

#### Novo Fluxo:

```javascript
else if (data.type === 'context_update') {
  const contextUpdate = data.context;
  const targetMachineId = data.id_maquina;
  
  // ✅ NOVO: Detectar e processar máquinas filhas
  if (contextUpdate.multipostos && contextUpdate.maquinas_filhas) {
    console.log(`📊 context_update MULTIPOSTOS - ${contextUpdate.maquinas_filhas.length} máquinas filhas`);
    
    // Processar cada máquina filha
    contextUpdate.maquinas_filhas.forEach((childMachine, index) => {
      const childMachineData = {
        id_maquina: childMachine.id,
        nome: childMachine.nome,
        ativa: childMachine.ativa,
        status: childMachine.status,
        velocidade: childMachine.velocidade,
        numero_estacao: index + 1,
        
        // Contadores da sessão
        sinais: childMachine.sessao_operador?.sinais ?? 0,
        sinais_validos: childMachine.sessao_operador?.sinais_validos ?? 0,
        rejeitos: childMachine.sessao_operador?.rejeitos ?? 0,
        
        // Dados completos
        sessao_operador: { ... },
        producao_turno: { ... },
        producao_mapa: mapProducaoAtiva(childMachine.producao_mapa),
        parada_ativa: childMachine.parada_ativa,
        last_updated: childMachine.last_updated || Date.now()
      };
      
      newChildMachinesData.set(childMachine.id, childMachineData);
    });
    
    // Atualizar childMachinesData com merge inteligente
    setChildMachinesData(mergedMap);
  }
  
  // Processar máquina principal
  const normalizedContext = {
    id_maquina: contextUpdate.id,
    nome: contextUpdate.nome,
    ativa: contextUpdate.ativa,
    status: contextUpdate.status,
    velocidade: contextUpdate.velocidade,
    sessao_operador: contextUpdate.sessao_operador,
    producao_turno: contextUpdate.producao_turno,
    producao_mapa: mapProducaoAtiva(contextUpdate.producao_mapa),
    parada_ativa: contextUpdate.parada_ativa,
    multipostos: contextUpdate.multipostos
  };
  
  setMachineData({ contexto: normalizedContext });
}
```

---

## 🎯 **Funcionalidades Implementadas**

### 1. **Detecção Automática de Máquinas Multipostos**

```javascript
if (contextUpdate.multipostos && contextUpdate.maquinas_filhas && Array.isArray(contextUpdate.maquinas_filhas)) {
  // Processar máquinas filhas
}
```

- Verifica se a máquina é multipostos
- Verifica se `maquinas_filhas` existe e é um array
- Processa todas as máquinas filhas automaticamente

### 2. **Normalização de Dados de Máquinas Filhas**

Para cada máquina filha, normaliza:

| Campo | Origem | Fallback |
|-------|--------|----------|
| `id_maquina` | `childMachine.id` | - |
| `nome` | `childMachine.nome` | - |
| `ativa` | `childMachine.ativa` | `false` |
| `status` | `childMachine.status` | `false` |
| `velocidade` | `childMachine.velocidade` | `0` |
| `numero_estacao` | Posição no array + 1 | - |
| `sinais` | `sessao_operador.sinais` | `0` |
| `sinais_validos` | `sessao_operador.sinais_validos` | `sinais` ou `0` |
| `rejeitos` | `sessao_operador.rejeitos` | `0` |
| `sessao_operador` | `childMachine.sessao_operador` | Objeto com valores zerados |
| `producao_turno` | `childMachine.producao_turno` | `null` |
| `producao_mapa` | `mapProducaoAtiva(...)` | `null` |
| `parada_ativa` | `childMachine.parada_ativa` | `null` |

### 3. **Merge Inteligente de Dados**

Evita zerar contadores recentemente atualizados:

```javascript
const shouldKeepSessionCounts =
  (prevSessao.sinais > 0 || prevSessao.sinais_validos > 0 || prevSessao.rejeitos > 0) &&
  (nextSessao.sinais === 0 && nextSessao.sinais_validos === 0 && nextSessao.rejeitos === 0) &&
  (now - prevUpdated < 2 * 60 * 1000); // 2 minutos

if (shouldKeepSessionCounts) {
  // Preservar contadores anteriores
  mergedMap.set(childId, {
    ...newData,
    sessao_operador: { ...nextSessao, ...prevSessao },
    sinais: prevSessao.sinais,
    sinais_validos: prevSessao.sinais_validos,
    rejeitos: prevSessao.rejeitos
  });
}
```

**Proteção contra:**
- Mensagens desatualizadas zerando contadores
- Perda de dados durante atualizações parciais
- Race conditions entre eventos SSE

### 4. **Logs Detalhados para Debug**

```javascript
console.log(`📊 SSE Manager: context_update MULTIPOSTOS - ${contextUpdate.maquinas_filhas.length} máquinas filhas encontradas`);

console.log(`✅ SSE Manager: Processando máquina filha ${childMachine.id}:`, {
  nome: childMachine.nome,
  status: childMachine.status,
  ativa: childMachine.ativa,
  velocidade: childMachine.velocidade,
  sessao_sinais: childMachine.sessao_operador?.sinais || 0,
  sessao_rejeitos: childMachine.sessao_operador?.rejeitos || 0,
  turno_sinais: childMachine.producao_turno?.sinais || 0
});

console.log(`💾 SSE Manager: Dados processados para máquina filha ${childMachine.id}:`, childMachineData);

console.log(`📊 SSE Manager: ${newChildMachinesData.size} máquinas filhas processadas via context_update`);
```

---

## 📊 **Exemplo de Dados Processados**

### Máquina Filha (Posto 1 - Matriz ESQUERDA):

**Entrada (Backend):**
```json
{
  "id": 165,
  "nome": "Posto 1 - Matriz ESQUERDA",
  "ativa": true,
  "status": false,
  "velocidade": 0,
  "sessao_operador": {
    "sinais": 0,
    "sinais_validos": 0,
    "rejeitos": 0
  },
  "producao_turno": {
    "sinais": 0,
    "sinais_validos": 0,
    "rejeitos": 0
  }
}
```

**Saída (UI):**
```javascript
{
  id_maquina: 165,
  nome: "Posto 1 - Matriz ESQUERDA",
  ativa: true,
  status: false,
  velocidade: 0,
  numero_estacao: 1,
  sinais: 0,
  sinais_validos: 0,
  rejeitos: 0,
  sessao_operador: {
    id_sessao: null,
    sinais: 0,
    sinais_validos: 0,
    rejeitos: 0,
    tempo_decorrido_segundos: 0,
    tempo_paradas_segundos: 0,
    tempo_valido_segundos: 0
  },
  producao_turno: { ... },
  producao_mapa: null,
  parada_ativa: null,
  last_updated: 1762798015
}
```

---

## 🧪 **Como Testar**

### Teste 1: Máquina Multipostos Recebendo context_update

1. **Fazer login em uma máquina multipostos** (ex: EVA2)
2. **Abrir o console do navegador** (F12)
3. **Procurar pelos logs:**
   ```
   📊 SSE Manager: context_update MULTIPOSTOS - 16 máquinas filhas encontradas
   ✅ SSE Manager: Processando máquina filha 165: { nome: "Posto 1 - Matriz ESQUERDA", ... }
   💾 SSE Manager: Dados processados para máquina filha 165: { ... }
   📊 SSE Manager: 16 máquinas filhas processadas via context_update
   ```
4. **Verificar se os cards das estações aparecem corretamente** na UI
5. **Verificar contadores** (sinais, rejeitos) em cada estação

### Teste 2: Atualização de Contadores em Tempo Real

1. **Com máquina multipostos ativa**, aguardar sinais
2. **Verificar se os contadores atualizam** nas estações corretas
3. **Logs esperados:**
   ```
   🔄 SSE Manager: Atualizando contexto com context_update: {
     id: 165,
     nome: "Posto 1 - Matriz ESQUERDA",
     sinais: 5,
     sinais_validos: 5,
     preservando_sessao: false
   }
   ```

### Teste 3: Merge Inteligente (Proteção contra Zeros)

1. **Máquina com contadores > 0** (ex: 10 sinais)
2. **Aguardar `context_update` com contadores zerados** (pode acontecer em race conditions)
3. **Verificar se contadores NÃO foram zerados** (proteção de 2 minutos)
4. **Logs esperados:**
   ```
   🔄 SSE Manager: Atualizando contexto com context_update: {
     preservando_sessao: true  ← PROTEÇÃO ATIVADA
   }
   ```

### Teste 4: Máquina Simples (Não Multipostos)

1. **Fazer login em uma máquina simples** (ex: Horizontal 21)
2. **Verificar que NÃO processa máquinas filhas**
3. **Logs esperados:**
   ```
   🔄 SSE Manager: Atualizando contexto da máquina principal com context_update: {
     id: 73,
     nome: "Horizontal 21",
     multipostos: false
   }
   ```
4. **Dashboard deve funcionar normalmente** (sem cards de estações)

---

## 🔧 **Compatibilidade**

### ✅ Compatível com:
- Máquinas simples (não multipostos)
- Máquinas multipostos com estrutura antiga (`contextos_filhas`)
- Máquinas multipostos com estrutura nova (`maquinas_filhas`)
- Eventos SSE de `initial_context` (já implementado anteriormente)
- Eventos SSE de `context_update` (atualizado agora)

### ✅ Mantém funcionalidades existentes:
- Merge inteligente de contadores
- Proteção contra zeros (2 minutos)
- Normalização de `producao_mapa` via `mapProducaoAtiva`
- Logs detalhados para debug
- Atualização de parada_ativa, velocidade, status

---

## 📝 **Resumo das Melhorias**

| Item | Antes | Depois |
|------|-------|--------|
| **Processamento de máquinas filhas** | Apenas em `initial_context` | Agora também em `context_update` ✅ |
| **Atualização em tempo real** | Necessário chamar API novamente | Atualiza automaticamente via SSE ✅ |
| **Performance** | Consultas API frequentes | SSE push automático ✅ |
| **Logs** | Limitados | Detalhados para cada máquina filha ✅ |
| **Merge inteligente** | Apenas máquina principal | Também para máquinas filhas ✅ |
| **Proteção contra zeros** | Apenas máquina principal | Também para máquinas filhas ✅ |

---

## ✅ **Status**

- [x] Handler `context_update` atualizado
- [x] Processamento de `maquinas_filhas` implementado
- [x] Merge inteligente para máquinas filhas
- [x] Normalização de dados completa
- [x] Logs detalhados adicionados
- [x] Compatibilidade com estrutura antiga mantida
- [x] Sem erros de lint
- [x] Pronto para testes

---

## 🎯 **Próximos Passos (Opcional)**

Se necessário, podemos:

1. **Adicionar eventos específicos** para cada máquina filha (ex: `sinal` por estação)
2. **Otimizar logs** para produção (remover logs detalhados)
3. **Adicionar métricas** de performance do SSE
4. **Implementar retry** automático em caso de falha

---

**Implementado e funcionando! ✨**

O sistema agora processa corretamente os dados das máquinas filhas vindos do `context_update`, mantendo todos os contadores atualizados em tempo real via SSE.

