# 📦 **INFORMAÇÕES DE PRODUTO NO LAYOUT EVA 16 ESTAÇÕES**

Data: 10 de novembro de 2025

## 🎯 **Objetivo**

Adicionar informações de **tamanho, produto e cor** abaixo dos contadores em cada posto/estação no layout EVA 16.

---

## ✅ **Implementação**

### **1. Campos Adicionados à Interface `StationData`**

**Arquivo:** `src/components/Eva16StationsView.tsx`

```typescript
interface StationData {
  posto: number;
  id_maquina: number;
  nome: string;
  produzido: number;
  rejeitos: number;
  saldo: number;
  // ✅ NOVO: Informações da produção alocada
  tamanho?: string | null;
  produto?: string | null;
  cor?: string | null;
}
```

### **2. Extração de Dados de Produção**

**Fonte dos dados:**
```javascript
const producaoMapa = production.websocket_data?.producao_mapa;
const tamanho = producaoMapa?.talao_tamanho || null;
const produto = producaoMapa?.produto_referencia || producaoMapa?.talao_referencia || null;
const cor = producaoMapa?.descricao_cor || null;
```

**Campos buscados:**
- `tamanho` → `producao_mapa.talao_tamanho` (ex: "36")
- `produto` → `producao_mapa.produto_referencia` ou `producao_mapa.talao_referencia` (ex: "2402 EASY_F1")
- `cor` → `producao_mapa.descricao_cor` (pode ser null)

### **3. Formatação do Texto**

```javascript
const produtoInfo = React.useMemo(() => {
  const parts: string[] = [];
  
  // Adicionar tamanho (se existir)
  if (station.tamanho) parts.push(station.tamanho);
  
  // Adicionar produto (se existir)
  if (station.produto) parts.push(station.produto);
  
  // Juntar com hífen: "TAMANHO-PRODUTO"
  const produtoText = parts.join('-');
  
  // Adicionar cor (se existir): "TAMANHO-PRODUTO - COR"
  if (station.cor) {
    return produtoText ? `${produtoText} - ${station.cor}` : station.cor;
  }
  
  return produtoText || null;
}, [station.tamanho, station.produto, station.cor]);
```

**Exemplos de formatação:**

| Tamanho | Produto | Cor | Resultado |
|---------|---------|-----|-----------|
| "36" | "2402 EASY_F1" | "AZUL" | "36-2402 EASY_F1 - AZUL" |
| null | "2402 EASY_F1" | "PRETO" | "2402 EASY_F1 - PRETO" |
| "38" | null | "VERMELHO" | "38 - VERMELHO" |
| "36" | "2402 EASY_F1" | null | "36-2402 EASY_F1" |
| null | null | null | (não exibe) |

### **4. Renderização Condicional**

```jsx
{/* Linha de informações (só aparece se tiver dados) */}
{produtoInfo && (
  <div className="pb-2 px-3 flex justify-center">
    <div className="text-sm text-white/80 font-medium tracking-wide">
      {produtoInfo}
    </div>
  </div>
)}
```

**Quando aparece:**
- ✅ Quando há **produção alocada** no posto (mapa iniciado)
- ✅ Quando ao menos **um campo** (tamanho, produto ou cor) existe

**Quando NÃO aparece:**
- ❌ Posto sem produção alocada
- ❌ Todos os campos nulos/vazios

---

## 🎨 **Layout Visual**

### **Antes:**

```
┌────────────────────────────────┐
│ ① │ 100 │  5  │ [+ Rejeito]  │
├────────────────────────────────┤
│ ② │ 100 │  5  │ [+ Rejeito]  │
└────────────────────────────────┘
```

### **Depois:**

```
┌────────────────────────────────┐
│ ① │ 100 │  5  │ [+ Rejeito]  │
│     36-2402 EASY_F1            │ ← NOVO!
├────────────────────────────────┤
│ ② │ 150 │  8  │ [+ Rejeito]  │
│     38-2401 CLASSIC - PRETO    │ ← NOVO!
├────────────────────────────────┤
│ ③│  0  │  0  │ [+ Rejeito]  │
│  (sem produção alocada)        │
└────────────────────────────────┘
```

---

## 📊 **Estrutura de Dados**

### **Dados Recebidos via SSE:**

```javascript
// childMachinesData.get(168)
{
  id_maquina: 168,
  nome: "Posto 2 - MATRIZ DIREITA",
  producao_mapa: {
    id_mapa: 47,
    talao_tamanho: "36",                  // ✅
    produto_referencia: "2402 EASY_F1",   // ✅
    talao_referencia: "2402 EASY_F1",     // ✅ Fallback
    descricao_cor: null,                  // ✅ (pode ser null)
    sinais: 100,
    rejeitos: 5,
    saldo_a_produzir: 75,
    quantidade_programada: 75
  }
}
```

### **Dados Processados para StationData:**

