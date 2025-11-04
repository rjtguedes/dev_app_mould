# 📊 Estrutura de Dados SSE - Produção Mapa

## 🎯 Visão Geral

Este documento descreve a estrutura **REAL** dos dados que o backend envia via SSE (Server-Sent Events) para o tablet IHM, especialmente o objeto `producao_mapa`.

## 📦 Estrutura Completa da Resposta

```typescript
{
  "success": true,
  "data": {
    // ==================== INFORMAÇÕES DA MÁQUINA ====================
    "id": 73,
    "nome": "Horizontal 21",
    "multipostos": false,
    "velocidade": 0,
    "maquina_pai": null,
    "id_empresa": 5,
    "status": true,                    // true = EM PRODUÇÃO, false = PARADA
    "last_updated": 1762218738,        // timestamp unix
    
    // ==================== TURNO ATIVO ====================
    "turnos": {
      "id": 26,
      "nome": "Intermediario",
      "hora_inicio": "17:18:00",
      "hora_fim": "02:20:00",
      "dias_semana": [1, 2, 3, 4, 5]   // Segunda a Sexta
    },
    
    // ==================== SESSÃO DO OPERADOR ====================
    "sessao_operador": {
      "id_sessao": 1626,
      "id_operador": 103,
      "nome_operador": "bypass",
      "turno": null,
      "inicio": 1762217252,            // timestamp unix de início
      
      // Contadores da sessão
      "sinais": 409,
      "rejeitos": 2,
      "sinais_validos": 407,
      
      // Tempos da sessão
      "tempo_decorrido_segundos": 1486,
      "tempo_paradas_segundos": 0,
      "tempo_valido_segundos": 1486
    },
    
    // ==================== PRODUÇÃO DO TURNO ====================
    "producao_turno": {
      "id_turno": 26,
      "id_producao_turno": 149351,
      "inicio": null,
      
      // Contadores do turno
      "sinais": 130,
      "rejeitos": 0,
      "sinais_validos": 130,
      
      // Tempos do turno
      "tempo_decorrido_segundos": 17591,
      "tempo_paradas_segundos": 4143,
      "tempo_paradas_nao_conta_oee": 0,
      "tempo_paradas_validas": 4143,
      "tempo_valido_segundos": 17591,
      
      // Indicadores OEE
      "qualidade": 1.0,
      "disponibilidade": 1.0,
      "oee": 1.0
    },
    
    // ==================== PRODUÇÃO MAPA (PRINCIPAL) ====================
    "producao_mapa": {
      // === IDs de Identificação ===
      "id_mapa": 34,
      "id_producao_talao_mapa": 34,
      "id_talao_estacao": 411,
      
      // === IDs de Produto/Matriz/Cor ===
      "id_produto": null,
      "id_cor": null,
      "id_matriz": null,
      
      // === Descrições Textuais ===
      "produto_referencia": "2140 FLOW (INT/EXT)",
      "cor_descricao": null,
      
      // === Quantidades e Contadores ===
      "quantidade_programada": 36,      // Quantidade total programada
      "qt_produzir": 36,                // Quantidade a produzir
      "saldo_a_produzir": 24,           // Quanto ainda falta produzir
      "sinais": 12,                     // Total de sinais (incluindo rejeitos)
      "rejeitos": 0,                    // Peças rejeitadas
      "sinais_validos": 12,             // Peças boas (sinais - rejeitos)
      
      // === Tempos ===
      "inicio": 1762217275,             // timestamp unix de início
      "tempo_produto": 69,              // Tempo de ciclo do produto (segundos)
      "tempo_estimado": 2484,           // Tempo estimado total (segundos)
      "tempo_decorrido_segundos": 1463,
      "tempo_paradas_segundos": 0,
      "tempo_paradas_nao_conta_oee": 0,
      "tempo_paradas_validas": 0,
      "tempo_valido_segundos": 1463,
      
      // === TALÕES/ESTAÇÕES (Array) ===
      "taloes": [
        {
          "id_talao": 411,
          "estacao_numero": 1,
          "quantidade": 36,
          "tempo_ciclo_segundos": 69,
          
          // Campos opcionais (para produção parcial/retomada)
          "quantidade_produzida": 12,    // Opcional
          "rejeitos": 0,                 // Opcional
          "saldo_pendente": 24,          // Opcional
          "concluida_total": false,      // Opcional
          "concluida_parcial": false,    // Opcional
          "pode_retomar": false,         // Opcional
          "iniciada": true,              // Opcional
          "inicio_unix": 1762217275,     // Opcional
          "fim_unix": null               // Opcional
        }
        // Pode haver mais talões/estações...
      ]
    },
    
    // ==================== PARADA ATIVA ====================
    "parada_ativa": {
      "id": 11171,
      "inicio": 1762218634,            // timestamp unix
      "motivo_id": null                // null = sem justificativa
    },
    
    // ==================== STATUS GERAL ====================
    "ativa": false                     // Máquina ativa ou não
  }
}
```

