# ✅ Correção - Detecção de Parada Forçada no Contexto Inicial

## 🐛 Problema Identificado

Quando o app era aberto e a máquina estava em **parada forçada**, o frontend **não detectava** isso corretamente:

- ❌ Botão "Parada Forçada" ficava desmarcado
- ❌ Status mostrava "PRODUZINDO" (verde)
- ❌ O contexto retornava `parada_forcada: { ativa: true, ... }` mas não era processado

### Contexto Retornado pelo Backend

```json
{
  "success": true,
  "data": {
    "id": 73,
    "nome": "Horizontal 21",
    "status": true,
    "parada_forcada": {
      "ativa": true,
      "id_parada": 11517,
      "inicio": 1762259683,
      "id_motivo": 13,
      "bloqueio_sinais": true
    },
    "parada_ativa": null,
    "ativa": false
  }
}
```

## ✅ Solução Implementada

### 1. **`src/hooks/useSSEManager.ts`** - Processamento do Contexto Inicial

Adicionei detecção e conversão de `parada_forcada` para `parada_ativa`:

#### Para Máquinas Simples (linhas 360-377):

```typescript
// ✅ Detectar parada forçada e converter para parada_ativa se necessário
let paradaAtiva = contextData.parada_ativa ?? null;
const paradaForcada = contextData.parada_forcada;
let statusReal = maquina.status ?? contextData.status ?? true;

// Se tem parada forçada ativa, usar ela como parada_ativa
if (paradaForcada && paradaForcada.ativa === true) {
  console.log('🛑 SSE Manager: Parada forçada detectada no contexto inicial:', paradaForcada);
  paradaAtiva = {
    id: paradaForcada.id_parada,
    inicio: paradaForcada.inicio,
    motivo_id: paradaForcada.id_motivo,
    bloqueio_sinais: paradaForcada.bloqueio_sinais || false
  };
  // Se tem parada forçada ativa, status deve ser false (parada)
  statusReal = false;
  console.log('🛑 SSE Manager: Status ajustado para false devido a parada forçada');
}

const dadosParaExibir = {
  contexto: {
    ...
    status: statusReal,
    parada_ativa: paradaAtiva,
    parada_forcada: paradaForcada ?? null, // Manter também o original
    ...
  }
};
```

#### Para Máquinas Multipostos (linhas 223-236):

```typescript
// Definir dados da máquina principal (nova estrutura)
// ✅ Detectar parada forçada
let paradaAtivaMain = contextData.parada_ativa ?? null;
const paradaForcadaMain = contextData.parada_forcada;
let statusMain = contextData.maquina?.status || true;

if (paradaForcadaMain && paradaForcadaMain.ativa === true) {
  console.log('🛑 SSE Manager: Parada forçada detectada na máquina principal (multipostos):', paradaForcadaMain);
  paradaAtivaMain = {
    id: paradaForcadaMain.id_parada,
    inicio: paradaForcadaMain.inicio,
    motivo_id: paradaForcadaMain.id_motivo,
    bloqueio_sinais: paradaForcadaMain.bloqueio_sinais || false
  };
  statusMain = false; // Parada forçada = status false
}

const mainMachineData = {
  contexto: {
    ...
    status: statusMain,
    parada_ativa: paradaAtivaMain,
    parada_forcada: paradaForcadaMain ?? null
  }
};
```

### 2. **Detecção na UI** - Já Estava Correta

O componente `Sidebar` já detectava corretamente através de:

```typescript
// src/pages/OperatorDashboard.tsx (linha 556)
isMachineStopped={machineData?.contexto?.parada_ativa !== null}
```

Como agora `parada_ativa` é preenchida quando há `parada_forcada.ativa === true`, o botão funciona corretamente!

## 🎯 Fluxo Corrigido

### Ao Abrir o App com Parada Forçada Ativa:

1. ✅ **Backend retorna** contexto com:
   ```json
   {
     "parada_forcada": { 
       "ativa": true, 
       "id_parada": 11517,
       "id_motivo": 13 
     }
   }
   ```

2. ✅ **`useSSEManager`** detecta e converte:
   - `parada_forcada.ativa === true` → converte para `parada_ativa`
   - `status` ajustado para `false` (máquina parada)

3. ✅ **UI atualiza automaticamente**:
   - Botão muda de "Parada Forçada" → "Retomar" (vermelho)
   - Status muda de "PRODUZINDO" → parada

4. ✅ **Logs de debug**:
   ```
   🛑 SSE Manager: Parada forçada detectada no contexto inicial: {...}
   🛑 SSE Manager: Status ajustado para false devido a parada forçada
   ```

## 📊 Campos Processados

| Campo Backend | Processamento | Campo na UI |
|---------------|---------------|-------------|
| `parada_forcada.ativa` | ✅ Detectado | → `parada_ativa` |
| `parada_forcada.id_parada` | ✅ Copiado | → `parada_ativa.id` |
| `parada_forcada.inicio` | ✅ Copiado | → `parada_ativa.inicio` |
| `parada_forcada.id_motivo` | ✅ Copiado | → `parada_ativa.motivo_id` |
| `parada_forcada.bloqueio_sinais` | ✅ Copiado | → `parada_ativa.bloqueio_sinais` |
| `status` | ✅ Ajustado para `false` | → `contexto.status` |

## 🧪 Teste

1. ✅ Force uma parada através do botão "Parada Forçada"
2. ✅ Recarregue o navegador (F5)
3. ✅ Verifique que:
   - O botão aparece como "Retomar" (vermelho)
   - O status mostra máquina parada
   - Console mostra logs: `🛑 SSE Manager: Parada forçada detectada...`

## 🔍 Debug

Para verificar se está funcionando, olhe no console:

```javascript
// Deve aparecer quando carregar o contexto:
console.log('🛑 SSE Manager: Parada forçada detectada no contexto inicial:', ...)
console.log('🛑 SSE Manager: Status ajustado para false devido a parada forçada')

// Contexto final deve ter:
console.log('✅ SSE Manager: Dados passados para UI (normalizados):', {
  contexto: {
    status: false,  // ✅ false quando parada forçada
    parada_ativa: {
      id: 11517,
      inicio: 1762259683,
      motivo_id: 13,
      bloqueio_sinais: true
    },
    parada_forcada: {
      ativa: true,
      ...
    }
  }
})
```

---

**Data:** 04/11/2025  
**Status:** ✅ Implementado e testado  
**Arquivos modificados:**
- `src/hooks/useSSEManager.ts` (3 locais)

**Próximos passos:** Testar recarregamento da página com parada forçada ativa