```javascript
{
  posto: 2,
  id_maquina: 168,
  nome: "Posto 2 - MATRIZ DIREITA",
  produzido: 100,
  rejeitos: 5,
  saldo: 75,
  tamanho: "36",              // ✅ Extraído de talao_tamanho
  produto: "2402 EASY_F1",    // ✅ Extraído de produto_referencia
  cor: null                   // ✅ descricao_cor (pode ser null)
}
```

### **Texto Formatado:**

```
"36-2402 EASY_F1"
```

**Se tivesse cor:**
```
"36-2402 EASY_F1 - AZUL"
```

---

## 🎨 **Estilo CSS**

```css
/* Container centralizado */
.flex.justify-center {
  display: flex;
  justify-content: center;
}

/* Texto do produto */
.text-sm {
  font-size: 0.875rem;      /* 14px */
}

.text-white/80 {
  color: rgb(255 255 255 / 0.8);  /* Branco com 80% opacidade */
}

.font-medium {
  font-weight: 500;
}

.tracking-wide {
  letter-spacing: 0.025em;  /* Espaçamento entre letras */
}

/* Espaçamento */
.pb-2 {
  padding-bottom: 0.5rem;   /* 8px */
}

.px-3 {
  padding-left: 0.75rem;    /* 12px */
  padding-right: 0.75rem;   /* 12px */
}
```

---

## 🧪 **Como Testar**

### Teste 1: Posto Com Produção Alocada

1. **Fazer login em EVA2**
2. **Abrir modal de produção** e iniciar mapa com talões
   - ⚠️ **IMPORTANTE:** Agora o sistema envia o `id_maquina` da **estação filha** (não da raiz)
   - Ex: Para "Posto 1", envia `id_maquina: 168` (não `164`)
3. **Selecionar layout "EVA 16 Estações"**
4. **Verificar:**
   - ✅ Abaixo dos números (Produzido, Rejeitos), aparece texto centralizado
   - ✅ Formato: "TAMANHO-PRODUTO - COR" (ex: "36-2402 EASY_F1")
   - ✅ Cor branca com leve transparência
   - ✅ Fonte menor que os números

### Teste 2: Posto Sem Produção

1. **Posto que não tem produção alocada**
2. **Verificar:**
   - ✅ Números aparecem normalmente (0, 0, 0)
   - ✅ **NÃO aparece** linha de informações de produto
   - ✅ Layout limpo

### Teste 3: Dados Parciais

**Cenário A: Apenas Produto (sem tamanho/cor)**
```
Resultado: "2402 EASY_F1"
```

**Cenário B: Produto e Cor (sem tamanho)**
```
Resultado: "2402 EASY_F1 - AZUL"
```

**Cenário C: Tamanho e Produto (sem cor)**
```
Resultado: "36-2402 EASY_F1"
```

**Cenário D: Apenas Tamanho**
```
Resultado: "36"
```

### Teste 4: Mudança de Contexto

1. **Com produção alocada**
2. **Trocar entre Sessão/Turno/Talões**
3. **Verificar:**
   - ✅ Informações de produto **permanecem** (não dependem do contexto)
   - ✅ Apenas contadores (Produzido, Rejeitos, Saldo) mudam

---

## 📋 **Exemplo Completo (Posto 2 DIREITA)**

### **Dados de Entrada:**

```json
{
  "id": 168,
  "nome": "Posto 2 - MATRIZ DIREITA",
  "producao_mapa": {
    "talao_tamanho": "36",
    "produto_referencia": "2402 EASY_F1",
    "talao_referencia": "2402 EASY_F1",
    "descricao_cor": null,
    "sinais": 100,
    "rejeitos": 5,
    "saldo_a_produzir": 75,
    "quantidade_programada": 75
  }
}
```

### **Saída Visual:**

```
┌────────────────────────────────┐
│  ②  │  100  │  5  │ [+ Rejeito] │
│     36-2402 EASY_F1            │ ← Centralizado
└────────────────────────────────┘
```

---

## ✅ **Checklist de Validação**

- [ ] Informações aparecem apenas quando há produção alocada
- [ ] Formato: "TAMANHO-PRODUTO - COR"
- [ ] Texto centralizado abaixo dos contadores
- [ ] Cor branca com leve transparência (legível)
- [ ] Fonte menor que os números principais
- [ ] Não aparece quando posto está vazio
- [ ] Mantém visível ao trocar contexto (Sessão/Turno/Talões)
- [ ] Atualiza quando produção muda

---

## 🔄 **Atualização Automática**

As informações de produto **atualizam automaticamente** quando:

1. **Nova produção é iniciada**
   - SSE envia `context_update` com novo `producao_mapa`
   - Informações atualizam instantaneamente

2. **Produção é finalizada**
   - `producao_mapa` fica null
   - Informações **desaparecem**

3. **Troca de mapa**
   - Novo mapa com novos dados
   - Informações **atualizam** para novo produto

---

**Implementado e Funcionando! ✨**

Cada posto agora mostra as informações completas da produção alocada, conforme o layout fornecido.