## 🔍 Detalhamento dos Campos Importantes

### 📌 `producao_mapa.taloes[]`

Este é um **array** que contém informações sobre cada talão/estação da produção. Cada item representa:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id_talao` | `number` | ID único do talão |
| `estacao_numero` | `number` | Número da estação física |
| `quantidade` | `number` | Quantidade programada para este talão |
| `tempo_ciclo_segundos` | `number` | Tempo de ciclo esperado (segundos) |

**Campos Opcionais** (para controle de produção parcial):

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `quantidade_produzida` | `number?` | Quantidade já produzida |
| `rejeitos` | `number?` | Quantidade de rejeitos |
| `saldo_pendente` | `number?` | Quanto ainda falta produzir |
| `concluida_total` | `boolean?` | Se produziu 100% da quantidade |
| `concluida_parcial` | `boolean?` | Se produziu menos que 100% |
| `pode_retomar` | `boolean?` | Se pode retomar a produção |
| `iniciada` | `boolean?` | Se a produção já foi iniciada |
| `inicio_unix` | `number?` | Timestamp de início |
| `fim_unix` | `number?` | Timestamp de conclusão |

### 📊 Diferença entre os Contextos

O backend retorna **3 contextos diferentes** de produção:

#### 1️⃣ **Sessão do Operador** (`sessao_operador`)
- Dados desde que o operador fez login
- **Acumula** produção de múltiplos talões/mapas
- **Reset** quando operador faz logout

#### 2️⃣ **Produção do Turno** (`producao_turno`)
- Dados do turno ativo
- **Acumula** produção de múltiplos operadores e talões
- **Reset** quando o turno termina

#### 3️⃣ **Produção do Mapa** (`producao_mapa`)
- Dados **específicos do talão ativo**
- **Reset** quando inicia novo talão
- Contém array `taloes[]` com detalhes de cada estação

## 🎯 Casos de Uso no Frontend

### ✅ Exibir Progresso da Produção Atual

```typescript
const { producao_mapa } = machineData;

if (producao_mapa) {
  const progresso = (producao_mapa.sinais_validos / producao_mapa.qt_produzir) * 100;
  const saldo = producao_mapa.saldo_a_produzir;
  const produto = producao_mapa.produto_referencia;
  
  console.log(`Produzindo: ${produto}`);
  console.log(`Progresso: ${progresso.toFixed(1)}%`);
  console.log(`Saldo: ${saldo} peças`);
}
```

### ✅ Exibir Informações de Cada Estação

```typescript
const { producao_mapa } = machineData;

if (producao_mapa?.taloes) {
  producao_mapa.taloes.forEach(talao => {
    console.log(`Estação ${talao.estacao_numero}:`);
    console.log(`  - Quantidade: ${talao.quantidade}`);
    console.log(`  - Tempo Ciclo: ${talao.tempo_ciclo_segundos}s`);
    
    if (talao.quantidade_produzida !== undefined) {
      console.log(`  - Produzido: ${talao.quantidade_produzida}`);
    }
    
    if (talao.concluida_parcial) {
      console.log(`  ⚠️ PARCIAL - Saldo: ${talao.saldo_pendente}`);
    }
    
    if (talao.concluida_total) {
      console.log(`  ✅ CONCLUÍDO`);
    }
  });
}
```

### ✅ Detectar Produção Parcial e Mostrar Opção de Retomada

```typescript
const { producao_mapa } = machineData;

if (producao_mapa?.taloes) {
  const taloesParciaisConcluidos = producao_mapa.taloes.filter(
    talao => talao.concluida_parcial && talao.pode_retomar
  );
  
  if (taloesParciaisConcluidos.length > 0) {
    console.log(`⚠️ ${taloesParciaisConcluidos.length} talões com produção parcial`);
    
    taloesParciaisConcluidos.forEach(talao => {
      // Mostrar botão "Retomar Produção"
      console.log(`Talão ${talao.id_talao} - Saldo: ${talao.saldo_pendente}`);
    });
  }
}
```

## 🔄 Cálculos Importantes

### Progresso Percentual
```typescript
const progresso = (sinais_validos / qt_produzir) * 100;
```

### Saldo Restante
```typescript
// ✅ Preferir usar o que vem do backend
const saldo = producao_mapa.saldo_a_produzir;

// ❌ Evitar calcular no frontend (pode desincronizar)
const saldoCalculado = qt_produzir - sinais_validos;
```

### Tempo Estimado de Conclusão
```typescript
const saldo = producao_mapa.saldo_a_produzir;
const tempoCiclo = producao_mapa.tempo_produto;
const tempoEstimadoSegundos = saldo * tempoCiclo;

// Converter para minutos
const tempoEstimadoMinutos = Math.ceil(tempoEstimadoSegundos / 60);
```

### Eficiência (Peças Boas vs Total)
```typescript
const eficiencia = (sinais_validos / sinais) * 100;
```

## ⚠️ Regras Importantes

### 1. **Sempre Usar Dados do Backend**
- ✅ Use `saldo_a_produzir` do backend
- ❌ **NÃO** calcule saldo no frontend

### 2. **Verificar Campos Opcionais**
```typescript
// ✅ Verificar se o campo existe
if (producao_mapa?.taloes) {
  // Processar talões
}

// ✅ Usar valores padrão
const sinais = producao_mapa?.sinais ?? 0;
```

### 3. **Contexto Ativo Determina Exibição**
```typescript
switch (contextoAtivo) {
  case 'sessao':
    // Mostrar dados de sessao_operador
    dadosExibicao = sessao_operador;
    break;
  case 'turno':
    // Mostrar dados de producao_turno
    dadosExibicao = producao_turno;
    break;
  case 'taloes':
    // Mostrar dados de producao_mapa
    dadosExibicao = producao_mapa;
    break;
}
```

## 📝 Atualizações Recentes

### ✅ Tipos TypeScript Atualizados

Os tipos foram atualizados em `src/types/websocket-new.ts`:

```typescript
// ✅ Interface TalaoProducao
export interface TalaoProducao {
  id_talao: number;
  estacao_numero: number;
  quantidade: number;
  tempo_ciclo_segundos: number;
  // Campos opcionais para controle parcial
  quantidade_produzida?: number;
  rejeitos?: number;
  saldo_pendente?: number;
  concluida_total?: boolean;
  concluida_parcial?: boolean;
  pode_retomar?: boolean;
  iniciada?: boolean;
  inicio_unix?: number | null;
  fim_unix?: number | null;
}

// ✅ Interface ProductionMap atualizada
export interface ProductionMap {
  id_mapa: number;
  id_producao_talao_mapa?: number;
  id_talao_estacao?: number;
  id_produto: number | null;
  id_cor: number | null;
  id_matriz: number | null;
  produto_referencia: string | null;
  cor_descricao: string | null;
  quantidade_programada: number;
  qt_produzir: number;
  saldo_a_produzir: number;
  sinais: number;
  rejeitos: number;
  sinais_validos: number;
  inicio: number;
  tempo_produto: number;
  tempo_estimado: number;
  tempo_decorrido_segundos: number;
  tempo_paradas_segundos: number;
  tempo_paradas_nao_conta_oee: number;
  tempo_paradas_validas: number;
  tempo_valido_segundos: number;
  taloes: TalaoProducao[];
  sessoes?: number[];
}
```

## 🎯 Próximos Passos

1. ✅ **Tipos TypeScript atualizados** - Refletem estrutura real do backend
2. ⏳ **Componentes de UI** - Adaptar para usar novos campos
3. ⏳ **Controle de Produção Parcial** - Implementar lógica de retomada
4. ⏳ **Exibição de Talões** - Mostrar detalhes de cada estação

---

**Última atualização:** 04/11/2025
**Status:** ✅ Tipos atualizados | ⏳ UI em adaptação

